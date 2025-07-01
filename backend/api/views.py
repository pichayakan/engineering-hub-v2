from django.db.models import Count, Q
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter
from django.http import JsonResponse
from rest_framework import viewsets, permissions , generics
from .models import Project , Task
from .serializers import ProjectSerializer , TaskSerializer


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

    # --- ปรับปรุง get_queryset ให้ฉลาดขึ้น ---
    def get_queryset(self):
        # ใช้ annotate เพื่อนับจำนวน Task ทั้งหมดและ Task ที่เสร็จแล้ว
        return (
            Project.objects.filter(owner=self.request.user)
            .annotate(
                total_tasks=Count("tasks"),
                completed_tasks=Count("tasks", filter=Q(tasks__status="Done")),
            )
            .order_by("-created_at")
        )

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
            return self.queryset.filter(project_id=self.kwargs["project_pk"])
        return self.queryset.none()  # ถ้าไม่ระบุ project_pk ไม่ต้องแสดงอะไรเลย

    # Override perform_create เพื่อผูก Task กับ Project และผู้สร้างโดยอัตโนมัติ
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
        # กรอง Task เฉพาะที่ assignee คือ user ที่กำลัง login อยู่
        return Task.objects.filter(assignee=self.request.user).order_by("due_date")