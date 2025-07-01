# backend/api/urls.py
from django.urls import path, include

# --- เปลี่ยนมาใช้ Nested Routers ---
from rest_framework_nested import routers
from .views import ProjectViewSet, TaskViewSet, get_csrf_token, MyAssignedTasksView

# สร้าง router หลักสำหรับ Project
router = routers.SimpleRouter()
router.register(r"projects", ProjectViewSet, basename="project")

# สร้าง router ที่ซ้อนอยู่ภายใต้ Project สำหรับ Task
projects_router = routers.NestedSimpleRouter(router, r"projects", lookup="project")
projects_router.register(r"tasks", TaskViewSet, basename="project-tasks")

urlpatterns = [
    path("csrf-cookie/", get_csrf_token, name="csrf-cookie"),
    path(
        "my-tasks/", MyAssignedTasksView.as_view(), name="my-tasks"
    ),  # <-- 2. เพิ่ม URL ใหม่
    path("", include(router.urls)),
    path("", include(projects_router.urls)),
]
