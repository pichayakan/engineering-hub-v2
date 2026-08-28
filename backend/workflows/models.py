# workflows/models.py
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from procurement.models import WorkflowTemplate, Step
from datetime import date, timedelta
import os
from django.db.models import Q


class WorkflowCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Workflow Category"
        verbose_name_plural = "Workflow Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class ProjectWorkflow(models.Model):
    title = models.CharField(max_length=255)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.PROTECT,
        help_text="แม่แบบที่โปรเจกต์นี้จะใช้"
    )
    category = models.ForeignKey(
        WorkflowCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workflows",
        verbose_name="Workflow Category"
    )
    pr_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="เลขที่ PR"
    )
    budget_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="วงเงินงบประมาณ"
    )
    fiscal_year = models.IntegerField(
        blank=True,
        null=True,
        verbose_name="ปีงบประมาณ"
    )
    start_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="วันที่โปรเจกต์เสร็จสิ้น"
    )
    handlers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="handled_workflows",
        verbose_name="ผู้รับผิดชอบงาน"
    )

    # --- ✅ THIS IS THE CORRECTED FUNCTION ---
    def recalculate_due_dates(self):
        """Helper method to recalculate all step due dates based on the start_date."""
        if not self.start_date:
            return  # Don't calculate if there is no start date

        last_due_date = self.start_date
        statuses_to_update = list(
            self.step_statuses.all().order_by('step__order'))

        for status in statuses_to_update:
            # 1. ตรวจสอบว่ามีค่า override หรือไม่
            if status.duration_override is not None:
                duration = status.duration_override
            # 2. ถ้าไม่มี ให้ใช้ค่าจาก Template
            else:
                duration = status.step.duration_days if status.step.duration_days is not None else 0

            new_due_date = add_workdays(last_due_date, duration)
            status.due_date = new_due_date
            last_due_date = new_due_date

        StepStatus.objects.bulk_update(statuses_to_update, ['due_date'])

    def save(self, *args, **kwargs):
        # Check if this is an existing object and if its start_date is being changed
        is_update = self.pk is not None
        if is_update:
            try:
                old_instance = ProjectWorkflow.objects.get(pk=self.pk)
                if old_instance.start_date != self.start_date:
                    # If start_date has changed, save the object first, then recalculate
                    super().save(*args, **kwargs)
                    self.recalculate_due_dates()
                    return  # Exit to avoid saving twice
            except ProjectWorkflow.DoesNotExist:
                pass  # Should not happen on an update

        # Default save for new objects or updates without start_date change
        super().save(*args, **kwargs)

    @property
    def total_step_count(self):
        return self.template.steps.count()

    @property
    def latest_completed_step(self):
        """คืนค่า StepStatus ล่าสุดที่มีสถานะเป็น COMPLETED"""
        return self.step_statuses.filter(
            status='COMPLETED'
        ).order_by('-step__order').first()

    @property
    def completed_step_count(self):
        # --- ✅ ไอเดียเพิ่มเติมจากผม (Safety Check) ---
        # 1. ถ้าโปรเจกต์ถูกบังคับให้จบ (is_completed = True)
        # ให้ Progress เต็ม 100% เสมอ (โดยคืนค่า total_step_count)
        if self.is_completed:
            return self.total_step_count

        # --- 💡 ไอเดียหลักของคุณ ---
        # 2. ค้นหา Step ที่มีสถานะ "COMPLETED" และมีลำดับ (order) สูงที่สุด
        latest_completed_status = self.step_statuses.filter(
            Q(status='COMPLETED') | Q(status='IN_PROGRESS')
            # .first() จะดึงอันที่ลำดับมากที่สุด
        ).order_by('-step__order').first()

        # 3. ถ้าเจอ ให้คืน "ลำดับ" ของ Step นั้น (เช่น 15)
        if latest_completed_status:
            return latest_completed_status.step.order

        # 4. ถ้ายังไม่มี Step ไหนเสร็จเลย ให้คืนค่า 0
        return 0

    @property
    def current_step(self):
        in_progress_step = self.step_statuses.filter(
            status='IN_PROGRESS').order_by('step__order').first()
        if in_progress_step:
            return in_progress_step
        pending_step = self.step_statuses.filter(
            status='PENDING').order_by('step__order').first()
        if pending_step:
            return pending_step
        return None

    def __str__(self):
        return self.title


class StepStatus(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        SKIPPED = 'SKIPPED', 'Skipped'
    workflow = models.ForeignKey(
        ProjectWorkflow, related_name="step_statuses", on_delete=models.CASCADE)
    step = models.ForeignKey(Step, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    actual_completed_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="วันที่ปิดงานจริง"
    )
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    duration_override = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="ระยะเวลาที่กำหนดเอง (วัน)"
    )

    class Meta:
        ordering = ['step__order']
        unique_together = ('workflow', 'step')

    def __str__(self):
        return f"{self.workflow.title} - Step: {self.step.name} ({self.status})"


class StepAttachment(models.Model):
    step_status = models.ForeignKey(
        StepStatus, related_name="attachments", on_delete=models.CASCADE)
    file = models.FileField(upload_to="workflow_attachments/")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    def __bool__(self):
        return self.name


def add_workdays(start_date, days_to_add):
    current_date = start_date
    while days_to_add > 0:
        current_date += timedelta(days=1)
        if current_date.weekday() < 5:
            days_to_add -= 1
    return current_date

# --- ✅ THIS IS THE SIMPLIFIED RECEIVER ---


@receiver(post_save, sender=ProjectWorkflow)
def create_and_schedule_step_statuses(sender, instance, created, **kwargs):
    if created:
        # 1. Create all StepStatus objects
        steps_in_template = instance.template.steps.all().order_by('order')
        step_statuses_to_create = [StepStatus(
            workflow=instance, step=step) for step in steps_in_template]
        StepStatus.objects.bulk_create(step_statuses_to_create)

        # 2. Trigger the one, correct calculation function
        # (It will check for start_date internally)
        instance.recalculate_due_dates()
