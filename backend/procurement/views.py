# backend/procurement/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

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
    ProcurementCategorySerializer,  # ✅ IMPORTED
)


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

    queryset = WorkflowTemplate.objects.filter(is_active=True)
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProcurementRequestViewSet(viewsets.ModelViewSet):
    queryset = ProcurementRequest.objects.all().order_by("-created_at")
    serializer_class = ProcurementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        workflow = serializer.validated_data.get("workflow_template")
        first_step = workflow.steps.order_by("order").first()
        serializer.save(created_by=self.request.user, current_step=first_step)

    @action(detail=True, methods=["post"], url_path="advance-step")
    def advance_step(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user
        notes = request.data.get("notes", "")
        files = request.FILES.getlist("files")

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
        
        responsible_pks = current_step.responsible_groups.values_list('pk', flat=True)
        if (
            responsible_pks.exists()
            and not user.is_staff and not user.groups.filter(pk__in=responsible_pks).exists()
        ):
             return Response(
                {"error": "You do not have permission to approve this step."},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        history_entry = RequestHistory.objects.create(
            procurement_request=procurement_request,
            step=current_step,
            approved_by=user,
            notes=notes,
        )

        for file in files:
            ProcurementAttachment.objects.create(
                procurement_request=procurement_request,
                history_entry=history_entry,
                file=file,
                uploaded_by=user,
                name=file.name, # The name is taken from the uploaded file
            )

        next_step = (
            Step.objects.filter(
                workflow_template=procurement_request.workflow_template,
                order__gt=current_step.order,
            )
            .order_by("order")
            .first()
        )
        if next_step:
            procurement_request.current_step = next_step
            procurement_request.save()
        else:
            procurement_request.current_step = None
            procurement_request.is_completed = True
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
        
        # Find the latest history entry to associate the file with
        latest_history = procurement_request.history.order_by('-timestamp').first()
        if not latest_history:
             return Response(
                {'error': 'Cannot attach file, no approval history found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
        # new_filename = f"signed_{timestamp}_{procurement_request.title}.pdf"
        new_filename = signed_file.name

        # Create the new attachment
        ProcurementAttachment.objects.create(
            procurement_request=procurement_request,
            history_entry=latest_history,
            file=signed_file,
            uploaded_by=user,
            name=new_filename
        )
        
        # Return the updated request object
        serializer = self.get_serializer(procurement_request)
        return Response(serializer.data, status=status.HTTP_200_OK)
