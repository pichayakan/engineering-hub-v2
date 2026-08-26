# backend/assets/admin.py

from django.contrib import admin
from .models import SurveyCampaign, AssetRequest, AnnualEquipment


@admin.register(SurveyCampaign)
class SurveyCampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'year', 'is_active', 'created_at')
    list_filter = ('year', 'is_active')
    search_fields = ('name',)
    ordering = ('-year',)


@admin.register(AssetRequest)
class AssetRequestAdmin(admin.ModelAdmin):
    list_display = (
        'category',
        'location_name',
        'province',
        'condition',
        'status',
        'campaign',
        'age_display'  # โชว์อายุ (คำนวณจาก property)
    )
    list_filter = (
        'campaign',
        'status',
        'category',
        'condition',
        'province',
        'location_type'
    )
    search_fields = (
        'location_name',
        'asset_number',
        'province',
        'created_by__username'
    )
    readonly_fields = ('created_at', 'updated_at')

    # จัดกลุ่ม field ให้ดูง่ายเวลาคลิกเข้าไปดูรายละเอียด
    fieldsets = (
        ('Campaign Info', {
            'fields': ('campaign', 'status', 'created_by')
        }),
        ('Location', {
            'fields': ('province', 'location_type', 'location_name')
        }),
        ('Asset Details', {
            'fields': (
                'category',
                'asset_number',
                'brand_model',
                'install_year'
            )
        }),
        ('Justification & Evidence', {
            'fields': (
                'condition',
                'customer_impact',
                'reason',
                'image_1',
                'image_2'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)  # ซ่อนไว้ถ้าไม่คลิกเปิด
        }),
    )

    def age_display(self, obj):
        return f"{obj.age} ปี"
    age_display.short_description = "Age"


@admin.register(AnnualEquipment)
class AnnualEquipmentAdmin(admin.ModelAdmin):
    list_display = ('asset_number', 'description', 'cost_center',
                    'department', 'current_status', 'fiscal_year')
    search_fields = ('asset_number', 'description', 'cost_center')
    list_filter = ('fiscal_year', 'current_status', 'department')
