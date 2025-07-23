# backend/procurement/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowTemplateViewSet, ProcurementRequestViewSet

router = DefaultRouter()
router.register(r"templates", WorkflowTemplateViewSet, basename="workflow-template")
router.register(r"requests", ProcurementRequestViewSet, basename="procurement-request")

urlpatterns = [
    path("", include(router.urls)),
]
