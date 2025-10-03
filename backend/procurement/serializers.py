# backend/procurement/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import (
    WorkflowTemplate,
    Step,
    ProcurementRequest,
    RequestHistory,
    ProcurementAttachment,
    ProcurementCategory,  # ✅ IMPORTED
)
from accounts.serializers import UserListSerializer, UserDetailForHistorySerializer

# --- ✅ ADDED THIS NEW SERIALIZER ---


class ProcurementCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the ProcurementCategory model.
    """
    class Meta:
        model = ProcurementCategory
        fields = ["id", "name"]


# --- Serializer for supporting models ---


class GroupSerializer(serializers.ModelSerializer):
    members = UserListSerializer(source="user_set", many=True, read_only=True)

    class Meta:
        model = Group
        fields = ["id", "name", "members"]


class StepSerializer(serializers.ModelSerializer):
    """
    Serializer for individual steps within a workflow template.
    """

    responsible_group_details = GroupSerializer(
        source="responsible_groups", many=True, read_only=True
    )

    class Meta:
        model = Step
        fields = [
            "id",
            "name",
            "order",
            "responsible_groups",
            "responsible_group_details",
            "is_signature_required",
            "requires_document_number",
            "requires_attachment",
        ]


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for workflow templates, including their nested steps.
    """

    steps = StepSerializer(many=True, read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = ["id", "name", "description", "is_active", "steps"]


class ProcurementAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(
        source="uploaded_by", read_only=True)

    class Meta:
        model = ProcurementAttachment
        fields = ["id", "file", "name", "uploaded_by_details",
                  "uploaded_at", "history_entry"]


class RequestHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for the approval history of a procurement request.
    """

    step = StepSerializer(read_only=True)
    approved_by_details = UserDetailForHistorySerializer(
        source="approved_by", read_only=True
    )
    attachments = ProcurementAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = RequestHistory
        fields = [
            "id",
            "step",
            "action",
            "approved_by_details",
            "timestamp",
            "notes",
            "document_number",  # ✅ เพิ่ม document_number"
            "attachments",
        ]


class ProcurementListSerializer(serializers.ModelSerializer):
    """
    Serializer สำหรับหน้า List ที่ส่งข้อมูลเฉพาะที่จำเป็น
    และเพิ่ม field สรุปเลขที่เอกสาร
    """
    category_details = ProcurementCategorySerializer(
        source="category", read_only=True
    )
    current_step_details = StepSerializer(
        source="current_step", read_only=True
    )
    created_by_details = UserListSerializer(
        source="created_by", read_only=True
    )
    project_name = serializers.CharField(
        source="project.name", read_only=True, allow_null=True
    )

    # --- Field ที่เราจะคำนวณขึ้นมาใหม่ ---
    history_document_numbers = serializers.SerializerMethodField()

    class Meta:
        model = ProcurementRequest
        fields = (
            'id',
            'title',
            'project_name',
            'category_details',
            'current_step_details',
            'created_by_details',
            'created_at',
            'is_completed',
            'is_cancelled',
            'history_document_numbers'  # <-- field สรุปของเรา
        )

    def get_history_document_numbers(self, obj):
        """
        รวบรวม document_number ทั้งหมดจาก history ที่มีค่า (ไม่ว่าง)
        แล้วนำมาต่อกันด้วย ", "
        """
        numbers = obj.history.exclude(
            document_number__isnull=True
        ).exclude(
            document_number__exact=''
        ).values_list('document_number', flat=True)

        return ", ".join(numbers)


class ProcurementRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for individual procurement requests.
    """

    created_by_details = UserListSerializer(
        source="created_by", read_only=True)
    current_step_details = StepSerializer(
        source="current_step", read_only=True)
    history = RequestHistorySerializer(many=True, read_only=True)
    project_name = serializers.CharField(
        source="project.name", read_only=True, allow_null=True
    )
    current_step_due_date = serializers.DateField(read_only=True)

    # --- ✅ ADDED THIS LINE ---
    category_details = ProcurementCategorySerializer(
        source="category", read_only=True
    )

    attachments = ProcurementAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ProcurementRequest
        fields = [
            "id",
            "title",
            "project",
            "project_name",
            "category",  # ✅ ADDED THIS
            "category_details",  # ✅ ADDED THIS
            "document_number",
            "workflow_template",
            "current_step",
            "current_step_details",
            "created_by_details",
            "created_at",
            "is_completed",
            "history",
            "current_step_due_date",
            "created_by",
            "attachments",
            "is_cancelled",
        ]
        read_only_fields = ["current_step", "created_by"]
