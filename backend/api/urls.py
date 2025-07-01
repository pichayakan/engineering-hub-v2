# backend/api/urls.py
from django.urls import path, include

# --- เปลี่ยนมาใช้ Nested Routers ---
from rest_framework_nested import routers
from .views import (
    ProjectViewSet,
    TaskViewSet,
    get_csrf_token,
    MyAssignedTasksView,
    UnseenTaskCountView,
    MarkTasksAsSeenView,
    CommentViewSet
)

# สร้าง router หลักสำหรับ Project
router = routers.SimpleRouter()
router.register(r"projects", ProjectViewSet, basename="project")

# สร้าง router ที่ซ้อนอยู่ภายใต้ Project สำหรับ Task
projects_router = routers.NestedSimpleRouter(router, r"projects", lookup="project")
projects_router.register(r"tasks", TaskViewSet, basename="project-tasks")

tasks_router = routers.NestedSimpleRouter(projects_router, r"tasks", lookup="task")
tasks_router.register(r"comments", CommentViewSet, basename="task-comments")

urlpatterns = [
    path("csrf-cookie/", get_csrf_token, name="csrf-cookie"),
    path("my-tasks/", MyAssignedTasksView.as_view(), name="my-tasks"),
    path(
        "notifications/unseen-count/",
        UnseenTaskCountView.as_view(),
        name="unseen-task-count",
    ),
    path(
        "notifications/mark-as-seen/",
        MarkTasksAsSeenView.as_view(),
        name="mark-tasks-as-seen",
    ),
    path("", include(router.urls)),
    path("", include(projects_router.urls)),
    path("", include(tasks_router.urls)),
]
