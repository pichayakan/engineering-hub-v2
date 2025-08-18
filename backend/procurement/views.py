# backend/procurement/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    WorkflowTemplate,
    Step,
    ProcurementRequest,
    RequestHistory,
    ProcurementAttachment,
)
from .serializers import WorkflowTemplateSerializer, ProcurementRequestSerializer


class WorkflowTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for listing available workflow templates.
    (Managed via Django Admin)
    """

    queryset = WorkflowTemplate.objects.filter(is_active=True)
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProcurementRequestViewSet(viewsets.ModelViewSet):
    """
    API endpoint for creating and managing procurement requests.
    """

    queryset = ProcurementRequest.objects.all().order_by("-created_at")
    serializer_class = ProcurementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    # Allow both JSON (for create) and multipart (for advance-step)
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # --- 2. เพิ่มการตั้งค่าสำหรับ Filter Backends ---
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # --- 3. กำหนดฟิลด์ที่จะใช้ในการค้นหา ---
    search_fields = ['title', 'project__name', 'created_by__username']

    # --- 4. กำหนดฟิลด์ที่จะใช้ในการจัดเรียง ---
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']  # กำหนดการเรียงลำดับเริ่มต้น

    def get_queryset(self):
        # In a real-world scenario, you might filter this based on user roles
        # For now, authenticated users can see all requests.
        return ProcurementRequest.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        # Automatically set the first step when a new request is created
        workflow = serializer.validated_data.get("workflow_template")
        first_step = workflow.steps.order_by("order").first()
        serializer.save(created_by=self.request.user, current_step=first_step)

    @action(detail=True, methods=["post"], url_path="advance-step")
    def advance_step(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user
        notes = request.data.get("notes", "")
        files = request.FILES.getlist("files")

        # Check if the request is already completed
        if procurement_request.is_completed:
            return Response(
                {"error": "This request is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_step = procurement_request.current_step
        if not current_step:
            return Response(
                {"error": "This request has no current step defined."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if the user is in the responsible group for the current step
        if (
            current_step.responsible_group
            and not user.groups.filter(pk=current_step.responsible_group.pk).exists()
        ):
            return Response(
                {"error": "You do not have permission to approve this step."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Create the history record for the approval
        history_entry = RequestHistory.objects.create(
            procurement_request=procurement_request,
            step=current_step,
            approved_by=user,
            notes=notes,
        )

        # Save any attached files linked to this history entry
        for file in files:
            ProcurementAttachment.objects.create(
                procurement_request=procurement_request,
                history_entry=history_entry,
                file=file,
                uploaded_by=user,
                name=file.name,
            )

        # Find the next step in the workflow
        next_step = (
            Step.objects.filter(
                workflow_template=procurement_request.workflow_template,
                order__gt=current_step.order,
            )
            .order_by("order")
            .first()
        )

        if next_step:
            # If there is a next step, update the request
            procurement_request.current_step = next_step
            procurement_request.save()
        else:
            # If there are no more steps, mark the request as completed
            procurement_request.current_step = None
            procurement_request.is_completed = True
            procurement_request.save()

        return Response(self.get_serializer(procurement_request).data)
