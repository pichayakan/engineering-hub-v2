from django.db.models import Count, Q
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter
from django.http import JsonResponse
from rest_framework import viewsets, permissions, generics
from .models import Project, Task, Comment
from .serializers import ProjectSerializer, TaskSerializer, CommentSerializer
from rest_framework.views import APIView  # <-- เพิ่มการ import APIView
from rest_framework.response import Response  # <-- เพิ่มการ import Response
from .permissions import IsOwnerOrReadOnly


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
                comment_count=Count("comments")
            )
        return self.queryset.none()

    # เราไม่จำเป็นต้องกำหนด assignee เองอีกต่อไป
    # DRF จะจัดการการบันทึก ManyToManyField ให้จากข้อมูลที่ส่งมาใน request body
    def perform_create(self, serializer):
        project = Project.objects.get(pk=self.kwargs["project_pk"])
        serializer.save(project=project)


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
            Task.objects.filter(assignees=user)
            .annotate(comment_count=Count("comments"))
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
