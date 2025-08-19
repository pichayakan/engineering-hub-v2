# backend/procurement/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkflowTemplateViewSet,
    ProcurementRequestViewSet,
    ProcurementCategoryViewSet,  # ✅ IMPORTED
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
]
