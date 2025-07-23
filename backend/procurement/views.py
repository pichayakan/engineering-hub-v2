# backend/procurement/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WorkflowTemplate, Step, ProcurementRequest, RequestHistory
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

    serializer_class = ProcurementRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ผู้ใช้จะเห็นเฉพาะเรื่องที่ตัวเองสร้าง หรือเรื่องที่ตัวเองมีสิทธิ์อนุมัติในขั้นตอนปัจจุบัน
        user = self.request.user
        # This can be complex, for now, let's allow users to see all requests.
        # We will add row-level permissions later if needed.
        return ProcurementRequest.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        # เมื่อสร้างเรื่องใหม่ ให้กำหนดขั้นตอนแรกโดยอัตโนมัติ
        workflow = serializer.validated_data.get("workflow_template")
        first_step = workflow.steps.order_by("order").first()
        serializer.save(created_by=self.request.user, current_step=first_step)

    @action(detail=True, methods=["post"], url_path="advance-step")
    def advance_step(self, request, pk=None):
        procurement_request = self.get_object()
        user = request.user
        notes = request.data.get("notes", "")

        # ตรวจสอบว่าเรื่องนี้เสร็จสิ้นไปแล้วหรือยัง
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

        # ตรวจสอบสิทธิ์: ผู้ใช้ต้องอยู่ในกลุ่มที่รับผิดชอบขั้นตอนนี้
        if (
            current_step.responsible_group
            and not user.groups.filter(pk=current_step.responsible_group.pk).exists()
        ):
            return Response(
                {"error": "You do not have permission to approve this step."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # บันทึกประวัติการอนุมัติ
        RequestHistory.objects.create(
            procurement_request=procurement_request,
            step=current_step,
            approved_by=user,
            notes=notes,
        )

        # หาขั้นตอนถัดไป
        next_step = (
            Step.objects.filter(
                workflow_template=procurement_request.workflow_template,
                order__gt=current_step.order,
            )
            .order_by("order")
            .first()
        )

        if next_step:
            # ถ้ามีขั้นตอนถัดไป ให้อัปเดต
            procurement_request.current_step = next_step
            procurement_request.save()
        else:
            # ถ้าไม่มีแล้ว ให้ถือว่ากระบวนการเสร็จสิ้น
            procurement_request.current_step = None
            procurement_request.is_completed = True
            procurement_request.save()

        return Response(self.get_serializer(procurement_request).data)
