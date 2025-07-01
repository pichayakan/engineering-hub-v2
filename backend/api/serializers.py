# backend/api/serializers.py
from rest_framework import serializers
from .models import Project, Task
from accounts.models import User


class ProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source="owner.username")
    # --- เพิ่ม 2 ฟิลด์นี้เข้ามา ---
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "owner_username",
            "created_at",
            "total_tasks",
            "completed_tasks",  # <-- เพิ่มฟิลด์ใหม่ที่นี่
        ]
        read_only_fields = ["owner"]


# --- เพิ่ม TaskSerializer ที่หายไปกลับเข้ามา ---
class TaskSerializer(serializers.ModelSerializer):
    assignee_username = serializers.ReadOnlyField(
        source="assignee.username", allow_null=True
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "assignee_username",
            "created_at",
            "due_date",
        ]
        # ทำให้ field 'project' อ่านได้อย่างเดียวตอน response
        # เพราะเราจะกำหนด project จาก URL ไม่ใช่จากการส่งข้อมูลมาตรงๆ
        read_only_fields = ["project"]
