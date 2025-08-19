# workflows/views.py
from rest_framework import viewsets, permissions, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import ProjectWorkflow, StepStatus, StepAttachment
from .serializers import (
    ProjectWorkflowListSerializer,
    ProjectWorkflowDetailSerializer,
    ProjectWorkflowCreateSerializer,  # ✅ IMPORT THE NEW SERIALIZER
    StepStatusSerializer
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
