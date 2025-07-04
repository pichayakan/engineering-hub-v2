# backend/api/urls.py
from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    ProjectViewSet,
    TaskViewSet,
    CommentViewSet,
    ProjectAttachmentViewSet,
    TaskAttachmentViewSet,
    ActivityViewSet,
    get_csrf_token,
    MyAssignedTasksView,
    UnseenTaskCountView,
    MarkTasksAsSeenView,
    FileUploadView,
    SharedFileHistoryView,
    DashboardStatsView,  # 1. Import Dashboard views
    MemberWorkloadView,
    AssignerPerformanceView,
)

router = routers.SimpleRouter()
router.register(r"projects", ProjectViewSet, basename="project")

projects_router = routers.NestedSimpleRouter(router, r"projects", lookup="project")
projects_router.register(r"tasks", TaskViewSet, basename="project-tasks")
projects_router.register(
    r"attachments", ProjectAttachmentViewSet, basename="project-attachments"
)

tasks_router = routers.NestedSimpleRouter(projects_router, r"tasks", lookup="task")
tasks_router.register(r"comments", CommentViewSet, basename="task-comments")
tasks_router.register(
    r"attachments", TaskAttachmentViewSet, basename="task-attachments"
)
tasks_router.register(r"activities", ActivityViewSet, basename="task-activities")

urlpatterns = [
    # --- Dashboard & User-specific URLs ---
    path("my-tasks/", MyAssignedTasksView.as_view(), name="my-tasks"),
    path("dashboard-stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path(
        "workload-dashboard/", MemberWorkloadView.as_view(), name="workload-dashboard"
    ),
    path(
        "assigner-performance/",
        AssignerPerformanceView.as_view(),
        name="assigner-performance",
    ),
    # --- Notification URLs ---
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
    # --- File Sharer URLs ---
    path("share/upload/", FileUploadView.as_view(), name="file-upload"),
    path("share/history/", SharedFileHistoryView.as_view(), name="file-history"),
    # --- CSRF & Nested Router URLs ---
    path("csrf-cookie/", get_csrf_token, name="csrf-cookie"),
    path("", include(router.urls)),
    path("", include(projects_router.urls)),
    path("", include(tasks_router.urls)),
]
