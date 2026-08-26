# backend/assets/serializers.py

from rest_framework import serializers
# ✅ เพิ่ม AnnualEquipment เข้ามาใน import
from .models import SurveyCampaign, AssetRequest, AnnualEquipment
from accounts.serializers import UserSerializer


class SurveyCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyCampaign
        fields = '__all__'


class AssetRequestSerializer(serializers.ModelSerializer):
    # Field พิเศษที่ดึงค่าจาก Property หรือ Relation
    age = serializers.ReadOnlyField()  # ✅ ดึงจาก @property age ใน Model
    department_name = serializers.CharField(
        source='department.name', read_only=True)  # ✅ ดึงชื่อแผนก
    created_by_name = serializers.CharField(
        source='created_by.username', read_only=True)

    class Meta:
        model = AssetRequest
        fields = [
            'id', 'campaign', 'category', 'request_type',
            'location_type', 'location_name',
            'brand_model', 'asset_number',
            'install_year', 'age',  # ✅ ส่งอายุไปด้วย
            'condition', 'customer_impact', 'reason',
            'image_1', 'image_2',
            'status',
            'created_by', 'created_by_name',
            'department', 'department_name',  # ✅ เพิ่มแผนก
            'province',  # ✅ เพิ่มจังหวัด (Snapshot)
            'air_type', 'air_btu', 'battery_amp',
            'ups_kva', 'rectifier_amp',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'created_by',
                            'age', 'department', 'province']

# --- ✅ เพิ่ม Serializer สำหรับระบบสำรวจครุภัณฑ์ประจำปี ---


class AnnualEquipmentSerializer(serializers.ModelSerializer):
    image_current = serializers.ImageField(required=False, allow_null=True)
    document_file = serializers.FileField(required=False, allow_null=True)
    department_name = serializers.CharField(
        # ส่งชื่อแผนก/จังหวัดไปให้หน้าเว็บแสดงผลด้วย
        source='department.name', read_only=True)

    last_updated_by_name = serializers.CharField(
        source='last_updated_by.email', read_only=True)

    class Meta:
        model = AnnualEquipment
        fields = '__all__'
        # ล็อกฟิลด์เหล่านี้ไว้ไม่ให้จังหวัดแก้ไขได้ ให้แก้ได้แค่สถานะและหมายเหตุ
        read_only_fields = [
            'fiscal_year', 'asset_class', 'asset_number',
            'description', 'cap_date', 'cost_center',
            'fund_center', 'apc_value', 'book_value', 'department', 'last_updated_by'
        ]
