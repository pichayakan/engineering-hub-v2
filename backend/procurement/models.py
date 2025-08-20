# backend/procurement/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth.models import Group
from api.models import Project
from datetime import timedelta


class ProcurementCategory(models.Model):
    """
    เก็บหมวดหมู่ของเรื่องการจัดหา เช่น งานจ้าง, งานซื้อ, เช่า
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Procurement Category"
        verbose_name_plural = "Procurement Categories"

    def __str__(self):
        return self.name


class WorkflowTemplate(models.Model):
    """
    แม่แบบของกระบวนการทำงาน เช่น "จัดหาพัสดุไม่เกิน 5 แสนบาท"
    """

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Step(models.Model):
    """
    ขั้นตอนย่อยๆ ในแต่ละแม่แบบ เช่น "จัดทำ TOR", "ขออนุมัติหลักการ"
    """

    workflow_template = models.ForeignKey(
        WorkflowTemplate, related_name="steps", on_delete=models.CASCADE
    )
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(
        help_text="ลำดับของขั้นตอน เช่น 1, 2, 3...")
    responsible_groups = models.ManyToManyField(
        Group,
        blank=True,
        help_text="กลุ่มผู้ใช้ที่มีสิทธิ์อนุมัติขั้นตอนนี้",
    )
    duration_days = models.PositiveIntegerField(
        default=7, help_text="กรอบเวลาสำหรับขั้นตอนนี้ (วัน)"
    )

    class Meta:
        ordering = ["workflow_template", "order"]
        unique_together = ("workflow_template", "order")

    def __str__(self):
        return f"{self.workflow_template.name} - Step {self.order}: {self.name}"


class ProcurementRequest(models.Model):
    """
    เรื่องการจัดหาหนึ่งเรื่อง ที่ใช้ Workflow ใด Workflow หนึ่ง
    """

    title = models.CharField(max_length=255)
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procurement_requests",
    )
    # --- ✅ ADDED THIS LINE ---
    category = models.ForeignKey(
        ProcurementCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="procurement_requests",
    )
    workflow_template = models.ForeignKey(
        WorkflowTemplate, on_delete=models.PROTECT)
    current_step = models.ForeignKey(
        Step, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    @property
    def current_step_due_date(self):
        if self.is_completed or not self.current_step:
            return None

        # หาเวลาเริ่มต้นของขั้นตอนปัจจุบัน
        last_approval = self.history.order_by("-timestamp").first()
        start_date = (
            last_approval.timestamp.date() if last_approval else self.created_at.date()
        )

        # คำนวณวันครบกำหนด
        # คำนวณวันครบกำหนด
        duration = self.current_step.duration_days if self.current_step.duration_days is not None else 7
        return start_date + timedelta(days=duration)
        # return start_date + timedelta(days=self.current_step.duration_days)

    def __str__(self):
        return self.title


class RequestHistory(models.Model):
    """
    เก็บประวัติการอนุมัติทั้งหมดของแต่ละเรื่อง
    """

    procurement_request = models.ForeignKey(
        ProcurementRequest, related_name="history", on_delete=models.CASCADE
    )
    step = models.ForeignKey(Step, on_delete=models.CASCADE)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"'{self.procurement_request.title}' approved at step '{self.step.name}' by {self.approved_by.username}"


class ProcurementAttachment(models.Model):
    procurement_request = models.ForeignKey(
        ProcurementRequest, related_name="attachments", on_delete=models.CASCADE
    )
    history_entry = models.ForeignKey(
        RequestHistory, related_name="attachments", on_delete=models.CASCADE
    )
    file = models.FileField(upload_to="procurement_attachments/")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.file.name.split("/")[-1]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
