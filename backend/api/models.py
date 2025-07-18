from django.db import models

# from django.contrib.auth.models import User
from django.conf import settings
import uuid
from accounts.models import Department
from datetime import date


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
    assigned_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks",
    )

    accepted_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="accepted_tasks", blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    due_date = models.DateField(null=True, blank=True)
    is_seen = models.BooleanField(default=False)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_tasks",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def days_remaining(self):
        if not self.due_date:
            return None
        today = date.today()
        remaining = (self.due_date - today).days
        return remaining

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


class SharedFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled")  # <-- เพิ่มฟิลด์นี้
    file = models.FileField(upload_to="shared_files/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    filename = models.CharField(max_length=255)

    def __str__(self):
        return self.title

class Announcement(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_pinned = models.BooleanField(
        default=False, help_text="Pinned announcements will appear at the top."
    )

    class Meta:
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return self.title


class CalendarEvent(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_events",
        on_delete=models.CASCADE,
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="events", blank=True
    )

    def __str__(self):
        return self.title


# --- เพิ่ม Models สำหรับไฟล์แนบไว้ท้ายสุด ---


class AnnouncementAttachment(models.Model):
    announcement = models.ForeignKey(
        "Announcement", related_name="attachments", on_delete=models.CASCADE
    )
    file = models.FileField(upload_to="announcement_attachments/")
    name = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CalendarEventAttachment(models.Model):
    event = models.ForeignKey(
        "CalendarEvent", related_name="attachments", on_delete=models.CASCADE
    )
    file = models.FileField(upload_to="event_attachments/")
    name = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name