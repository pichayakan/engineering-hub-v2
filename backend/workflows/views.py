# workflows/views.py
from django.db.models import Count
from datetime import date
from django.utils import timezone  # ✅ IMPORT
from datetime import date, timedelta  # ✅ IMPORT
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from dateutil.relativedelta import relativedelta
from collections import defaultdict
from rest_framework import viewsets, permissions, mixins, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import ProjectWorkflow, StepStatus, StepAttachment, WorkflowCategory
from .serializers import (
    ProjectWorkflowListSerializer,
    ProjectWorkflowDetailSerializer,
    ProjectWorkflowCreateSerializer,  # ✅ IMPORT THE NEW SERIALIZER
    StepStatusSerializer,
    ProjectWorkflowUpdateSerializer,
    WorkflowCategorySerializer
)
from procurement.models import WorkflowTemplate
from procurement.serializers import WorkflowTemplateSerializer
import datetime
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProjectWorkflowViewSet(viewsets.ModelViewSet):
    queryset = ProjectWorkflow.objects.all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated]

    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['fiscal_year', 'category']

    # --- ✅ MODIFY THIS METHOD ---
    def get_serializer_class(self):
        if self.action == 'list':
            return ProjectWorkflowListSerializer
        if self.action == 'create':  # Add this condition
            return ProjectWorkflowCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ProjectWorkflowUpdateSerializer
        # This remains the default for retrieve, update, etc.
        return ProjectWorkflowDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """
        Override 'update' (PUT/PATCH) to return the full Detail Serializer.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # ใช้ Serializer "Update" (ก้อนเล็ก) เพื่อ Validate ข้อมูลที่เข้ามา
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been used, we need to clear it
            instance._prefetched_objects_cache = {}

        # แต่ตอนส่งข้อมูลกลับ ให้ใช้ Serializer "Detail" (ก้อนใหญ่)
        detail_serializer = ProjectWorkflowDetailSerializer(instance)
        return Response(detail_serializer.data)


class WorkflowCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for workflow categories.
    """
    queryset = WorkflowCategory.objects.all()
    serializer_class = WorkflowCategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class StepStatusViewSet(mixins.RetrieveModelMixin,
                        mixins.UpdateModelMixin,
                        viewsets.GenericViewSet):
    queryset = StepStatus.objects.all()
    serializer_class = StepStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=True, methods=['post'], url_path='set-duration')
    def set_duration_override(self, request, pk=None):
        step_status = self.get_object()
        new_duration_str = request.data.get('duration')

        if new_duration_str is None:
            return Response({'error': 'duration is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # อนุญาตให้ส่งค่าว่างเพื่อ "ล้าง" override ได้
            if new_duration_str == "" or new_duration_str is None:
                step_status.duration_override = None
            else:
                step_status.duration_override = int(new_duration_str)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid duration, must be an integer.'}, status=status.HTTP_400_BAD_REQUEST)

        step_status.save()

        # สั่งคำนวณ Due Date ใหม่ทั้งหมดทั้งเส้น
        step_status.workflow.recalculate_due_dates()

        # ส่งข้อมูล workflow ทั้งหมดกลับไปให้ Frontend อัปเดต
        serializer = ProjectWorkflowDetailSerializer(step_status.workflow)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        step_status = self.get_object()
        user = request.user

        # --- (Permission check logic remains the same) ---
        responsible_groups = step_status.step.responsible_groups.all()
        if responsible_groups.exists():
            if not user.is_staff and not user.groups.filter(pk__in=responsible_groups.values_list('pk', flat=True)).exists():
                return Response(
                    {'error': 'You do not have permission to update this step.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # --- ✅ RESTRUCTURED UPDATE LOGIC ---

        # 1. Get new data from the request
        new_status = request.data.get('status', step_status.status)
        new_notes = request.data.get('notes', step_status.notes)
        new_actual_date = request.data.get(
            'actual_completed_date', step_status.actual_completed_date)

        # 2. Update status and related fields
        if new_status != step_status.status:
            step_status.status = new_status
            if new_status == 'COMPLETED':
                step_status.completed_by = user
                step_status.completed_at = datetime.datetime.now()
            else:  # Reset completion data if status is changed FROM completed
                step_status.completed_by = None
                step_status.completed_at = None
                step_status.actual_completed_date = None

        # 3. Always allow updating notes and actual_completed_date
        step_status.notes = new_notes

        # Only update the actual_completed_date if the status is COMPLETED
        if new_status == 'COMPLETED':
            step_status.actual_completed_date = new_actual_date

        # 4. Save the object
        step_status.save()

        # --- (File handling logic remains the same) ---
        files = request.FILES.getlist("files")
        for file in files:
            StepAttachment.objects.create(
                step_status=step_status,
                file=file,
                uploaded_by=user,
                name=file.name,
            )

        # หลังจากบันทึก StepStatus แล้ว ให้ตรวจสอบสถานะของ Workflow หลัก
        workflow = step_status.workflow
        # total_steps = workflow.step_statuses.count()
        # completed_steps = workflow.step_statuses.filter(
        #     status='COMPLETED').count()

        # # นับจำนวน Step ทั้งหมด และ Step ที่เสร็จแล้ว
        # total_steps = workflow.step_statuses.count()
        # completed_steps = workflow.step_statuses.filter(
        #     status='COMPLETED').count()

        # if total_steps > 0 and total_steps == completed_steps:
        #     workflow.is_completed = True
        #     # ✅ 2. บันทึกวันที่โปรเจกต์เสร็จสิ้น
        #     workflow.completed_at = timezone.now()
        # else:
        #     workflow.is_completed = False
        #     # ✅ 3. ล้างค่าวันที่ ถ้าโปรเจกต์ถูกเปลี่ยนกลับเป็นไม่เสร็จ
        #     workflow.completed_at = None

        # workflow.save()
        # # --- ✅ END: ADD THIS LOGIC ---

        # --- ✅ NEW COMPLETION LOGIC ---
        # 1.
        last_step_in_template = workflow.template.steps.order_by(
            '-order').first()

        if last_step_in_template:
            try:
                final_step_status = workflow.step_statuses.get(
                    step=last_step_in_template)

                if final_step_status.status == 'COMPLETED':
                    workflow.is_completed = True

                    # ====================================================
                    # ✅ แก้ไข Logic ตรงนี้: เช็ค Actual Date ก่อน
                    # ====================================================
                    if final_step_status.actual_completed_date:
                        # ถ้ามี Actual Date ให้ใช้ค่านั้น (ต้องแปลง Date -> DateTime)
                        # ใช้เวลา 23:59:59 ของวันนั้น หรือ 00:00:00 ก็ได้
                        workflow.completed_at = timezone.datetime.combine(
                            final_step_status.actual_completed_date,
                            datetime.time.min,  # หรือ .max ถ้าอยากให้เป็นท้ายวัน
                            tzinfo=timezone.get_current_timezone()
                        )
                    else:
                        # ถ้าไม่มี ให้ใช้วันเวลาปัจจุบัน
                        workflow.completed_at = timezone.now()
                    # ====================================================

                else:
                    workflow.is_completed = False
                    workflow.completed_at = None
            except StepStatus.DoesNotExist:
                workflow.is_completed = False
                workflow.completed_at = None

        workflow.save()
        # --- ✅ END NEW LOGIC ---

        serializer = self.get_serializer(step_status)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def workflow_status_breakdown(request):
    """
    Provides data for the status breakdown donut chart.
    Counts active workflows based on their SLA status.
    """
    # ✅ 1. รับค่า fiscal_year จาก request
    fiscal_year = request.query_params.get('fiscal_year', None)

    today = date.today()
    seven_days_from_now = today + timedelta(days=7)

    active_workflows = ProjectWorkflow.objects.filter(is_completed=False)

    # ✅ 2. กรองข้อมูลด้วย fiscal_year ถ้ามี
    if fiscal_year:
        active_workflows = active_workflows.filter(fiscal_year=fiscal_year)

    # Overdue workflows
    overdue_pks = StepStatus.objects.filter(
        workflow__in=active_workflows,
        status__in=['PENDING', 'IN_PROGRESS'],
        due_date__isnull=False,
        due_date__lt=today
    ).values_list('workflow__pk', flat=True).distinct()
    overdue_count = len(overdue_pks)

    # Nearing SLA workflows (excluding those already overdue)
    nearing_sla_pks = StepStatus.objects.filter(
        workflow__in=active_workflows,
        status__in=['PENDING', 'IN_PROGRESS'],
        due_date__isnull=False,
        due_date__gte=today,
        due_date__lte=seven_days_from_now
    ).values_list('workflow__pk', flat=True).distinct()
    nearing_sla_count = len(set(nearing_sla_pks) - set(overdue_pks))

    # In Progress (On Time)
    total_active_count = active_workflows.count()
    on_time_count = total_active_count - overdue_count - nearing_sla_count

    data = {
        'on_time': on_time_count,
        'nearing_sla': nearing_sla_count,
        'overdue': overdue_count,
    }
    return Response(data)


# backend/workflows/views.py

# ... imports อื่นๆ ...


# backend/workflows/views.py

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def workflow_performance_trend(request):
    fiscal_year = request.query_params.get('fiscal_year', None)
    labels = []

    # Base Query
    # ✅ เปลี่ยน 1: ใช้ start_date แทน created_at สำหรับข้อมูล "งานใหม่"
    # ต้องกรองเฉพาะที่มี start_date ด้วย เพื่อกัน error
    created_data_query = ProjectWorkflow.objects.filter(
        start_date__isnull=False)

    # ส่วน Completed ใช้ completed_at เหมือนเดิม (เพราะเราอยากรู้วันที่เสร็จจริง)
    completed_data_query = ProjectWorkflow.objects.filter(
        is_completed=True,
        completed_at__isnull=False
    )

    if fiscal_year and str(fiscal_year).isdigit():
        year = int(fiscal_year)

        # -------------------------------------------------------
        # ✅ 1. เส้น Created: กรองเฉพาะงานที่เป็นงบของปีนั้นจริงๆ
        # -------------------------------------------------------
        created_data_query = created_data_query.filter(fiscal_year=year)

        # -------------------------------------------------------
        # ✅ 2. เส้น Completed: กรองงานที่ "เสร็จในช่วงปีงบนั้น" (ไม่สน fiscal_year ของงาน)
        # -------------------------------------------------------
        # ช่วงเวลาของปีงบนี้คือ: 1 ต.ค. ปีก่อน - 30 ก.ย. ปีปัจจุบัน
        fy_start_date = timezone.datetime(
            year - 1, 10, 1, tzinfo=timezone.get_current_timezone())
        fy_end_date = timezone.datetime(
            year, 9, 30, 23, 59, 59, tzinfo=timezone.get_current_timezone())

        completed_data_query = completed_data_query.filter(
            completed_at__range=(fy_start_date, fy_end_date)
        )

        # สร้างแกน X
        start_date_axis = fy_start_date.date()
        for i in range(12):
            current_month = start_date_axis + relativedelta(months=i)
            labels.append(current_month.strftime('%b %Y'))

    else:
        # กำหนดช่วงเวลา 6 เดือนย้อนหลัง (นับจากวันปัจจุบัน)
        today = date.today()
        start_of_period = today.replace(
            day=1) - relativedelta(months=5)  # 5 เดือนก่อน + เดือนนี้ = 6

        # A. เส้น Created: ✅ แก้ไขให้ใช้ start_date (เหมือน Fiscal Year)
        # ดูว่ามีงานไหน "เริ่ม" ในช่วง 6 เดือนนี้บ้าง
        created_data_query = created_data_query.filter(
            start_date__gte=start_of_period
        )

        # B. เส้น Completed: ดูว่ามีงานไหน "เสร็จ" ในช่วง 6 เดือนนี้บ้าง
        completed_data_query = completed_data_query.filter(
            completed_at__gte=start_of_period
        )

        # C. สร้างแกน X (เดือนเริ่มต้น - เดือนปัจจุบัน)
        for i in range(6):
            labels.append(
                (start_of_period + relativedelta(months=i)).strftime('%b %Y'))

    # --- Query Aggregate ---

    # ✅ เปลี่ยน 3: Group by 'start_date' แทน 'created_at'
    created_data = created_data_query.annotate(month=TruncMonth('start_date')).values(
        'month').annotate(count=Count('id')).order_by('month')

    # ส่วน Completed Group by 'completed_at' เหมือนเดิม (ถูกแล้ว)
    completed_data = completed_data_query.annotate(month=TruncMonth(
        'completed_at')).values('month').annotate(count=Count('id')).order_by('month')

    # Map ข้อมูลลงกราฟ
    created_counts = {item['month'].strftime(
        '%b %Y'): item['count'] for item in created_data}
    completed_counts = {item['month'].strftime(
        '%b %Y'): item['count'] for item in completed_data}

    final_created = [created_counts.get(label, 0) for label in labels]
    final_completed = [completed_counts.get(label, 0) for label in labels]

    return Response({
        'labels': labels,
        'created_data': final_created,
        'completed_data': final_completed,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def workflow_template_list_view(request):
    """
    API นี้จะดึงเฉพาะ Template ที่ถูกกำหนดค่าเป็น 'WORKFLOW' เท่านั้น
    """
    templates = WorkflowTemplate.objects.filter(
        is_active=True,
        template_type=WorkflowTemplate.TemplateTypes.WORKFLOW
    ).order_by('name')

    serializer = WorkflowTemplateSerializer(templates, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def workflow_summary_view(request):
    """
    Provides summary data for the workflow dashboard KPI cards.
    """
    fiscal_year = request.query_params.get('fiscal_year', None)

    # Start with a base queryset for workflows
    workflow_queryset = ProjectWorkflow.objects.all()
    # Apply filter if a year is provided
    if fiscal_year:
        workflow_queryset = workflow_queryset.filter(fiscal_year=fiscal_year)

    today = date.today()
    seven_days_from_now = today + timedelta(days=7)

    # --- Calculation for Overdue Workflows ---
    # Find the primary keys of all workflows that have at least one overdue step.
    overdue_workflows_pks = StepStatus.objects.filter(
        workflow__is_completed=False,      # Only active workflows
        status__in=['PENDING', 'IN_PROGRESS'],  # Only active steps
        due_date__isnull=False,            # The step must have a due date
        due_date__lt=today                 # The due date must be in the past
    ).values_list('workflow__pk', flat=True).distinct()

    overdue_count = len(overdue_workflows_pks)

    # --- Calculation for Nearing SLA Workflows ---
    # Find workflows with steps due in the next 7 days.
    nearing_sla_workflows_pks = StepStatus.objects.filter(
        workflow__is_completed=False,
        status__in=['PENDING', 'IN_PROGRESS'],
        due_date__isnull=False,
        due_date__gte=today,                     # Due date is today or in the future
        due_date__lte=seven_days_from_now      # And is within the next 7 days
    ).values_list('workflow__pk', flat=True).distinct()

    # Exclude any workflows that are already counted as overdue.
    nearing_sla_count = nearing_sla_workflows_pks.exclude(
        pk__in=overdue_workflows_pks).count()

    # --- Other Simple Counts ---
    in_progress_count = workflow_queryset.filter(is_completed=False).count()
    completed_this_month_count = workflow_queryset.filter(
        is_completed=True).count()  # Simplified for now

    # Find overdue steps ONLY within the filtered workflows
    overdue_workflows_pks = StepStatus.objects.filter(
        workflow__in=workflow_queryset.filter(
            is_completed=False),  # Use filtered queryset
        status__in=['PENDING', 'IN_PROGRESS'],
        due_date__isnull=False,
        due_date__lt=today
    ).values_list('workflow__pk', flat=True).distinct()
    overdue_count = len(overdue_workflows_pks)

    # Find nearing SLA steps ONLY within the filtered workflows
    nearing_sla_workflows_pks = StepStatus.objects.filter(
        workflow__in=workflow_queryset.filter(
            is_completed=False),  # Use filtered queryset
        status__in=['PENDING', 'IN_PROGRESS'],
        due_date__isnull=False,
        due_date__gte=today,
        due_date__lte=seven_days_from_now
    ).values_list('workflow__pk', flat=True).distinct()
    nearing_sla_count = nearing_sla_workflows_pks.exclude(
        pk__in=overdue_workflows_pks).count()

    data = {
        'in_progress_count': in_progress_count,
        'completed_this_month_count': completed_this_month_count,
        'overdue_count': overdue_count,
        'nearing_sla_count': nearing_sla_count,
    }
    return Response(data)
