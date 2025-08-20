# backend/procurement/admin.py
from django.contrib import admin
from .models import (
    WorkflowTemplate,
    Step,
    ProcurementRequest,
    RequestHistory,
    ProcurementCategory  # ✅ IMPORTED
)


# --- ✅ ADDED THIS ADMIN CLASS ---
@admin.register(ProcurementCategory)
class ProcurementCategoryAdmin(admin.ModelAdmin):
    """
    Admin interface for managing procurement categories.
    """
    list_display = ("name", "description")
    search_fields = ("name",)


class StepInline(admin.TabularInline):
    """
    Allows editing Steps directly within the WorkflowTemplate admin page.
    """
    model = Step
    extra = 1  # Show 1 empty slot for a new step by default
    fields = ("order", "name", "responsible_groups", "duration_days")
    filter_horizontal = ("responsible_groups",)


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "is_active")
    inlines = [StepInline]  # Embed the Step editor


@admin.register(ProcurementRequest)
class ProcurementRequestAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "category",  # ✅ ADDED
        "project",
        "workflow_template",
        "current_step",
        "created_by",
        "is_completed",
    )
    list_filter = (
        "category",  # ✅ ADDED
        "workflow_template",
        "is_completed",
        "current_step"
    )
    # ✅ ADDED CATEGORY SEARCH
    search_fields = ("title", "project__name", "category__name")
    # Optional: Makes ForeignKey fields easier to select
    raw_id_fields = ("project", "category", "created_by")


# Register other models if you want to see them in admin
admin.site.register(RequestHistory)
