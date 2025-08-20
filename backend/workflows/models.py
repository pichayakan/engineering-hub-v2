# workflows/models.py
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from procurement.models import WorkflowTemplate, Step
from datetime import date, timedelta
import os

class ProjectWorkflow(models.Model):
    title = models.CharField(max_length=255)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.PROTECT,
        help_text="แม่แบบที่โปรเจกต์นี้จะใช้"
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
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    @property
    def total_step_count(self):
        return self.template.steps.count()

    @property
    def completed_step_count(self):
        return self.step_statuses.filter(status='COMPLETED').count()

    @property
    def current_step(self):
        in_progress_step = self.step_statuses.filter(status='IN_PROGRESS').order_by('step__order').first()
        if in_progress_step:
            return in_progress_step
        pending_step = self.step_statuses.filter(status='PENDING').order_by('step__order').first()
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
    workflow = models.ForeignKey(ProjectWorkflow, related_name="step_statuses", on_delete=models.CASCADE)
    step = models.ForeignKey(Step, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.PENDING)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    class Meta:
        ordering = ['step__order']
        unique_together = ('workflow', 'step')
    def __str__(self):
        return f"{self.workflow.title} - Step: {self.step.name} ({self.status})"

class StepAttachment(models.Model):
    step_status = models.ForeignKey(StepStatus, related_name="attachments", on_delete=models.CASCADE)
    file = models.FileField(upload_to="workflow_attachments/")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=255, blank=True)
    def save(self, *args, **kwargs):
        if not self.name:
            self.name = os.path.basename(self.file.name)
        super().save(*args, **kwargs)
    def __str__(self):
        return self.name

def add_workdays(start_date, days_to_add):
    current_date = start_date
    while days_to_add > 0:
        current_date += timedelta(days=1)
        if current_date.weekday() < 5:
            days_to_add -= 1
    return current_date

# --- ✅ THIS FUNCTION HAS BEEN CORRECTED ---
@receiver(post_save, sender=ProjectWorkflow)
def create_and_schedule_step_statuses(sender, instance, created, **kwargs):
    if created:
        steps_in_template = instance.template.steps.all().order_by('order')
        step_statuses_to_create = [StepStatus(workflow=instance, step=step) for step in steps_in_template]
        StepStatus.objects.bulk_create(step_statuses_to_create)

        # ✅ ADD THIS CHECK: Only run scheduling if there is a start date.
        if instance.start_date:
            last_due_date = instance.start_date
            created_statuses = instance.step_statuses.all().order_by('step__order')
            
            for status in created_statuses:
                duration = status.step.duration_days if status.step.duration_days is not None else 0
                new_due_date = add_workdays(last_due_date, duration)
                status.due_date = new_due_date
                last_due_date = new_due_date
            
            StepStatus.objects.bulk_update(created_statuses, ['due_date'])