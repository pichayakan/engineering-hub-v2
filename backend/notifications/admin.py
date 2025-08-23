# backend/notifications/admin.py
from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin interface for the Notification model.
    """
    list_display = ('recipient', 'message', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at', 'recipient')
    search_fields = ('recipient__username', 'message')
    readonly_fields = ('recipient', 'message', 'link', 'created_at')

    def has_add_permission(self, request):
        # Disable the ability to manually add notifications from the admin
        return False