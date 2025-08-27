# backend/logs/views.py
from rest_framework import viewsets, permissions
from .models import LogEntry
from .serializers import LogEntrySerializer
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows viewing of system log entries.
    Only accessible by admin users.
    """
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [permissions.IsAdminUser]  # Only admins can see logs
    pagination_class = StandardResultsSetPagination
