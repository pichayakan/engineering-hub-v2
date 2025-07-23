# backend/procurement/serializers.py
from rest_framework import serializers
from .models import WorkflowTemplate, Step, ProcurementRequest, RequestHistory
from accounts.serializers import UserListSerializer
from django.contrib.auth.models import Group

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class StepSerializer(serializers.ModelSerializer):
    """
    Serializer for individual steps within a workflow template.
    """
    
    responsible_group_details = GroupSerializer(
        source="responsible_group", read_only=True
    )

    class Meta:
        model = Step
        fields = [
            "id",
            "name",
            "order",
            "responsible_group",
            "responsible_group_details",
        ]


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for workflow templates, including their nested steps.
    """

    steps = StepSerializer(many=True, read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = ["id", "name", "description", "is_active", "steps"]


class RequestHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for the approval history of a procurement request.
    """

    step = StepSerializer(read_only=True)
    approved_by_details = UserListSerializer(source="approved_by", read_only=True)

    class Meta:
        model = RequestHistory
        fields = ["id", "step", "approved_by_details", "timestamp", "notes"]


class ProcurementRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for individual procurement requests.
    """

    created_by_details = UserListSerializer(source="created_by", read_only=True)
    current_step_details = StepSerializer(source="current_step", read_only=True)
    history = RequestHistorySerializer(many=True, read_only=True)

    class Meta:
        model = ProcurementRequest
        fields = [
            "id",
            "title",
            "project",
            "workflow_template",
            "current_step",
            "current_step_details",
            "created_by_details",
            "created_at",
            "is_completed",
            "history",
        ]
        read_only_fields = ["current_step"]
