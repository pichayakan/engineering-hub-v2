# backend/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department


class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "department",
        "is_staff",
        "is_active",
        "line_user_id",
        "telegram_chat_id"
    )
    list_filter = ("is_staff", "is_active", "groups", "department")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)

    # fieldsets สำหรับหน้า "แก้ไข" ผู้ใช้ที่มีอยู่แล้ว
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "employee_id",
                    "phone_number",
                    "department",
                    "line_user_id",
                    "telegram_chat_id",
                    "notify_enabled"
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_admin",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    # add_fieldsets สำหรับหน้า "สร้าง" ผู้ใช้ใหม่ผ่านหน้า Admin
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                # --- เพิ่ม 'department' เข้าไปในส่วนนี้ ---
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "department",
                    "password",
                    "password2",
                ),
            },
        ),
    )
    readonly_fields = ("last_login", "date_joined")


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "manager")
    search_fields = ("name",)
    list_filter = ("parent",)


# เราต้อง unregister UserAdmin เก่าก่อน ถ้ามีการ register ซ้ำซ้อน
# admin.site.unregister(User)
admin.site.register(User, UserAdmin)
