# workflows/views.py
from django.utils import timezone  # ✅ IMPORT
from datetime import timedelta  # ✅ IMPORT
from rest_framework import viewsets, permissions, mixins, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import ProjectWorkflow, StepStatus, StepAttachment
from .serializers import (
    ProjectWorkflowListSerializer,
    ProjectWorkflowDetailSerializer,
    ProjectWorkflowCreateSerializer,  # ✅ IMPORT THE NEW SERIALIZER
    StepStatusSerializer,
    ProjectWorkflowUpdateSerializer,
)
import datetime


class ProjectWorkflowViewSet(viewsets.ModelViewSet):
    queryset = ProjectWorkflow.objects.all().order_by('-created_at')
    permission_classes = [permissions.IsAuthenticated]

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


class StepStatusViewSet(mixins.RetrieveModelMixin,
                        mixins.UpdateModelMixin,
                        viewsets.GenericViewSet):
    queryset = StepStatus.objects.all()
    serializer_class = StepStatusSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        # ... (no changes in this method)
        step_status = self.get_object()
        user = request.user
        new_status = request.data.get('status')
        if new_status and new_status != step_status.status:
            step_status.status = new_status
            if new_status == 'COMPLETED':
                step_status.completed_by = user
                step_status.completed_at = datetime.datetime.now()
            else:
                step_status.completed_by = None
                step_status.completed_at = None
        step_status.notes = request.data.get('notes', step_status.notes)
        step_status.save()
        files = request.FILES.getlist("files")
        for file in files:
            StepAttachment.objects.create(
                step_status=step_status,
                file=file,
                uploaded_by=user,
                name=file.name,
            )
        serializer = self.get_serializer(step_status)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def workflow_summary_view(request):
    """
    Provides summary data for the workflow dashboard KPI cards.
    """
    # Simple counts
    in_progress_count = ProjectWorkflow.objects.filter(
        is_completed=False).count()
    completed_this_month_count = ProjectWorkflow.objects.filter(
        is_completed=True,
        # Assuming you add a 'completed_at' field that is set upon completion.
        # For now, let's just count all completed ones.
        # completed_at__month=timezone.now().month,
        # completed_at__year=timezone.now().year
    ).count()

    # Complex SLA counts (can be added later for performance)
    # For now, we'll return placeholders.
    overdue_count = 0
    nearing_sla_count = 0

    data = {
        'in_progress_count': in_progress_count,
        'completed_this_month_count': completed_this_month_count,
        'overdue_count': overdue_count,
        'nearing_sla_count': nearing_sla_count,
    }
    return Response(data)
