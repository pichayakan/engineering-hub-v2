# workflows/admin.py
from django.contrib import admin
from .models import ProjectWorkflow, StepStatus, WorkflowCategory


class StepStatusInline(admin.TabularInline):
    """
    แสดงรายการสถานะของแต่ละ Step ในหน้า ProjectWorkflow โดยตรง
    """
    model = StepStatus

    # ✅ 1. เพิ่ม 'duration_override' และ 'due_date' ใน fields
    fields = ('step', 'status', 'duration_override',
              'due_date', 'completed_by', 'completed_at')

    # ✅ 2. ทำให้ 'duration_override' แก้ไขได้
    # (โดยการไม่ใส่ 'duration_override' ลงใน readonly_fields)
    readonly_fields = ('step', 'due_date', 'completed_by', 'completed_at')

    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False  # ไม่อนุญาตให้เพิ่ม StepStatus ผ่านหน้า admin


@admin.register(WorkflowCategory)
class WorkflowCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')


@admin.register(ProjectWorkflow)
class ProjectWorkflowAdmin(admin.ModelAdmin):
    list_display = ('title', 'template', 'created_by',
                    'created_at', 'is_completed')
    list_filter = ('category', 'template', 'is_completed')
    inlines = [StepStatusInline]


@admin.register(StepStatus)
class StepStatusAdmin(admin.ModelAdmin):
    """
    หน้าสำหรับดู/แก้ไข StepStatus แต่ละรายการโดยตรง
    """
    # ✅ 3. เพิ่ม 'duration_override' และ 'due_date' เข้าไปใน list_display
    list_display = ('workflow', 'step', 'status',
                    'duration_override', 'due_date',
                    'completed_by', 'completed_at')

    list_filter = ('status',)
    search_fields = ('workflow__title', 'step__name')

    # ✅ 4. (ทางเลือก) ทำให้ฟิลด์นี้แก้ไขได้โดยตรงจากหน้า List
    list_editable = ('duration_override',)
