# backend/procurement/admin.py
from django.contrib import admin
from .models import WorkflowTemplate, Step, ProcurementRequest, RequestHistory


class StepInline(admin.TabularInline):
    """
    Allows editing Steps directly within the WorkflowTemplate admin page.
    """

    model = Step
    extra = 1  # Show 1 empty slot for a new step by default
    fields = ("order", "name", "responsible_group", "duration_days")


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "is_active")
    inlines = [StepInline]  # Embed the Step editor


@admin.register(ProcurementRequest)
class ProcurementRequestAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "workflow_template",
        "current_step",
        "created_by",
        "is_completed",
    )
    list_filter = ("workflow_template", "is_completed", "current_step")


# Register other models if you want to see them in admin
admin.site.register(RequestHistory)
