# backend/api/serializers.py
from rest_framework import serializers
from .models import Project, Task, Comment, ProjectAttachment, TaskAttachment, Activity ,SharedFile
from accounts.models import User, Team
from accounts.serializers import UserListSerializer ,TeamSerializer


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

class PrerequisiteTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title"]


# --- เพิ่ม TaskSerializer ที่หายไปกลับเข้ามา ---
class TaskSerializer(serializers.ModelSerializer):
    # Read-only fields for providing detailed information in GET requests
    assignees_details = UserListSerializer(
        source="assignees", many=True, read_only=True
    )
    prerequisites_details = PrerequisiteTaskSerializer(
        source="prerequisites", many=True, read_only=True
    )
    assigned_teams_details = TeamSerializer(
        source="assigned_teams", many=True, read_only=True
    )
    # Fields from queryset annotations
    comment_count = serializers.IntegerField(read_only=True)
    attachment_count = serializers.IntegerField(read_only=True)

    # Write-only field for accepting prerequisite IDs on POST/PATCH
    prerequisites = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Task.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Task
        # --- ส่วนที่แก้ไข ---
        # นำฟิลด์ที่ประกาศเอง (assignees_details, prerequisites_details) ออก
        # เหลือไว้เฉพาะฟิลด์ที่มีอยู่จริงใน Model หรือที่ถูก annotate มาใน View
        fields = [
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "assignees",
            "created_at",
            "due_date",
            "comment_count",
            "attachment_count",
            "prerequisites",
            # เพิ่ม 'assignees_details' และ 'prerequisites_details' กลับเข้ามาเพื่อให้แสดงผล
            "assignees_details",
            "prerequisites_details",
            "assigned_teams",
            "assigned_teams_details",
            "accepted_by",
        ]
        extra_kwargs = {
            "assignees": {"write_only": True, "required": False},
            "assigned_teams": {"write_only": True, "required": False},
            # เราจะให้ accepted_by เป็น read-only เพราะจะจัดการผ่าน API แยก
            "accepted_by": {"read_only": True},
        }
        read_only_fields = ["project"]

class CommentSerializer(serializers.ModelSerializer):
    author_details = UserListSerializer(source="author", read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "author_details", "text", "created_at"]
        read_only_fields = ["task", "author"]
        
class ProjectAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(source="uploaded_by", read_only=True)

    class Meta:
        model = ProjectAttachment
        fields = ["id", "file", "uploaded_at", "uploaded_by", "uploaded_by_details"]
        read_only_fields = ["uploaded_by"]


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(source="uploaded_by", read_only=True)

    class Meta:
        model = TaskAttachment
        fields = ["id", "file", "uploaded_at", "uploaded_by", "uploaded_by_details"]
        read_only_fields = ["uploaded_by"]
        
class ActivitySerializer(serializers.ModelSerializer):
    actor_details = UserListSerializer(source="actor", read_only=True)

    class Meta:
        model = Activity
        fields = ["id", "actor_details", "verb", "created_at"]
        
class SharedFileSerializer(serializers.ModelSerializer):
    # เพิ่มข้อมูลผู้สร้างเพื่อแสดงในหน้าประวัติ
    uploaded_by_details = UserListSerializer(source="uploaded_by", read_only=True)

    class Meta:
        model = SharedFile
        fields = [
            "id",
            "title",
            "file",
            "filename",
            "uploaded_at",
            "uploaded_by_details",
        ]
        read_only_fields = ["filename", "uploaded_at", "uploaded_by_details"]

class TeamNameSerializer(serializers.ModelSerializer):
    """A simple serializer to show only the team name and id"""

    class Meta:
        model = Team
        fields = ["id", "name"]

        
class TaskForAssignerSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    assignees_details = UserListSerializer(
        source="assignees", many=True, read_only=True
    )
    assigned_teams_details = TeamNameSerializer(
        source="assigned_teams", many=True, read_only=True
    )

    # --- เพิ่ม class Meta ที่หายไปกลับเข้ามา ---
    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "project_name",
            "assignees_details",
            "assigned_teams_details",
            "status",
            "created_at",
        ]


class AssignerPerformanceSerializer(serializers.ModelSerializer):
    created_tasks_details = TaskForAssignerSerializer(source="created_tasks", many=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "created_tasks_details"]
        
