# workflows/models.py
from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from procurement.models import WorkflowTemplate, Step
import os  # ✅ IMPORT


class ProjectWorkflow(models.Model):
    # ... (no changes in this model)
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return self.title


class StepStatus(models.Model):
    # ... (no changes in this model)
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
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['step__order']
        unique_together = ('workflow', 'step')

    def __str__(self):
        return f"{self.workflow.title} - Step: {self.step.name} ({self.status})"

# --- ✅ ADD THIS NEW MODEL ---


class StepAttachment(models.Model):
    """
    Stores files attached to a specific StepStatus.
    """
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

    def __str__(self):
        return self.name


@receiver(post_save, sender=ProjectWorkflow)
def create_step_statuses_for_new_workflow(sender, instance, created, **kwargs):
    # ... (no changes in this function)
    if created:
        steps_to_create = []
        all_steps_in_template = instance.template.steps.all()
        for step in all_steps_in_template:
            steps_to_create.append(StepStatus(workflow=instance, step=step))
        StepStatus.objects.bulk_create(steps_to_create)
