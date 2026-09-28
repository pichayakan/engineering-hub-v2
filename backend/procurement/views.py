# backend/procurement/views.py
import os
import re
import pypdf
import time
from google import genai  # 🟢 ใช้ SDK ตัวใหม่ตัวเดียวเท่านั้น
from django.conf import settings
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
    ProcurementCategory,
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

    overdue_count = 0

    completed_this_month_count = ProcurementRequest.objects.filter(
        is_completed=True,
        is_cancelled=False,
    ).count()

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


class ProcurementCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing available procurement categories.
    """
    queryset = ProcurementCategory.objects.all()
    serializer_class = ProcurementCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class WorkflowTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing available workflow templates.
    """
    queryset = WorkflowTemplate.objects.filter(
        is_active=True,
        template_type=WorkflowTemplate.TemplateTypes.PROCUREMENT
    )
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProcurementRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProcurementRequestFilter
    search_fields = ['title', 'project__name',
                     'created_by__username', 'category__name', 'document_number', 'history__document_number']
    ordering_fields = ['created_at', 'title']

    def get_queryset(self):
        user = self.request.user
        queryset = ProcurementRequest.objects.all().order_by("-created_at")

        if user.is_superuser:
            return queryset

        if not user.department:
            return queryset.filter(created_by=user)

        user_dept_name = user.department.name
        CENTRAL_DEPT_NAME = "ส่วนวิศวกรรมและบริหารโครงข่าย (วขตป.)"

        if user_dept_name == CENTRAL_DEPT_NAME:
            return queryset

        return queryset.filter(requesting_department=user_dept_name)

    def get_serializer_class(self):
        if self.action == 'list':
            return ProcurementListSerializer
        return ProcurementRequestSerializer

    def perform_create(self, serializer):
        workflow = serializer.validated_data.get("workflow_template")
        first_step = workflow.steps.order_by("order").first()

        user_department_name = ""
        if self.request.user.department:
            user_department_name = self.request.user.department.name

        procurement_request = serializer.save(
            created_by=self.request.user,
            current_step=first_step,
            requesting_department=user_department_name
        )

        if first_step:
            for group in first_step.responsible_groups.all():
                for user_to_notify in group.user_set.all():
                    if user_to_notify != self.request.user:
                        Notification.objects.create(
                            recipient=user_to_notify,
                            message=f"New procurement task '{procurement_request.title}' has been created and is waiting for approval.",
                            link=f"/procurement/requests/{procurement_request.id}"
                        )

    @action(detail=True, methods=["post"], url_path="advance-step")
    def advance_step(self, request, pk=None):
        instance = self.get_object()
        user = request.user
        notes = request.data.get("notes", "")
        files = request.FILES.getlist("files")
        document_number_to_save = ""

        if instance.is_completed:
            return Response({"error": "This request is already completed."}, status=status.HTTP_400_BAD_REQUEST)

        current_step = instance.current_step
        if not current_step:
            return Response({"error": "This request has no current step defined."}, status=status.HTTP_400_BAD_REQUEST)

        responsible_pks = current_step.responsible_groups.values_list(
            'pk', flat=True)
        if (responsible_pks.exists() and not user.is_staff and not user.groups.filter(pk__in=responsible_pks).exists()):
            return Response({"error": "You do not have permission to approve this step."}, status=status.HTTP_403_FORBIDDEN)

        if current_step.requires_document_number:
            doc_number = request.data.get('document_number')
            if not doc_number or not doc_number.strip():
                return Response(
                    {'error': 'ขั้นตอนนี้จำเป็นต้องระบุเลขที่หนังสือ'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            document_number_to_save = doc_number.strip()

            instance.document_number = document_number_to_save
            instance.save()

        if current_step.is_signature_required:
            if not any(f.name.startswith('signed_') for f in files):
                return Response(
                    {"error": "ขั้นตอนนี้ต้องระบุเลขหนังสือด้วยครับ"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if current_step.requires_attachment:
            if not files:
                return Response(
                    {'error': 'ขั้นตอนนี้จำเป็นต้องแนบไฟล์ประกอบ'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        with transaction.atomic():
            history_entry = RequestHistory.objects.create(
                procurement_request=instance,
                step=current_step,
                approved_by=user,
                notes=notes,
                document_number=document_number_to_save
            )

            for file in files:
                ProcurementAttachment.objects.create(
                    procurement_request=instance,
                    history_entry=history_entry,
                    file=file,
                    uploaded_by=user,
                    name=file.name
                )

            if current_step.should_generate_pdf:
                try:
                    pdf_file = generate_procurement_pdf(instance, user)
                    ProcurementAttachment.objects.create(
                        procurement_request=instance,
                        history_entry=history_entry,
                        file=pdf_file,
                        uploaded_by=user,
                        name=pdf_file.name
                    )
                except Exception as e:
                    print(f"Error generating PDF: {e}")

            next_step = Step.objects.filter(
                workflow_template=instance.workflow_template, order__gt=current_step.order
            ).order_by("order").first()

            if next_step:
                instance.current_step = next_step

                for group in next_step.responsible_groups.all():
                    for user_to_notify in group.user_set.all():
                        Notification.objects.create(
                            recipient=user_to_notify,
                            message=f"มีงานใหม่ '{instance.title}' รอการอนุมัติจากคุณ",
                            link=f"/procurement/requests/{instance.id}"
                        )

                        requester_name = f"{instance.created_by.first_name} {instance.created_by.last_name}"
                        recipient_name = f"{user_to_notify.first_name} {user_to_notify.last_name}"
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
                        send_notifications(user_to_notify, line_message)
            else:
                instance.current_step = None
                instance.is_completed = True

                if instance.created_by != user:
                    Notification.objects.create(
                        recipient=instance.created_by,
                        message=f"งาน '{instance.title}' ได้รับการอนุมัติครบทุกขั้นตอนแล้ว",
                        link=f"/procurement/requests/{instance.id}"
                    )

            instance.save()

        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_request(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user

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

        original_name = signed_file.name
        base_name, ext = original_name.rsplit('.', 1)

        base_name = re.sub(r'^signed_', '', base_name)
        base_name = re.sub(r'_\d{4}-\d{2}-\d{2}T.*$', '', base_name)

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

        if not user.groups.filter(pk__in=procurement_request.current_step.responsible_groups.all()).exists() and not user.is_staff:
            return Response({'error': 'You do not have permission to perform this action.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            target_step = Step.objects.get(
                pk=target_step_id, workflow_template=procurement_request.workflow_template)
        except Step.DoesNotExist:
            return Response({'error': 'Invalid target step.'}, status=status.HTTP_400_BAD_REQUEST)

        RequestHistory.objects.create(
            procurement_request=procurement_request,
            step=procurement_request.current_step,
            approved_by=user,
            notes=notes,
            action='SENT_BACK'
        )

        procurement_request.current_step = target_step
        procurement_request.save()

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
        procurement_request = self.get_object()

        try:
            pdf_file = generate_procurement_pdf(
                procurement_request, request.user)
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{pdf_file.name}"'
            return response

        except Exception as e:
            print(f"PDF Generation Error: {e}")
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='summarize')
    def summarize_procurement_document(self, request, pk=None):
        instance = self.get_object()
        current_step = instance.current_step

        if not current_step or not current_step.allow_ai_summary:
            return Response(
                {"error": "ขั้นตอนนี้ไม่ได้รับอนุญาตให้ใช้งาน AI สรุปเอกสาร"},
                status=status.HTTP_400_BAD_REQUEST
            )

        attachment_id = request.data.get('attachment_id')
        target_attachment = None

        if attachment_id:
            target_attachment = instance.attachments.filter(
                id=attachment_id).first()

        if not target_attachment:
            target_attachment = instance.attachments.filter(
                file__icontains='.pdf'
            ).order_by('-uploaded_at').first()

        if not target_attachment:
            return Response(
                {"error": "ไม่พบไฟล์ PDF ในระบบสำหรับนำมาสรุปเนื้อหา"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 🟢 1. ดึง Gemini API Key พร้อมการตรวจสอบความถูกต้อง
            # 🟢 ดึง API Key
            gemini_key = getattr(settings, 'GEMINI_API_KEY',
                                 '') or os.getenv('GEMINI_API_KEY', '')

            # 🔍 เพิ่มบรรทัดนี้เพื่อเช็คใน Terminal บน Server
            print(
                f"DEBUG: Loaded GEMINI_API_KEY length = {len(gemini_key)}, prefix = {gemini_key[:5]}")

            if not gemini_key:
                return Response(
                    {"error": "ระบบไม่พบ GEMINI_API_KEY กรุณาตรวจสอบการตั้งค่าไฟล์ .env บน Server"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            client = genai.Client(api_key=gemini_key)

            pdf_path = target_attachment.file.path
            reader = pypdf.PdfReader(pdf_path)
            extracted_text = ""
            for page in reader.pages[:10]:
                extracted_text += page.extract_text() or ""

            uploaded_file = None

            base_prompt = f"""
            คุณเป็นผู้ช่วยวิเคราะห์เอกสารงานพิจารณาด้านต่างๆของ บมจ.โทรคมนาคมแห่งชาติ ของส่วนงานวิศวกรรมและบริหารโครงข่าย
            กรุณาสรุปข้อมูลสำคัญจากเอกสารชื่อ "{target_attachment.name}" (เน้นอ่านจากบันทึกข้อความสรุปหน้าแรก) ให้ผู้บริหารอ่านเข้าใจง่าย สั้นกระชับ ไม่เกิน 5 ข้อ:
            1. วัตถุประสงค์และเนื้องานหลัก
            2. วงเงินงบประมาณ (ถ้ามี)
            3. ระยะเวลาดำเนินการ/ส่งมอบ (ถ้ามี)
            4. เงื่อนไขหรือจุดสังเกตสำคัญ (ถ้ามี)
            5. ข้อเสนอแนะ/ข้อสังเกตุจาก AI
            """

            is_scanned_pdf = not extracted_text.strip()
            temp_pdf_path = None

            if is_scanned_pdf:
                print(
                    f"📄 Scanned PDF detected: {target_attachment.name}. Cutting top 5 pages...")
                import tempfile

                writer = pypdf.PdfWriter()
                for page in reader.pages[:5]:
                    writer.add_page(page)

                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                    writer.write(tmp_file.name)
                    temp_pdf_path = tmp_file.name

                try:
                    uploaded_file = client.files.upload(file=temp_pdf_path)
                finally:
                    if temp_pdf_path and os.path.exists(temp_pdf_path):
                        os.remove(temp_pdf_path)

                contents_payload = [uploaded_file, base_prompt]
            else:
                contents_payload = f"{base_prompt}\n\nเนื้อหาเอกสาร:\n{extracted_text[:4000]}"

            models_to_try = ['gemini-2.5-flash',
                             'gemini-1.5-flash',
                             'gemini-2.5-flash-lite',]
            response = None
            last_error = None

            for model_name in models_to_try:
                for attempt in range(2):
                    try:
                        print(
                            f"🤖 Requesting Gemini API using model: {model_name} (Attempt {attempt + 1})")
                        response = client.models.generate_content(
                            model=model_name,
                            contents=contents_payload,
                        )
                        if response:
                            break
                    except Exception as api_err:
                        last_error = api_err
                        err_str = str(api_err)

                        if "503" in err_str or "UNAVAILABLE" in err_str:
                            print(
                                f"⚠️ Gemini 503 High Demand on {model_name}. Retrying in 2 seconds...")
                            time.sleep(2)
                        else:
                            print(
                                f"⚠️ Model {model_name} error: {err_str}. Switching model...")
                            break
                if response:
                    break

            if not response:
                raise last_error or Exception(
                    "ไม่สามารถเชื่อมต่อ Gemini API ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง")

            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                usage = response.usage_metadata
                prompt_tokens = usage.prompt_token_count or 0
                candidate_tokens = usage.candidates_token_count or 0
                total_tokens = usage.total_token_count or 0

                cost_usd = ((prompt_tokens / 1_000_000) * 0.075) + \
                    ((candidate_tokens / 1_000_000) * 0.30)
                cost_thb = cost_usd * 35

                print(f"\n================ [AI Usage Report] ================")
                print(f"📄 File: {target_attachment.name}")
                print(f"📥 Input Tokens  : {prompt_tokens:,}")
                print(f"📤 Output Tokens : {candidate_tokens:,}")
                print(f"📊 Total Tokens  : {total_tokens:,}")
                print(
                    f"💵 Est. Cost     : ${cost_usd:.6f} USD (~{cost_thb:.4f} บาท)")
                print(f"===================================================\n")

            summary_text = f"📄 **สรุปจากไฟล์: {target_attachment.name}**\n\n"
            summary_text += response.text if hasattr(
                response, 'text') else str(response)

            instance.ai_summary = summary_text
            instance.ai_summary_generated_at = timezone.now()
            instance.save(
                update_fields=['ai_summary', 'ai_summary_generated_at'])

            if uploaded_file:
                try:
                    client.files.delete(name=uploaded_file.name)
                except Exception as cleanup_error:
                    print(
                        f"Warning: Failed to delete temp file: {cleanup_error}")

            serializer = self.get_serializer(instance)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"AI Summarize Error: {e}")
            return Response(
                {"error": f"เกิดข้อผิดพลาดในการประมวลผล AI: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def procurement_analytics_view(request):
    try:
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        template_id = request.query_params.get('template_id')

        if not year:
            year = timezone.now().year

        queryset = ProcurementRequest.objects.filter(
            created_at__year=year,
            is_cancelled=False
        )

        if month and month != 'all':
            queryset = queryset.filter(created_at__month=month)

        if template_id and template_id != 'all':
            queryset = queryset.filter(workflow_template_id=template_id)

        total_requests = queryset.count()
        completed_requests = queryset.filter(is_completed=True).count()

        success_rate = (completed_requests / total_requests *
                        100) if total_requests > 0 else 0

        total_budget = 0
        try:
            budget_agg = queryset.aggregate(Sum('budget_amount'))
            total_budget = budget_agg['budget_amount__sum'] or 0
        except Exception:
            total_budget = 0

        avg_cycle_time = 0

        monthly_stats = queryset.annotate(month=TruncMonth('created_at')).values('month').annotate(
            created_count=Count('id'),
            completed_count=Count('id', filter=Q(is_completed=True))
        ).order_by('month')

        step_chart_data = []

        if template_id and template_id != 'all':
            try:
                steps = Step.objects.filter(
                    workflow_template_id=template_id).order_by('order')

                for step in steps:
                    step_chart_data.append({
                        "name": step.name,
                        "avg_days": step.duration_days
                    })
            except Exception as e:
                step_chart_data = []

        top_users = queryset.values('created_by').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        formatted_user_stats = []
        for item in top_users:
            user_id = item['created_by']
            count = item['count']

            try:
                u = User.objects.get(pk=user_id)
                display_name = f"{u.first_name} {u.last_name}".strip()
                if not display_name:
                    display_name = u.username
            except User.DoesNotExist:
                display_name = f"Unknown ({user_id})"

            formatted_user_stats.append({
                "name": display_name,
                "count": count
            })

        dept_stats = queryset.values('requesting_department').annotate(
            count=Count('id')
        ).order_by('-count')

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
            'user_chart': formatted_user_stats
        }

        return Response(data)

    except Exception as e:
        print(f"Analytics View Error: {e}")
        return Response(
            {'error': f'Server Error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
