# backend/procurement/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkflowTemplateViewSet,
    ProcurementRequestViewSet,
    ProcurementCategoryViewSet,
    procurement_summary_view,
    procurement_analytics_view,
)

router = DefaultRouter()
router.register(r"templates", WorkflowTemplateViewSet,
                basename="workflow-template")
router.register(r"requests", ProcurementRequestViewSet,
                basename="procurement-request")
router.register(r"categories", ProcurementCategoryViewSet,
                basename="procurement-category")  # ✅ ADDED THIS LINE

urlpatterns = [
    path("", include(router.urls)),
    path("summary/", procurement_summary_view, name="procurement-summary"),
    path("analytics/", procurement_analytics_view, name="procurement-analytics"),
]
