# backend/procurement/views.py
import os
import re
from django.db import transaction
from .utils import generate_signed_filename
from django.core.files.base import ContentFile
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from notifications.models import Notification
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from notifications.line_utils import send_line_push_message
from notifications.utils import send_notifications  # line & telegram
from .filters import ProcurementRequestFilter
from django.db.models import Count, Avg, Sum, F, ExpressionWrapper, fields, Q
from django.db.models.functions import TruncMonth, ExtractDay
from django.contrib.auth import get_user_model

from django.http import HttpResponse

from .utils import generate_procurement_pdf

from .models import (
    WorkflowTemplate,
    Step,
    ProcurementRequest,
    RequestHistory,
    ProcurementAttachment,
    ProcurementCategory,  # ✅ IMPORTED
)
from .serializers import (
    WorkflowTemplateSerializer,
    ProcurementRequestSerializer,
    ProcurementCategorySerializer,
    ProcurementListSerializer,
)

User = get_user_model()


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def procurement_summary_view(request):
    """
    API endpoint for procurement dashboard summary data.
    """
    user = request.user
    ongoing_qs = ProcurementRequest.objects.filter(
        is_completed=False, is_cancelled=False)
    ongoing_count = ongoing_qs.count()

    # Placeholder for overdue
    overdue_count = 0

    # Completed this month
    completed_this_month_count = ProcurementRequest.objects.filter(
        is_completed=True,
        is_cancelled=False,
        # updated_at__year=timezone.now().year, # This requires an updated_at field
        # updated_at__month=timezone.now().month
    ).count()

    # Pending your approval
    user_group_ids = user.groups.values_list('id', flat=True)
    pending_your_approval_count = ongoing_qs.filter(
        current_step__responsible_groups__id__in=user_group_ids
    ).distinct().count()

    data = {
        'ongoing_count': ongoing_count,
        'pending_your_approval_count': pending_your_approval_count,
        'overdue_count': overdue_count,
        'completed_this_month_count': completed_this_month_count,
    }
    return Response(data)


# --- ✅ ADDED THIS NEW VIEWSET ---
class ProcurementCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing available procurement categories.
    (Managed via Django Admin)
    """
    queryset = ProcurementCategory.objects.all()
    serializer_class = ProcurementCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class WorkflowTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing available workflow templates.
    (Managed via Django Admin)
    """

    queryset = WorkflowTemplate.objects.filter(
        is_active=True,
        template_type=WorkflowTemplate.TemplateTypes.PROCUREMENT
    )
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProcurementRequestViewSet(viewsets.ModelViewSet):
    # queryset = ProcurementRequest.objects.all().order_by("-created_at")
    # serializer_class = ProcurementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # Fields available for exact match filtering (e.g., ?category=1)
    # filterset_fields = ['category', 'is_completed',
    #                     'is_cancelled', 'project', 'requesting_department']

    filterset_class = ProcurementRequestFilter

    # Fields available for text searching (e.g., ?search=test)
    search_fields = ['title', 'project__name',
                     'created_by__username', 'category__name', 'document_number', 'history__document_number']

    # Fields available for ordering (e.g., ?ordering=title)
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        user = self.request.user
        queryset = ProcurementRequest.objects.all().order_by("-created_at")

        # 1. Superuser: เห็นหมด
        if user.is_superuser:
            return queryset

        # 2. เช็คแผนก (สำคัญ)
        if not user.department:
            # กรณี User ไม่มีแผนก -> ให้เห็นเฉพาะที่ตัวเองสร้าง
            return queryset.filter(created_by=user)

        user_dept_name = user.department.name
        CENTRAL_DEPT_NAME = "ส่วนวิศวกรรมและบริหารโครงข่าย (วขตป.)"

        # 3. ถ้าเป็น "วขตป." -> เห็นหมดทุกงาน
        if user_dept_name == CENTRAL_DEPT_NAME:
            return queryset

        # 4. ถ้าเป็นแผนกอื่น -> เห็นเฉพาะงานที่ "Requesting Department" ตรงกับแผนกตัวเอง
        # (ตัด Logic เรื่อง Group ออกไปเลย ตามที่คุณต้องการ)
        return queryset.filter(requesting_department=user_dept_name)

    def get_serializer_class(self):
        """
        เลือกใช้ Serializer ตาม action:
        - ถ้าเป็น 'list' (ดูรายการทั้งหมด) ให้ใช้ ProcurementListSerializer
        - ถ้าเป็น action อื่นๆ (เช่น 'retrieve', 'create') ให้ใช้ ProcurementRequestSerializer
        """
        if self.action == 'list':
            return ProcurementListSerializer
        return ProcurementRequestSerializer

    def perform_create(self, serializer):
        workflow = serializer.validated_data.get("workflow_template")
        first_step = workflow.steps.order_by("order").first()

        # --- ✅ เพิ่ม Logic ดึงชื่อแผนก ---
        user_department_name = ""
        if self.request.user.department:
            user_department_name = self.request.user.department.name

        procurement_request = serializer.save(
            created_by=self.request.user,
            current_step=first_step,
            requesting_department=user_department_name
        )

        # Now, create notifications for the first step
        if first_step:
            for group in first_step.responsible_groups.all():
                for user_to_notify in group.user_set.all():
                    # --- ✅ ADD THIS CHECK ---
                    # Only send a notification if the recipient is not the person who created the request
                    if user_to_notify != self.request.user:
                        Notification.objects.create(
                            recipient=user_to_notify,
                            message=f"New procurement task '{procurement_request.title}' has been created and is waiting for approval.",
                            link=f"/procurement/requests/{procurement_request.id}"
                        )

    @action(detail=True, methods=["post"], url_path="advance-step")
    def advance_step(self, request, pk=None):
        print("--- DATA RECEIVED FROM FRONTEND ---")  # ✨ เพิ่มบรรทัดนี้
        print(request.data)                        # ✨ และบรรทัดนี้
        print("---------------------------------")
        instance = self.get_object()  # เปลี่ยนชื่อตัวแปรให้สั้นลง
        user = request.user
        notes = request.data.get("notes", "")
        files = request.FILES.getlist("files")
        document_number_to_save = ""  # เตรียมตัวแ แปรไว้ก่อน

        if instance.is_completed:
            return Response({"error": "This request is already completed."}, status=status.HTTP_400_BAD_REQUEST)

        current_step = instance.current_step
        if not current_step:
            return Response({"error": "This request has no current step defined."}, status=status.HTTP_400_BAD_REQUEST)

        # --- Permission Check ---
        responsible_pks = current_step.responsible_groups.values_list(
            'pk', flat=True)
        if (responsible_pks.exists() and not user.is_staff and not user.groups.filter(pk__in=responsible_pks).exists()):
            return Response({"error": "You do not have permission to approve this step."}, status=status.HTTP_403_FORBIDDEN)

        # --- ✨ 2. เพิ่ม Logic ตรวจสอบเลขที่หนังสือ ---
        if current_step.requires_document_number:
            doc_number = request.data.get('document_number')
            if not doc_number or not doc_number.strip():
                return Response(
                    {'error': 'ขั้นตอนนี้จำเป็นต้องระบุเลขที่หนังสือ'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            document_number_to_save = doc_number.strip()

        # ✅ อัปเดตเลขที่หนังสือลงในตัวงานหลักด้วย เพื่อให้ดึงไปใช้ใน PDF ได้ทันที
            instance.document_number = document_number_to_save
            instance.save()

        # --- Signature Check ---
        if current_step.is_signature_required:
            if not any(f.name.startswith('signed_') for f in files):
                return Response(
                    {"error": "ขั้นตอนนี้ต้องระบุเลขหนังสือด้วยครับ"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ✅ --- เพิ่ม Logic ตรวจสอบการแนบไฟล์ ---
        if current_step.requires_attachment:
            if not files:  # ตรวจสอบว่ามีไฟล์แนบมาหรือไม่
                return Response(
                    {'error': 'ขั้นตอนนี้จำเป็นต้องแนบไฟล์ประกอบ'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ✨ 1. ใช้ transaction.atomic เพื่อให้แน่ใจว่าทุกอย่างสำเร็จพร้อมกัน
        with transaction.atomic():
            # ✨ 3. บันทึกเลขที่หนังสือลงใน History
            history_entry = RequestHistory.objects.create(
                procurement_request=instance,
                step=current_step,
                approved_by=user,
                notes=notes,
                document_number=document_number_to_save  # เพิ่ม field นี้
            )

            for file in files:
                ProcurementAttachment.objects.create(
                    procurement_request=instance,
                    history_entry=history_entry,
                    file=file,
                    uploaded_by=user,
                    name=file.name
                )

            # --- ✅ 3. แทรกส่วนสร้าง PDF อัตโนมัติ ตรงนี้! ---
            if current_step.should_generate_pdf:
                try:
                    # สร้างไฟล์ PDF ใน Memory
                    pdf_file = generate_procurement_pdf(instance, user)

                    # บันทึกลง Database ผูกกับ History นี้
                    ProcurementAttachment.objects.create(
                        procurement_request=instance,
                        history_entry=history_entry,
                        file=pdf_file,
                        uploaded_by=user,
                        name=pdf_file.name
                    )
                    print(f"Auto-generated PDF: {pdf_file.name}")
                except Exception as e:
                    # Log error แต่ไม่ให้ระบบล่ม (หรือจะ raise e เพื่อ rollback ก็ได้)
                    print(f"Error generating PDF: {e}")
            # ------------------------------------------------

            next_step = Step.objects.filter(
                workflow_template=instance.workflow_template, order__gt=current_step.order
            ).order_by("order").first()

            if next_step:
                instance.current_step = next_step

                # แจ้งเตือนผู้รับผิดชอบใน Step ถัดไป
                for group in next_step.responsible_groups.all():
                    for user_to_notify in group.user_set.all():
                        Notification.objects.create(
                            recipient=user_to_notify,
                            message=f"มีงานใหม่ '{instance.title}' รอการอนุมัติจากคุณ",
                            link=f"/procurement/requests/{instance.id}"
                        )

                        # ✨ 4. ย้าย Logic การแจ้งเตือน Line เข้ามาใน Loop
                        requester_name = f"{instance.created_by.first_name} {instance.created_by.last_name}"
                        recipient_name = f"{user_to_notify.first_name} {user_to_notify.last_name}"
                        # 👈 ควรเปลี่ยนเป็น Domain จริง
                        link_to_task = f"http://202.139.196.7/procurement/requests/{instance.id}"

                        line_message = (
                            f"เรียน คุณ {recipient_name},\n\n"
                            f"มีงานใหม่รอการอนุมัติจากท่าน\n"
                            f"เรื่อง: {instance.title}\n"
                            f"สร้างโดย: {requester_name}\n"
                            f"ขั้นตอนปัจจุบัน: {next_step.name}\n\n"
                            f"กรุณาตรวจสอบและดำเนินการที่: \n\n"
                            f"{link_to_task}"
                        )
                        # ยกเลิก comment เพื่อใช้งานจริง
                        send_notifications(user_to_notify, line_message)
            else:
                # ถ้าไม่มี Step ถัดไป ให้ปิดงาน
                instance.current_step = None
                instance.is_completed = True

                # แจ้งเตือนผู้สร้างงานว่างานเสร็จแล้ว
                if instance.created_by != user:
                    Notification.objects.create(
                        recipient=instance.created_by,
                        message=f"งาน '{instance.title}' ได้รับการอนุมัติครบทุกขั้นตอนแล้ว",
                        link=f"/procurement/requests/{instance.id}"
                    )

            instance.save()  # บันทึกการเปลี่ยนแปลงทั้งหมด

        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_request(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user

        # --- Permission Check ---
        # 1. Only the user who created the request can cancel it.
        # 2. A request cannot be cancelled if it's already completed or cancelled.
        if procurement_request.created_by != user:
            return Response({'error': 'You do not have permission to cancel this request.'}, status=status.HTTP_403_FORBIDDEN)

        if procurement_request.is_completed or procurement_request.is_cancelled:
            return Response({'error': 'This request cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        procurement_request.is_cancelled = True
        procurement_request.save()

        return Response(self.get_serializer(procurement_request).data)

    @action(detail=True, methods=['post'], url_path='upload-signed-pdf')
    def upload_signed_pdf(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user
        signed_file = request.FILES.get('signed_pdf')

        if not signed_file:
            return Response(
                {'error': 'No signed PDF file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        latest_history = procurement_request.history.order_by(
            '-timestamp').first()
        if not latest_history:
            return Response(
                {'error': 'Cannot attach file, no approval history found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ sanitize original filename
        original_name = signed_file.name
        base_name, ext = original_name.rsplit('.', 1)

        # ลบ prefix signed_ และ timestamp เก่าออก
        # ตัด signed_ ด้านหน้า
        base_name = re.sub(r'^signed_', '', base_name)
        base_name = re.sub(r'_\d{4}-\d{2}-\d{2}T.*$', '',
                           base_name)  # ตัด timestamp ถ้ามี

        # ✅ ใช้ timestamp ใหม่เสมอ
        timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        new_filename = f"signed_{base_name}_{timestamp}.pdf"

        ProcurementAttachment.objects.create(
            procurement_request=procurement_request,
            history_entry=latest_history,
            file=signed_file,
            uploaded_by=user,
            name=new_filename
        )

        serializer = self.get_serializer(procurement_request)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='send-back')
    def send_back_step(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user
        target_step_id = request.data.get('target_step_id')
        notes = request.data.get('notes')

        if not target_step_id or not notes:
            return Response(
                {'error': 'Target step and notes are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Basic permission check
        if not user.groups.filter(pk__in=procurement_request.current_step.responsible_groups.all()).exists() and not user.is_staff:
            return Response({'error': 'You do not have permission to perform this action.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_step = Step.objects.get(
                pk=target_step_id, workflow_template=procurement_request.workflow_template)
        except Step.DoesNotExist:
            return Response({'error': 'Invalid target step.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create a "Sent Back" history record
        RequestHistory.objects.create(
            procurement_request=procurement_request,
            step=procurement_request.current_step,
            approved_by=user,
            notes=notes,
            action='SENT_BACK'
        )

        # Update the request to the target step
        procurement_request.current_step = target_step
        procurement_request.save()

        # Notify the responsible users of the target step
        for group in target_step.responsible_groups.all():
            for user_to_notify in group.user_set.all():
                Notification.objects.create(
                    recipient=user_to_notify,
                    message=f"Task '{procurement_request.title}' has been sent back to your step for revision.",
                    link=f"/procurement/requests/{procurement_request.id}"
                )

        return Response(self.get_serializer(procurement_request).data)

    @action(detail=True, methods=['get'], url_path='test-generate-pdf')
    def test_generate_pdf(self, request, pk=None):
        """
        Action สำหรับทดสอบสร้าง PDF และดาวน์โหลดทันที
        """
        procurement_request = self.get_object()

        try:
            # 1. เรียกใช้ฟังก์ชันสร้าง PDF (จาก utils.py)
            pdf_file = generate_procurement_pdf(
                procurement_request, request.user)

            # 2. ส่งไฟล์กลับไปให้ Browser (เป็น Attachment)
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{pdf_file.name}"'
            return response

        except Exception as e:
            print(f"PDF Generation Error: {e}")
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def procurement_analytics_view(request):
    try:
        # 1. รับค่า Query Params
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        template_id = request.query_params.get('template_id')

        # ถ้าไม่ส่งปีมา ให้ใช้ปีปัจจุบัน
        if not year:
            year = timezone.now().year

        # 2. Base Queryset: กรองตามปี และ ตัดงานที่ยกเลิกออก
        queryset = ProcurementRequest.objects.filter(
            created_at__year=year,
            is_cancelled=False
        )

        # 3. กรองตามเดือน (ถ้ามี และไม่ใช่ 'all')
        if month and month != 'all':
            queryset = queryset.filter(created_at__month=month)

        # 4. กรองตาม Template (ถ้ามีการเลือก และไม่ใช่ 'all')
        if template_id and template_id != 'all':
            queryset = queryset.filter(workflow_template_id=template_id)

        # ---------------------------------------------------------
        # ส่วนที่ 1: KPIs (Key Performance Indicators)
        # ---------------------------------------------------------
        total_requests = queryset.count()
        completed_requests = queryset.filter(is_completed=True).count()

        # ป้องกันการหารด้วยศูนย์
        success_rate = (completed_requests / total_requests *
                        100) if total_requests > 0 else 0

        # คำนวณงบประมาณรวม (Total Budget)
        total_budget = 0
        try:
            budget_agg = queryset.aggregate(Sum('budget_amount'))
            total_budget = budget_agg['budget_amount__sum'] or 0
        except Exception:
            total_budget = 0

        # Avg Cycle Time (Placeholder)
        avg_cycle_time = 0

        # ---------------------------------------------------------
        # ส่วนที่ 2: Monthly Stats (กราฟปริมาณงานรายเดือน)
        # ---------------------------------------------------------
        monthly_stats = queryset.annotate(month=TruncMonth('created_at')).values('month').annotate(
            created_count=Count('id'),
            completed_count=Count('id', filter=Q(is_completed=True))
        ).order_by('month')

        # ---------------------------------------------------------
        # ส่วนที่ 3: Step Analysis (วิเคราะห์เวลาแต่ละขั้นตอน)
        # ---------------------------------------------------------
        step_chart_data = []

        # จะแสดงกราฟ Step ก็ต่อเมื่อเลือก Template เจาะจงเท่านั้น
        if template_id and template_id != 'all':
            try:
                # ดึง Step จริงๆ ของ Template นั้นมาเรียงตามลำดับ
                steps = Step.objects.filter(
                    workflow_template_id=template_id).order_by('order')

                for step in steps:
                    step_chart_data.append({
                        "name": step.name,
                        # (ใช้ค่า Standard Duration)
                        "avg_days": step.duration_days
                    })
            except Exception as e:
                step_chart_data = []

        # ---------------------------------------------------------
        # ส่วนที่ 4: User Stats (Top Requesters) - ✅ แก้ไข Logic ใหม่
        # ---------------------------------------------------------
        # Group ตาม created_by (User ID) เพื่อความแม่นยำ
        top_users = queryset.values('created_by').annotate(
            count=Count('id')
        ).order_by('-count')[:10]  # เอา 10 อันดับแรก

        formatted_user_stats = []
        for item in top_users:
            user_id = item['created_by']
            count = item['count']

            try:
                # ดึงชื่อจาก User Model
                u = User.objects.get(pk=user_id)
                display_name = f"{u.first_name} {u.last_name}".strip()
                if not display_name:
                    display_name = u.username  # ถ้าไม่มีชื่อจริง ให้ใช้ username
            except User.DoesNotExist:
                display_name = f"Unknown ({user_id})"

            formatted_user_stats.append({
                "name": display_name,
                "count": count
            })

        # ---------------------------------------------------------
        # ส่วนที่ 5: Department Stats (สัดส่วนงานตามแผนก)
        # ---------------------------------------------------------
        dept_stats = queryset.values('requesting_department').annotate(
            count=Count('id')
        ).order_by('-count')

        # ---------------------------------------------------------
        # สร้าง Response Data
        # ---------------------------------------------------------
        data = {
            'kpi': {
                'total': total_requests,
                'completed': completed_requests,
                'rate': round(success_rate, 1),
                'budget': total_budget,
                'avg_cycle_time': avg_cycle_time
            },
            'monthly_chart': monthly_stats,
            'step_chart': step_chart_data,
            'dept_chart': dept_stats,
            'user_chart': formatted_user_stats  # ✅ ส่งข้อมูลที่แก้แล้วกลับไป
        }

        return Response(data)

    except Exception as e:
        print(f"Analytics View Error: {e}")
        return Response(
            {'error': f'Server Error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
