# backend/workflows/serializers.py
from rest_framework import serializers
from .models import ProjectWorkflow, StepStatus, StepAttachment, WorkflowCategory
from procurement.serializers import StepSerializer, GroupSerializer
from accounts.serializers import UserListSerializer


class StepAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(
        source="uploaded_by", read_only=True)

    class Meta:
        model = StepAttachment
        fields = ["id", "file", "name", "uploaded_by_details", "uploaded_at"]


class StepStatusSerializer(serializers.ModelSerializer):
    class StepDetailSerializer(serializers.ModelSerializer):
        # --- ✅ THIS IS THE FIX ---
        # We only need ONE field for responsible groups.
        # 'responsible_groups' will now hold the list of group IDs.
        # 'responsible_group_details' will hold the detailed objects (name, etc.).
        responsible_group_details = GroupSerializer(
            source="responsible_groups", many=True, read_only=True)

        class Meta:
            model = StepSerializer.Meta.model
            # We list 'responsible_groups' to get the IDs for our permission check
            # and 'responsible_group_details' to get the names for display.
            fields = ['id', 'name', 'order', 'responsible_groups',
                      'responsible_group_details', 'duration_days']

    step = StepDetailSerializer(read_only=True)
    completed_by_details = UserListSerializer(
        source='completed_by', read_only=True)
    attachments = StepAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = StepStatus
        fields = '__all__'


class WorkflowCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowCategory
        fields = ['id', 'name']


class ProjectWorkflowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectWorkflow
        fields = ['id', 'title', 'template', 'pr_number',
                  'budget_amount', 'fiscal_year', 'start_date', 'category']


class ProjectWorkflowUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectWorkflow
        fields = ['title', 'pr_number', 'budget_amount',
                  'fiscal_year', 'is_completed', 'start_date', 'category']


class ProjectWorkflowListSerializer(serializers.ModelSerializer):
    completed_step_count = serializers.IntegerField(read_only=True)
    total_step_count = serializers.IntegerField(read_only=True)
    current_step = StepStatusSerializer(read_only=True)
    category = WorkflowCategorySerializer(read_only=True)

    class Meta:
        model = ProjectWorkflow
        fields = [
            'id', 'title', 'template', 'category', 'pr_number', 'budget_amount',
            'fiscal_year', 'created_at', 'start_date',
            'is_completed', 'completed_step_count', 'total_step_count', 'current_step'
        ]


class ProjectWorkflowDetailSerializer(serializers.ModelSerializer):
    step_statuses = StepStatusSerializer(many=True, read_only=True)
    created_by_details = UserListSerializer(
        source='created_by', read_only=True)
    category = WorkflowCategorySerializer(read_only=True)

    class Meta:
        model = ProjectWorkflow
        fields = '__all__'


class SimpleProjectWorkflowSerializer(serializers.ModelSerializer):
    """A lightweight serializer for workflow lists on a user profile."""
    class Meta:
        model = ProjectWorkflow
        fields = ['id', 'title', 'created_at', 'is_completed']
