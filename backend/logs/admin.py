# backend/logs/admin.py
from django.contrib import admin
from .models import LogEntry


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    """
    Admin interface for the LogEntry model.
    """
    list_display = ('timestamp', 'level', 'message', 'user')
    list_filter = ('level', 'timestamp')
    search_fields = ('message', 'user__username')
    readonly_fields = ('timestamp', 'level', 'message', 'user')

    def has_add_permission(self, request):
        # Disable the ability to manually add logs from the admin
        return False

    def has_delete_permission(self, request, obj=None):
        # Disable the ability to delete logs from the admin
        return False
