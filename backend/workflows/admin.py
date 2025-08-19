# workflows/admin.py
from django.contrib import admin
from .models import ProjectWorkflow, StepStatus


class StepStatusInline(admin.TabularInline):
    """
    แสดงรายการสถานะของแต่ละ Step ในหน้า ProjectWorkflow โดยตรง
    """
    model = StepStatus
    fields = ('step', 'status', 'completed_by', 'completed_at')
    readonly_fields = ('step',)  # ไม่ให้แก้ไข step template
    extra = 0  # ไม่ต้องแสดงช่องว่างสำหรับสร้างใหม่
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False  # ไม่อนุญาตให้เพิ่ม StepStatus ผ่านหน้า admin


@admin.register(ProjectWorkflow)
class ProjectWorkflowAdmin(admin.ModelAdmin):
    list_display = ('title', 'template', 'created_by',
                    'created_at', 'is_completed')
    list_filter = ('template', 'is_completed')
    inlines = [StepStatusInline]


@admin.register(StepStatus)
class StepStatusAdmin(admin.ModelAdmin):
    """
    หน้าสำหรับดู/แก้ไข StepStatus แต่ละรายการโดยตรง
    """
    list_display = ('workflow', 'step', 'status',
                    'completed_by', 'completed_at')
    list_filter = ('status',)
    search_fields = ('workflow__title', 'step__name')
