# backend/workflows/serializers.py
from rest_framework import serializers
from .models import ProjectWorkflow, StepStatus, StepAttachment
from procurement.serializers import StepSerializer, GroupSerializer
from accounts.serializers import UserListSerializer

class StepAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(source="uploaded_by", read_only=True)
    class Meta:
        model = StepAttachment
        fields = ["id", "file", "name", "uploaded_by_details", "uploaded_at"]

class StepStatusSerializer(serializers.ModelSerializer):
    class StepDetailSerializer(serializers.ModelSerializer):
        responsible_groups = GroupSerializer(many=True, read_only=True)
        class Meta:
            model = StepSerializer.Meta.model
            fields = ['id', 'name', 'order', 'responsible_groups', 'duration_days']
    step = StepDetailSerializer(read_only=True)
    completed_by_details = UserListSerializer(source='completed_by', read_only=True)
    attachments = StepAttachmentSerializer(many=True, read_only=True)
    class Meta:
        model = StepStatus
        fields = '__all__'

class ProjectWorkflowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectWorkflow
        fields = ['id', 'title', 'template', 'pr_number', 'budget_amount', 'fiscal_year', 'start_date']

class ProjectWorkflowUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectWorkflow
        fields = ['title', 'pr_number', 'budget_amount', 'fiscal_year', 'is_completed', 'start_date']

class ProjectWorkflowListSerializer(serializers.ModelSerializer):
    completed_step_count = serializers.IntegerField(read_only=True)
    total_step_count = serializers.IntegerField(read_only=True)
    current_step = StepStatusSerializer(read_only=True)
    class Meta:
        model = ProjectWorkflow
        fields = [
            'id', 'title', 'template', 'pr_number', 'budget_amount', 
            'fiscal_year', 'created_at', 'start_date',  # ✅ CORRECTED
            'is_completed', 'completed_step_count', 'total_step_count', 'current_step'
        ]

class ProjectWorkflowDetailSerializer(serializers.ModelSerializer):
    step_statuses = StepStatusSerializer(many=True, read_only=True)
    created_by_details = UserListSerializer(source='created_by', read_only=True)
    class Meta:
        model = ProjectWorkflow
        fields = '__all__' # 'start_date' is automatically included with __all__