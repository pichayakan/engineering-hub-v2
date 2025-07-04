from django.db.models import Count, Q
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter
from django.http import JsonResponse, FileResponse
from rest_framework import viewsets, permissions, generics, status
from .models import Project, Task, Comment, ProjectAttachment, TaskAttachment, Activity
from .serializers import (
    ProjectSerializer,
    TaskSerializer,
    CommentSerializer,
    ProjectAttachmentSerializer,
    TaskAttachmentSerializer,
    ActivitySerializer,
    SharedFileSerializer,AssignerPerformanceSerializer
)
from rest_framework.views import APIView  # <-- เพิ่มการ import APIView
from rest_framework.response import Response
from rest_framework.decorators import action  # <-- เพิ่มการ import Response
from .permissions import IsOwnerOrReadOnly
from .models import Project, Task, SharedFile
from accounts.models import User
from accounts.serializers import TeamWorkloadSerializer
from accounts.models import Team


class DashboardStatsView(APIView):
    """
    API endpoint to provide aggregated statistics for the main dashboard.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        # นับจำนวนโปรเจกต์และ Task ทั้งหมด
        total_projects = Project.objects.count()
        total_tasks = Task.objects.count()

        # สรุปจำนวน Task ตามสถานะ
        tasks_by_status = (
            Task.objects.values("status")
            .annotate(count=Count("status"))
            .order_by("status")
        )
        status_data = {item["status"]: item["count"] for item in tasks_by_status}

        # สรุปจำนวน Task ตามความสำคัญ
        tasks_by_priority = (
            Task.objects.values("priority")
            .annotate(count=Count("priority"))
            .order_by("priority")
        )
        priority_data = {item["priority"]: item["count"] for item in tasks_by_priority}

        # 1. นับจำนวน Task ที่เสร็จแล้วโดยเฉพาะ
        completed_tasks_count = Task.objects.filter(status="Done").count()

        # 2. สรุปภาระงานของแต่ละคน
        tasks_per_assignee = (
            Task.objects.filter(assignees__isnull=False)
            .values(
                "assignees__username"  # จัดกลุ่มตาม username
            )
            .annotate(
                task_count=Count("id")  # นับจำนวน task
            )
            .order_by("-task_count")
        )  # เรียงจากคนที่งานเยอะที่สุด

        assignee_data = {
            item["assignees__username"]: item["task_count"]
            for item in tasks_per_assignee
        }

        # รวบรวมข้อมูลทั้งหมดเพื่อส่งกลับ
        data = {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks_count,  # เพิ่มข้อมูลใหม่
            "status_distribution": status_data,
            "priority_distribution": priority_data,
            "assignee_task_load": assignee_data,  # เพิ่มข้อมูลใหม่
        }

        return Response(data, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # กรองให้เห็นเฉพาะ comment ของ task ที่ระบุใน URL
        return self.queryset.filter(task_id=self.kwargs["task_pk"])

    def perform_create(self, serializer):
        # กำหนด task และ author โดยอัตโนมัติ
        task = Task.objects.get(pk=self.kwargs["task_pk"])
        serializer.save(author=self.request.user, task=task)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 6  # แสดง 6 โปรเจกต์ต่อหน้า
    page_size_query_param = "page_size"
    max_page_size = 100


@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"message": "CSRF cookie set"})


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by("-created_at")
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    # --- เพิ่มการตั้งค่าสำหรับ Search และ Pagination ---
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter]
    search_fields = ["name", "description"]  # ค้นหาจากชื่อและรายละเอียดโปรเจกต์
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    # --- ปรับปรุง get_queryset ให้ฉลาดขึ้น ---
    def get_queryset(self):
        # ใช้ annotate เพื่อนับจำนวน Task ทั้งหมดและ Task ที่เสร็จแล้ว
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

    # Override get_queryset เพื่อให้ดึงเฉพาะ Task ของโปรเจกต์ที่ระบุ
    def get_queryset(self):
        # ตรวจสอบว่า URL มี 'project_pk' หรือไม่
        if "project_pk" in self.kwargs:
            return self.queryset.filter(project_id=self.kwargs["project_pk"]).annotate(
                comment_count=Count("comments"), attachment_count=Count("attachments")
            )
        return self.queryset.none()

    @action(detail=True, methods=["post"], url_path="accept")
    def accept_task(self, request, pk=None, project_pk=None):
        task = self.get_object()
        user = request.user

        # ตรวจสอบว่าผู้ใช้คนนี้เป็นหนึ่งใน assignees หรืออยู่ในทีมที่ได้รับมอบหมายหรือไม่
        is_direct_assignee = task.assignees.filter(pk=user.pk).exists()
        is_team_assignee = task.assigned_teams.filter(members=user).exists()

        if not is_direct_assignee and not is_team_assignee:
            return Response(
                {"error": "You are not assigned to this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # เพิ่มผู้ใช้เข้าไปใน list ของคนที่กดยืนยันแล้ว
        task.accepted_by.add(user)
        task.save()

        return Response({"status": "task accepted"}, status=status.HTTP_200_OK)

    # --- เพิ่ม Action ใหม่สำหรับยกเลิกการรับงาน ---
    @action(detail=True, methods=["post"], url_path="unaccept")
    def unaccept_task(self, request, pk=None, project_pk=None):
        task = self.get_object()
        user = request.user

        # ตรวจสอบว่าผู้ใช้เคยกดรับงานนี้ไปแล้วหรือไม่
        if not task.accepted_by.filter(pk=user.pk).exists():
            return Response(
                {"error": "You have not accepted this task."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # นำผู้ใช้ออกจาก list ของคนที่กดยืนยันแล้ว
        task.accepted_by.remove(user)

        # (Optional) อาจจะตั้งสถานะกลับเป็น To Do ถ้าไม่มีใครรับงานแล้ว
        if task.accepted_by.count() == 0:
            task.status = "To Do"
            task.save()

        return Response(
            {"status": "task acceptance revoked"}, status=status.HTTP_200_OK
        )

    # เราไม่จำเป็นต้องกำหนด assignee เองอีกต่อไป
    # DRF จะจัดการการบันทึก ManyToManyField ให้จากข้อมูลที่ส่งมาใน request body
    def perform_create(self, serializer):
        project = Project.objects.get(pk=self.kwargs["project_pk"])
        serializer.save(project=project, created_by=self.request.user)

    # --- Override perform_update เพื่อแนบ user ไปกับ instance ---
    def perform_update(self, serializer):
        # ก่อนที่จะ save, เราจะแนบ user ที่กำลัง login อยู่เข้าไปใน instance
        # เพื่อให้ signal สามารถนำไปใช้ได้
        serializer.instance._last_modified_by = self.request.user
        serializer.save()

    # --- Override เมธอด update เพื่อเพิ่ม Logic การตรวจสอบ ---
    def update(self, request, *args, **kwargs):
        task = self.get_object()
        new_status = request.data.get("status")
        user = request.user

        # --- เพิ่มกฎใหม่ ---
        # 1. ตรวจสอบว่ามีการเปลี่ยนสถานะหรือไม่
        if new_status and new_status != task.status:
            # 2. ตรวจสอบว่าผู้ใช้เป็นหนึ่งในผู้รับผิดชอบงานหรือไม่
            is_assignee = (
                task.assignees.filter(pk=user.pk).exists()
                or task.assigned_teams.filter(members=user).exists()
            )
            if is_assignee:
                # 3. ถ้าเป็นผู้รับผิดชอบ, ตรวจสอบว่ากดยืนยันรับงานแล้วหรือยัง
                if not task.accepted_by.filter(pk=user.pk).exists():
                    return Response(
                        {
                            "error": "You must accept the task before changing its status."
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

        # ตรวจสอบเมื่อมีการเปลี่ยนสถานะเป็น "In Progress" หรือ "Done"
        if new_status in ["In Progress", "Done"] and task.status != new_status:
            # ค้นหางานที่ต้องทำก่อน (prerequisites) ที่ยังไม่เสร็จ (สถานะไม่ใช่ 'Done')
            incomplete_prereqs = task.prerequisites.exclude(status="Done")
            if incomplete_prereqs.exists():
                # ถ้ามีงานที่ต้องทำก่อนยังไม่เสร็จ ให้ส่ง Error กลับไป
                prereq_titles = ", ".join([t.title for t in incomplete_prereqs])
                error_message = f"Cannot update status. The following prerequisite tasks are not complete: {prereq_titles}"
                return Response(
                    {"error": error_message}, status=status.HTTP_400_BAD_REQUEST
                )

        # ถ้าผ่านการตรวจสอบทั้งหมด ให้ทำการอัปเดตตามปกติ
        return super().update(request, *args, **kwargs)


class MyAssignedTasksView(generics.ListAPIView):
    """
    API endpoint to retrieve tasks assigned to the currently authenticated user.
    """

    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 2. เพิ่ม .annotate() เพื่อนับจำนวน comments
        user = self.request.user
        return (
            Task.objects.filter(Q(assignees=user) | Q(assigned_teams__members=user))
            .distinct()
            .annotate(
                comment_count=Count("comments"), attachment_count=Count("attachments")
            )
            .order_by("due_date")
        )


class UnseenTaskCountView(APIView):
    """
    API endpoint to get the count of unseen tasks for the logged-in user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        # เปลี่ยนจาก assignee เป็น assignees
        count = Task.objects.filter(assignees=request.user, is_seen=False).count()
        return Response({"unseen_count": count})


class MarkTasksAsSeenView(APIView):
    """
    API endpoint to mark all unseen tasks for the logged-in user as seen.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        # เปลี่ยนจาก assignee เป็น assignees
        Task.objects.filter(assignees=request.user, is_seen=False).update(is_seen=True)
        return Response({"status": "success"})


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
    """
    A read-only viewset for listing activities for a given task.
    """

    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(task_id=self.kwargs["task_pk"])


class FileUploadView(generics.CreateAPIView):
    queryset = SharedFile.objects.all()
    serializer_class = SharedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # รับ title จาก form data
        title = self.request.data.get("title", "Untitled")
        serializer.save(
            uploaded_by=self.request.user,
            filename=self.request.data.get("file").name,
            title=title,
        )


class FileDownloadView(generics.RetrieveAPIView):
    queryset = SharedFile.objects.all()
    permission_classes = [permissions.AllowAny]  # อนุญาตให้ทุกคนดาวน์โหลดได้

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # ส่งไฟล์กลับไปให้เบราว์เซอร์ดาวน์โหลด
        return FileResponse(
            instance.file.open("rb"), as_attachment=True, filename=instance.filename
        )


class SharedFileHistoryView(generics.ListAPIView):
    queryset = SharedFile.objects.all().order_by("-uploaded_at")
    serializer_class = SharedFileSerializer
    permission_classes = [permissions.IsAuthenticated]


class MemberWorkloadView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, format=None):
        teams_with_members = Team.objects.prefetch_related(
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
        serializer = TeamWorkloadSerializer(teams_with_members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AssignerPerformanceView(generics.ListAPIView):
    """
    API endpoint to list performance data for all staff members.
    """

    serializer_class = AssignerPerformanceSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        # เปลี่ยนจากการ filter ด้วย is_staff=True
        # มาเป็น filter หา User ทุกคนที่อยู่ในกลุ่ม "Assigners"
        return (
            User.objects.filter(groups__name="Assigners")
            .prefetch_related(
                "created_tasks__project",
                "created_tasks__assignees",
                "created_tasks__assigned_teams",
            )
            .order_by("first_name")
        )

    serializer_class = AssignerPerformanceSerializer
    permission_classes = [permissions.IsAdminUser]