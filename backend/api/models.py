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
    
    prerequisites = models.ManyToManyField(
        "self",  # ความสัมพันธ์ชี้กลับมาที่ Model ตัวเอง
        symmetrical=False,  # เป็นความสัมพันธ์แบบทางเดียว (A เป็น prereq ของ B ไม่ได้หมายความว่า B เป็น prereq ของ A)
        related_name="dependent_tasks",
        blank=True,
    )

    project = models.ForeignKey(Project, related_name="tasks", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="To Do")
    priority = models.CharField(
        max_length=50, choices=PRIORITY_CHOICES, default="Medium"
    )
    assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="assigned_tasks",
        blank=True,  # อนุญาตให้มี Task ที่ยังไม่มีคนรับผิดชอบได้
    )
    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    is_seen = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title
    
class Comment(models.Model):
    task = models.ForeignKey(Task, related_name="comments", on_delete=models.CASCADE)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="comments", on_delete=models.CASCADE
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.task.title}"
    
class ProjectAttachment(models.Model):
    project = models.ForeignKey(
        Project, related_name="attachments", on_delete=models.CASCADE
    )
    file = models.FileField(upload_to="project_attachments/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return self.file.name


class TaskAttachment(models.Model):
    task = models.ForeignKey(Task, related_name="attachments", on_delete=models.CASCADE)
    file = models.FileField(upload_to="task_attachments/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def __str__(self):
        return self.file.name
    
class Activity(models.Model):
    task = models.ForeignKey(Task, related_name="activities", on_delete=models.CASCADE)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    verb = models.CharField(
        max_length=255
    )  # e.g., "created the task", "changed the status to Done"
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]  # เรียงจากกิจกรรมล่าสุดก่อน

    def __str__(self):
        return f'{self.actor.username} {self.verb} on task "{self.task.title}"'