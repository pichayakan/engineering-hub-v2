from django.db import models
# from django.contrib.auth.models import User
from django.conf import settings


class Project(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="projects",  # แก้ไข related_name เพื่อความชัดเจน
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Task(models.Model):
    STATUS_CHOICES = [
        ("To Do", "To Do"),
        ("In Progress", "In Progress"),
        ("Done", "Done"),
    ]

    PRIORITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
    ]

    project = models.ForeignKey(Project, related_name="tasks", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="To Do")
    priority = models.CharField(
        max_length=50, choices=PRIORITY_CHOICES, default="Medium"
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="tasks",
        on_delete=models.SET_NULL,  # ถ้า User ถูกลบ Task จะยังอยู่แต่ไม่มีคนรับผิดชอบ
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title