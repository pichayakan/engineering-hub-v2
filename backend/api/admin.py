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


# หมายเหตุ: คุณสามารถลงทะเบียน Model อื่นๆ ที่นี่ได้เช่นกันถ้าต้องการ
# admin.site.register(Project)
# admin.site.register(Task)
# admin.site.register(SharedFile)
