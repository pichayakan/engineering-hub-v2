# backend/api/serializers.py
from rest_framework import serializers
from .models import Project, Task , Comment
from accounts.models import User
from accounts.serializers import UserListSerializer


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
    # แสดงรายละเอียดของ assignees ตอนอ่านข้อมูล (GET)
    assignees_details = UserListSerializer(
        source="assignees", many=True, read_only=True
    )
    comment_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "assignees",
            "assignees_details",
            "created_at",
            "due_date",
            'comment_count'
        ]
        # ตอนเขียนข้อมูล (POST, PATCH) เราจะส่งไปแค่ ID ของ assignees
        # ดังนั้นเราจะกำหนดให้ 'assignees' เป็น write-only และรับเป็น PrimaryKeyRelatedField ใน extra_kwargs
        extra_kwargs = {"assignees": {"write_only": True, "required": False}}
        read_only_fields = ["project"]

class CommentSerializer(serializers.ModelSerializer):
    author_details = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "author_details", "text", "created_at"]
        read_only_fields = ["task", "author"]