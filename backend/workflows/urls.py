# workflows/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectWorkflowViewSet, StepStatusViewSet, workflow_summary_view

router = DefaultRouter()
router.register(r'projects', ProjectWorkflowViewSet,
                basename='project-workflow')
router.register(r'step-statuses', StepStatusViewSet, basename='step-status')

urlpatterns = [
    path('', include(router.urls)),
    path('summary/', workflow_summary_view, name='workflow-summary'),
]
