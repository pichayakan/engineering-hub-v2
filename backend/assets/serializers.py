# backend/assets/serializers.py

from rest_framework import serializers
from .models import SurveyCampaign, AssetRequest
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
