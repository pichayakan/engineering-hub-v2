# workflows/serializers.py
from rest_framework import serializers
from .models import ProjectWorkflow, StepStatus, StepAttachment
# ✅ IMPORT GroupSerializer to get responsible group details
from procurement.serializers import StepSerializer, GroupSerializer
from accounts.serializers import UserListSerializer


class StepAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(
        source="uploaded_by", read_only=True)

    class Meta:
        model = StepAttachment
        fields = ["id", "file", "name", "uploaded_by_details", "uploaded_at"]

# --- ✅ UPDATED THIS SERIALIZER ---


class StepStatusSerializer(serializers.ModelSerializer):
    # Explicitly define step serializer to ensure all fields are present
    class StepDetailSerializer(serializers.ModelSerializer):
        responsible_group_details = GroupSerializer(
            source="responsible_groups", many=True, read_only=True)

        class Meta:
            model = StepSerializer.Meta.model
            fields = ['id', 'name', 'order',
                      'responsible_group_details', 'duration_days']

    step = StepDetailSerializer(read_only=True)
    completed_by_details = UserListSerializer(
        source='completed_by', read_only=True)
    attachments = StepAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = StepStatus
        fields = '__all__'

# --- (The rest of the file remains the same) ---


class ProjectWorkflowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectWorkflow
        fields = ['id', 'title', 'template',
                  'pr_number', 'budget_amount', 'fiscal_year']


class ProjectWorkflowUpdateSerializer(serializers.ModelSerializer):
    """Serializer specifically for updating an existing workflow's details."""
    class Meta:
        model = ProjectWorkflow
        # Only include fields that are editable after creation. Template is excluded.
        fields = ['title', 'pr_number', 'budget_amount',
                  'fiscal_year', 'is_completed']


class ProjectWorkflowListSerializer(serializers.ModelSerializer):
    """Serializer for list view, now includes progress data."""
    # --- ✅ ADD THESE TWO FIELDS ---
    completed_step_count = serializers.IntegerField(read_only=True)
    total_step_count = serializers.IntegerField(read_only=True)
    # Use the StepStatusSerializer to get details of the current step
    current_step = StepStatusSerializer(read_only=True)

    class Meta:
        model = ProjectWorkflow
        fields = [
            'id', 'title', 'template', 'pr_number', 'budget_amount',
            'fiscal_year', 'created_at', 'is_completed',
            'completed_step_count',  # ✅ ADDED
            'total_step_count', 'current_step'
        ]


class ProjectWorkflowDetailSerializer(serializers.ModelSerializer):
    step_statuses = StepStatusSerializer(many=True, read_only=True)
    created_by_details = UserListSerializer(
        source='created_by', read_only=True)

    class Meta:
        model = ProjectWorkflow
        fields = '__all__'
        extra_fields = ['step_statuses', 'created_by_details']
