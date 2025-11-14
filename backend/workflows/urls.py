# workflows/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectWorkflowViewSet, StepStatusViewSet, workflow_summary_view, workflow_status_breakdown, workflow_performance_trend, WorkflowCategoryViewSet, workflow_template_list_view

router = DefaultRouter()
router.register(r'projects', ProjectWorkflowViewSet,
                basename='project-workflow')
router.register(r'step-statuses', StepStatusViewSet, basename='step-status')

router.register(r'categories', WorkflowCategoryViewSet,
                basename='workflow-category')

urlpatterns = [
    path('', include(router.urls)),
    path('templates/', workflow_template_list_view, name='workflow-templates'),
    path('summary/', workflow_summary_view, name='workflow-summary'),
    path('summary/status-breakdown/', workflow_status_breakdown,
         name='workflow-status-breakdown'),
    path('summary/performance-trend/', workflow_performance_trend,
         name='workflow-performance-trend'),
]
