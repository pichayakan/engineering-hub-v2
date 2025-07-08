# backend/api/views.py
from django.db.models import Count, Q
from django.http import FileResponse
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter

# --- Model Imports ---
from .models import (
    Project,
    Task,
    Comment,
    ProjectAttachment,
    TaskAttachment,
    Activity,
    SharedFile,
)
from accounts.models import User, Department

# --- Serializer Imports ---
from .serializers import (
    ProjectSerializer,
    TaskSerializer,
    CommentSerializer,
    ProjectAttachmentSerializer,
    TaskAttachmentSerializer,
    ActivitySerializer,
    SharedFileSerializer,
)
from accounts.serializers import AssignerPerformanceSerializer, MemberWorkloadSerializer


# --- Pagination Class ---
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = "page_size"
    max_page_size = 100


# --- CSRF View ---
@ensure_csrf_cookie
def get_csrf_token(request):
    return Response({"message": "CSRF cookie set"})


# --- Main ViewSets ---
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter]
    search_fields = ["name", "description"]

    def get_queryset(self):
        return Project.objects.annotate(
            total_tasks=Count("tasks"),
            completed_tasks=Count("tasks", filter=Q(tasks__status="Done")),
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if "project_pk" in self.kwargs:
            return self.queryset.filter(project_id=self.kwargs["project_pk"]).annotate(
                comment_count=Count("comments"), attachment_count=Count("attachments")
            )
        return self.queryset.none()

    def perform_create(self, serializer):
        project = Project.objects.get(pk=self.kwargs["project_pk"])
        serializer.save(project=project, created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.instance._last_modified_by = self.request.user
        serializer.save()

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        new_status = request.data.get("status")
        user = request.user

        if new_status and new_status != task.status:
            is_direct_assignee = task.assignees.filter(pk=user.pk).exists()
            is_department_member = (
                user.department and user.department == task.assigned_department
            )

            if is_direct_assignee or is_department_member:
                if not task.accepted_by.filter(pk=user.pk).exists():
                    return Response(
                        {
                            "error": "You must accept the task before changing its status."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

        if new_status in ["In Progress", "Done"] and task.status != new_status:
            incomplete_prereqs = task.prerequisites.exclude(status="Done")
            if incomplete_prereqs.exists():
                prereq_titles = ", ".join([t.title for t in incomplete_prereqs])
                return Response(
                    {
                        "error": f"Cannot update status. Prerequisite tasks not complete: {prereq_titles}"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="accept")
    def accept_task(self, request, pk=None, project_pk=None):
        task = self.get_object()
        user = request.user

        # ตรวจสอบว่าผู้ใช้มีสิทธิ์รับงานนี้หรือไม่
        is_direct_assignee = task.assignees.filter(pk=user.pk).exists()
        is_department_member = (
            user.department and user.department == task.assigned_department
        )
        if not is_direct_assignee and not is_department_member:
            return Response(
                {"error": "You are not assigned to this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ตรวจสอบว่ามีคนรับงานไปแล้วหรือยัง (สำหรับงานแผนก)
        if task.assigned_department and task.assignees.exists():
            return Response(
                {"error": "This task has already been claimed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- ส่วนที่แก้ไข: "Claim" the task ---
        # 1. เพิ่มผู้ใช้เข้าไปใน `accepted_by`
        task.accepted_by.add(user)
        # 2. เพิ่มผู้ใช้เข้าไปใน `assignees` ด้วย (นี่คือการกำหนดเจ้าของ)
        task.assignees.add(user)

        return Response({"status": "task accepted"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="unaccept")
    def unaccept_task(self, request, pk=None, project_pk=None):
        task = self.get_object()
        user = request.user

        if not task.accepted_by.filter(pk=user.pk).exists():
            return Response(
                {"error": "You have not accepted this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- ส่วนที่แก้ไข: "Un-claim" the task ---
        # 1. นำผู้ใช้ออกจาก `accepted_by`
        task.accepted_by.remove(user)
        # 2. นำผู้ใช้ออกจาก `assignees` ด้วย เพื่อให้งานกลับไปอยู่ใน Pool
        task.assignees.remove(user)

        if task.status in ["In Progress", "Done"]:
            task.status = "To Do"
            task.save()

        return Response(
            {"status": "task acceptance revoked"}, status=status.HTTP_200_OK
        )


# --- Nested ViewSets ---
class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(task_id=self.kwargs["task_pk"])

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs["task_pk"])
        serializer.save(author=self.request.user, task=task)


class ProjectAttachmentViewSet(viewsets.ModelViewSet):
    queryset = ProjectAttachment.objects.all()
    serializer_class = ProjectAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(project_id=self.kwargs["project_pk"])

    def perform_create(self, serializer):
        project = Project.objects.get(pk=self.kwargs["project_pk"])
        serializer.save(uploaded_by=self.request.user, project=project)


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    queryset = TaskAttachment.objects.all()
    serializer_class = TaskAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(task_id=self.kwargs["task_pk"])

    def perform_create(self, serializer):
        task = Task.objects.get(pk=self.kwargs["task_pk"])
        serializer.save(uploaded_by=self.request.user, task=task)


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(task_id=self.kwargs["task_pk"])


# --- Dashboard & User-specific Views ---
class MyAssignedTasksView(generics.ListAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Task.objects.filter(
                Q(assignees=user) | Q(assigned_department=user.department)
            )
            .distinct()
            .annotate(
                comment_count=Count("comments"), attachment_count=Count("attachments")
            )
            .order_by("due_date")
        )


class DashboardStatsView(APIView):
    """
    API endpoint to provide aggregated statistics for the main dashboard.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        # --- ข้อมูลสรุปชุดเดิม ---
        total_projects = Project.objects.count()
        total_tasks = Task.objects.count()
        completed_tasks_count = Task.objects.filter(status="Done").count()

        tasks_by_status = Task.objects.values("status").annotate(count=Count("status"))
        status_data = {item["status"]: item["count"] for item in tasks_by_status}

        # --- ข้อมูลสรุปชุดใหม่ ---
        total_departments = Department.objects.count()

        # นับจำนวน Task ที่ถูกมอบหมายให้แผนก แต่ยังไม่มีใครรับผิดชอบ
        unclaimed_tasks_count = Task.objects.filter(
            assigned_department__isnull=False, assignees__isnull=True
        ).count()

        # สรุปจำนวน Task ตามแผนกที่ได้รับมอบหมาย
        tasks_per_department = (
            Task.objects.filter(assigned_department__isnull=False)
            .values(
                "assigned_department__name"  # จัดกลุ่มตามชื่อแผนก
            )
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        department_task_data = {
            item["assigned_department__name"]: item["count"]
            for item in tasks_per_department
        }

        # --- รวบรวมข้อมูลทั้งหมดเพื่อส่งกลับ ---
        data = {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks_count,
            "unclaimed_tasks": unclaimed_tasks_count,  # เพิ่มข้อมูลใหม่
            "total_departments": total_departments,  # เพิ่มข้อมูลใหม่
            "status_distribution": status_data,
            "department_task_load": department_task_data,  # เพิ่มข้อมูลใหม่
        }

        return Response(data, status=status.HTTP_200_OK)


class MemberWorkloadView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, format=None):
        teams_with_members = Department.objects.prefetch_related(
            "members__assigned_tasks", "members__accepted_tasks"
        ).all()
        for team in teams_with_members:
            for member in team.members.all():
                tasks = member.assigned_tasks.all()
                accepted_count = member.accepted_tasks.filter(id__in=tasks).count()
                member.total_tasks = tasks.count()
                member.todo_tasks = tasks.filter(status="To Do").count()
                member.inprogress_tasks = tasks.filter(status="In Progress").count()
                member.done_tasks = tasks.filter(status="Done").count()
                member.accepted_tasks_count = accepted_count
                member.pending_tasks_count = member.total_tasks - accepted_count
        serializer = MemberWorkloadSerializer(teams_with_members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AssignerPerformanceView(generics.ListAPIView):
    serializer_class = AssignerPerformanceSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return (
            User.objects.filter(groups__name="Assigners")
            .prefetch_related(
                "created_tasks__project",
                "created_tasks__assignees",
                "created_tasks__assigned_department",
            )
            .order_by("first_name")
        )


# --- Notification Views ---
class UnseenTaskCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        user = request.user
        count = (
            Task.objects.filter(
                Q(assignees=user) | Q(assigned_department=user.department),
                is_seen=False,
            )
            .distinct()
            .count()
        )
        return Response({"unseen_count": count})


class MarkTasksAsSeenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        user = request.user
        Task.objects.filter(
            Q(assignees=user) | Q(assigned_department=user.department), is_seen=False
        ).update(is_seen=True)
        return Response({"status": "success"})


# --- File Sharer Views ---
class FileUploadView(generics.CreateAPIView):
    queryset = SharedFile.objects.all()
    serializer_class = SharedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        title = self.request.data.get("title", "Untitled")
        serializer.save(
            uploaded_by=self.request.user,
            filename=self.request.data.get("file").name,
            title=title,
        )


class FileDownloadView(generics.RetrieveAPIView):
    queryset = SharedFile.objects.all()
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return FileResponse(
            instance.file.open("rb"), as_attachment=True, filename=instance.filename
        )


class SharedFileHistoryView(generics.ListAPIView):
    queryset = SharedFile.objects.all().order_by("-uploaded_at")
    serializer_class = SharedFileSerializer
    permission_classes = [permissions.IsAuthenticated]
