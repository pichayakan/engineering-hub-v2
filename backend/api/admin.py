# backend/api/admin.py
from django.contrib import admin
from .models import (
    Project,
    Task,
    Comment,
    ProjectAttachment,
    TaskAttachment,
    Activity,
    SharedFile,
    Announcement,
    CalendarEvent,  # 1. Import Models ใหม่
    AnnouncementAttachment,
    CalendarEventAttachment,
    FileCategory,
    TaskTemplate,
)


# --- สร้าง Inline classes ---
class AnnouncementAttachmentInline(admin.TabularInline):
    model = AnnouncementAttachment
    extra = 1


class CalendarEventAttachmentInline(admin.TabularInline):
    model = CalendarEventAttachment
    extra = 1


# --- อัปเดต Admin classes เดิม ---
@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "created_at", "is_pinned")
    inlines = [AnnouncementAttachmentInline]


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ("title", "start_time", "end_time", "created_by")
    inlines = [CalendarEventAttachmentInline]
    filter_horizontal = ("participants",)


@admin.register(FileCategory)
class FileCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description")


@admin.register(TaskTemplate)
class TaskTemplateAdmin(admin.ModelAdmin):
    """
    Admin View for Task Templates.
    """

    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "subject_template", "body_template")


# คุณสามารถเพิ่ม category เข้าไปในหน้า admin ของ SharedFile ได้ด้วย
# @admin.register(SharedFile)
# class SharedFileAdmin(admin.ModelAdmin):
#     list_display = ('title', 'category', 'uploaded_by', 'uploaded_at')
#     list_filter = ('category', 'uploaded_by')

# หมายเหตุ: คุณสามารถลงทะเบียน Model อื่นๆ ที่นี่ได้เช่นกันถ้าต้องการ
# admin.site.register(Project)
# admin.site.register(Task)
# admin.site.register(SharedFile)
