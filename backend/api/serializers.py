# backend/api/serializers.py
from rest_framework import serializers
from .models import (
    Project,
    Task,
    Comment,
    ProjectAttachment,
    TaskAttachment,
    Activity,
    SharedFile,
    Announcement,
    CalendarEvent,
    AnnouncementAttachment,
    CalendarEventAttachment,
    FileCategory,
    TaskTemplate,
)
from accounts.models import User, Department
from accounts.serializers import UserListSerializer


# --- Serializers หลัก ---


class ProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source="owner.username")
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
            "completed_tasks",
        ]
        read_only_fields = ["owner"]


class PrerequisiteTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title"]


class DepartmentNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]


class TaskSerializer(serializers.ModelSerializer):
    assignees_details = UserListSerializer(
        source="assignees", many=True, read_only=True
    )
    prerequisites_details = PrerequisiteTaskSerializer(
        source="prerequisites", many=True, read_only=True
    )
    assigned_department_details = DepartmentNameSerializer(
        source="assigned_department", read_only=True
    )

    comment_count = serializers.IntegerField(read_only=True)
    attachment_count = serializers.IntegerField(read_only=True)

    created_by_details = UserListSerializer(source="created_by", read_only=True)

    project_name = serializers.CharField(source="project.name", read_only=True)
    accepted_by_details = UserListSerializer(
        source="accepted_by", many=True, read_only=True
    )

    prerequisites = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Task.objects.all(), write_only=True, required=False
    )

    days_remaining = serializers.IntegerField(read_only=True)

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
            "assigned_department",
            "assigned_department_details",
            "created_at",
            "due_date",
            "comment_count",
            "attachment_count",
            "prerequisites",
            "prerequisites_details",
            "accepted_by",
            "accepted_by_details",
            "project_name",
            "created_by_details",
            "days_remaining",
        ]
        # --- ส่วนที่แก้ไข ---
        # เราจะเอา write_only ออกจาก assigned_department
        # และกำหนดให้มันเป็น PrimaryKeyRelatedField เพื่อให้รับและส่งค่า ID ได้
        extra_kwargs = {
            "assignees": {"write_only": True, "required": False},
            "accepted_by": {"read_only": True},
        }
        read_only_fields = ["project"]

    # เพิ่มบรรทัดนี้เพื่อกำหนดวิธีการจัดการ assigned_department
    assigned_department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), allow_null=True, required=False
    )


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


class FileCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FileCategory
        fields = ["id", "name"]


class SharedFileSerializer(serializers.ModelSerializer):
    uploaded_by_details = UserListSerializer(source="uploaded_by", read_only=True)

    category_details = FileCategorySerializer(source="category", read_only=True)

    class Meta:
        model = SharedFile
        fields = [
            "id",
            "title",
            "file",
            "filename",
            "uploaded_at",
            "uploaded_by_details",
            "category",
            "category_details",
        ]
        read_only_fields = ["filename", "uploaded_at", "uploaded_by_details"]


# --- Serializers สำหรับ Dashboard ---


class TaskForAssignerSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    assignees_details = UserListSerializer(
        source="assignees", many=True, read_only=True
    )
    # เปลี่ยนจาก team เป็น department
    assigned_department_details = DepartmentNameSerializer(
        source="assigned_department", read_only=True
    )

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "project_name",
            "assignees_details",
            "assigned_department_details",  # แก้ไขจาก team เป็น department
            "status",
            "created_at",
        ]


class AssignerPerformanceSerializer(serializers.ModelSerializer):
    created_tasks_details = TaskForAssignerSerializer(source="created_tasks", many=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "created_tasks_details"]


class AnnouncementAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnouncementAttachment
        fields = ["id", "name", "file"]


class CalendarEventAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEventAttachment
        fields = ["id", "name", "file"]


class AnnouncementSerializer(serializers.ModelSerializer):
    author_details = UserListSerializer(source="author", read_only=True)
    attachments = AnnouncementAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "content",
            "author_details",
            "created_at",
            "is_pinned",
            "attachments",
        ]


class CalendarEventSerializer(serializers.ModelSerializer):
    created_by_details = UserListSerializer(source="created_by", read_only=True)
    participants_details = UserListSerializer(
        source="participants", many=True, read_only=True
    )
    attachments = CalendarEventAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            "id",
            "title",
            "description",
            "start_time",
            "end_time",
            "created_by_details",
            "participants",
            "participants_details",
            "attachments",
        ]
        extra_kwargs = {"participants": {"write_only": True, "required": False}}


class TaskTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskTemplate
        fields = ["id", "name", "subject_template", "body_template"]