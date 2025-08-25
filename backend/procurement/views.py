# backend/procurement/views.py
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


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def procurement_summary_view(request):
    """
    API endpoint for procurement dashboard summary data.
    """
    user = request.user
    ongoing_qs = ProcurementRequest.objects.filter(is_completed=False)
    ongoing_count = ongoing_qs.count()

    # Placeholder for overdue
    overdue_count = 0

    # Completed this month
    completed_this_month_count = ProcurementRequest.objects.filter(
        is_completed=True,
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

    queryset = WorkflowTemplate.objects.filter(is_active=True)
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProcurementRequestViewSet(viewsets.ModelViewSet):
    queryset = ProcurementRequest.objects.all().order_by("-created_at")
    serializer_class = ProcurementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    # Fields available for exact match filtering (e.g., ?category=1)
    filterset_fields = ['category', 'is_completed', 'project']

    # Fields available for text searching (e.g., ?search=test)
    search_fields = ['title', 'project__name',
                     'created_by__username', 'category__name']

    # Fields available for ordering (e.g., ?ordering=title)
    ordering_fields = ['created_at', 'title']

    def perform_create(self, serializer):
        workflow = serializer.validated_data.get("workflow_template")
        first_step = workflow.steps.order_by("order").first()

        procurement_request = serializer.save(
            created_by=self.request.user, current_step=first_step)

        # Now, create notifications for the first step
        if first_step:
            for group in first_step.responsible_groups.all():
                for user_to_notify in group.user_set.all():
                    Notification.objects.create(
                        recipient=user_to_notify,
                        message=f"New procurement task '{procurement_request.title}' has been created and is waiting for approval.",
                        link=f"/procurement/requests/{procurement_request.id}"
                    )

    @action(detail=True, methods=["post"], url_path="advance-step")
    def advance_step(self, request, pk=None):
        print("\n--- [DEBUG] advance_step called ---")  # DEBUG PRINT
        procurement_request = self.get_object()
        user = request.user
        notes = request.data.get("notes", "")
        files = request.FILES.getlist("files")

        if procurement_request.is_completed:
            return Response({"error": "This request is already completed."}, status=status.HTTP_400_BAD_REQUEST)

        current_step = procurement_request.current_step
        if not current_step:
            return Response({"error": "This request has no current step defined."}, status=status.HTTP_400_BAD_REQUEST)

        responsible_pks = current_step.responsible_groups.values_list(
            'pk', flat=True)
        if (responsible_pks.exists() and not user.is_staff and not user.groups.filter(pk__in=responsible_pks).exists()):
            return Response({"error": "You do not have permission to approve this step."}, status=status.HTTP_403_FORBIDDEN)

        history_entry = RequestHistory.objects.create(
            procurement_request=procurement_request, step=current_step, approved_by=user, notes=notes
        )

        Notification.objects.create(
            recipient=user,
            message=f"You have successfully approved step: '{current_step.name}' for '{procurement_request.title}'.",
            link=f"/procurement/requests/{procurement_request.id}",
            is_read=True  # Mark as read since the user initiated the action
        )

        for file in files:
            ProcurementAttachment.objects.create(
                procurement_request=procurement_request, history_entry=history_entry,
                file=file, uploaded_by=user, name=file.name
            )

        next_step = Step.objects.filter(
            workflow_template=procurement_request.workflow_template, order__gt=current_step.order).order_by("order").first()

        if next_step:
            print(f"[DEBUG] Found next step: {next_step.name}")  # DEBUG PRINT
            procurement_request.current_step = next_step
            procurement_request.save()

            responsible_groups = next_step.responsible_groups.all()
            # DEBUG PRINT
            print(
                f"[DEBUG] Responsible groups for next step: {list(responsible_groups)}")

            if not responsible_groups:
                print(
                    "[DEBUG] No responsible groups found for the next step. No notifications will be sent.")

            for group in responsible_groups:
                print(f"[DEBUG] Processing group: {group.name}")  # DEBUG PRINT
                users_in_group = group.user_set.all()
                # DEBUG PRINT
                print(f"[DEBUG] Users in this group: {list(users_in_group)}")

                if not users_in_group:
                    print(f"[DEBUG] No users in group '{group.name}'.")

                for user_to_notify in users_in_group:
                    # DEBUG PRINT
                    print(
                        f"[DEBUG] CREATING NOTIFICATION for user: {user_to_notify.username}")
                    Notification.objects.create(
                        recipient=user_to_notify,
                        message=f"มีงานใหม่ '{procurement_request.title}' รอการอนุมัติจากคุณ",
                        link=f"/procurement/requests/{procurement_request.id}"
                    )
            print("[DEBUG] Notification logic finished.")  # DEBUG PRINT
        else:
            # DEBUG PRINT
            print("[DEBUG] No next step found. Marking as completed.")
            procurement_request.current_step = None
            procurement_request.is_completed = True
            procurement_request.save()

            if procurement_request.created_by != user:
                Notification.objects.create(
                    recipient=procurement_request.created_by,
                    message=f"Your procurement request '{procurement_request.title}' has been fully approved.",
                    link=f"/procurement/requests/{procurement_request.id}"
                )

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
        latest_history = procurement_request.history.order_by(
            '-timestamp').first()
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
