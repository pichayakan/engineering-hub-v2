# backend/logs/models.py
from django.db import models
from django.conf import settings


class LogEntry(models.Model):
    class LogLevel(models.TextChoices):
        INFO = 'INFO', 'Information'
        WARNING = 'WARNING', 'Warning'
        ERROR = 'ERROR', 'Error'
        LINE = 'LINE', 'Line Notification'
        TELEGRAM = 'TELEGRAM', 'Telegram Notification'

    level = models.CharField(
        max_length=20, choices=LogLevel.choices, default=LogLevel.INFO)
    message = models.TextField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="The user who performed the action, if any.",
        related_name='custom_log_entries',
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'[{self.timestamp.strftime("%Y-%m-%d %H:%M")}] [{self.level}] {self.message}'
