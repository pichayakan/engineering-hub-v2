# backend/logs/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LogEntryViewSet

router = DefaultRouter()
router.register(r'', LogEntryViewSet, basename='logentry')

urlpatterns = [
    path('', include(router.urls)),
]
