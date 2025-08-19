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
            source="responsible_group", read_only=True)

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
        fields = ['id', 'title', 'template']


class ProjectWorkflowListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectWorkflow
        fields = ['id', 'title', 'template', 'created_at', 'is_completed']


class ProjectWorkflowDetailSerializer(serializers.ModelSerializer):
    step_statuses = StepStatusSerializer(many=True, read_only=True)
    created_by_details = UserListSerializer(
        source='created_by', read_only=True)

    class Meta:
        model = ProjectWorkflow
        fields = '__all__'
        extra_fields = ['step_statuses', 'created_by_details']
