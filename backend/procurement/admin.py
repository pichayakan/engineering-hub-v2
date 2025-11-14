# backend/procurement/admin.py
from django.contrib import admin
from .models import (
    WorkflowTemplate,
    Step,
    ProcurementRequest,
    RequestHistory,
    ProcurementCategory,
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
    fields = ("order", "name", "responsible_groups",
              "duration_days", "is_signature_required", "requires_document_number", "requires_attachment")
    filter_horizontal = ("responsible_groups",)


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "template_type", "description", "is_active")
    list_filter = ("template_type", "is_active")
    search_fields = ("name",)
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
        "is_cancelled",
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


@admin.register(RequestHistory)
class RequestHistoryAdmin(admin.ModelAdmin):
    """
    Admin interface for viewing approval history.
    """
    # --- กำหนด field ที่จะแสดงในหน้า List View ---
    list_display = (
        'procurement_request',
        'step',
        'approved_by',
        'timestamp',
        'document_number'  # ✅ เพิ่ม document_number ที่นี่
    )

    # --- เพิ่ม Filter ด้านข้าง ---
    list_filter = ('step', 'action')

    # --- เพิ่มช่องค้นหา ---
    search_fields = (
        'procurement_request__title',  # ค้นหาจากชื่องานหลัก
        'document_number',           # ค้นหาจากเลขที่เอกสาร
        'notes'
    )

    # ทำให้ field ที่เป็น ForeignKey แสดงผลได้ดีขึ้น
    raw_id_fields = ('procurement_request', 'approved_by')

    def has_change_permission(self, request, obj=None):
        # ป้องกันการแก้ไขข้อมูล History โดยตรงจากหน้า Admin
        return False

    def has_add_permission(self, request):
        # ป้องกันการสร้าง History โดยตรงจากหน้า Admin
        return False
