# backend/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "username",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
    )
    list_filter = ("is_staff", "is_active", "groups")
    search_fields = ("email", "username", "first_name", "last_name")
    ordering = ("email",)

    # --- ส่วนที่แก้ไข ---
    # 1. ประกาศว่าฟิลด์เหล่านี้ให้อ่านได้อย่างเดียว
    readonly_fields = ("last_login", "date_joined")

    # 2. ตอนนี้เราสามารถใส่ฟิลด์เหล่านี้ใน fieldsets ได้อย่างปลอดภัย
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {"fields": ("first_name", "last_name", "employee_id", "phone_number")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_admin",
                    "is_superadmin",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "date_joined")},
        ),  # <-- ตอนนี้จะแสดงผลได้อย่างถูกต้อง
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "password",
                    "password2",
                ),
            },
        ),
    )


admin.site.register(User, UserAdmin)
