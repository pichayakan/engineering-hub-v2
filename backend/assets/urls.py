# assets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
# ✅ 1. เพิ่ม AnnualEquipmentViewSet เข้ามาตรงนี้
from .views import SurveyCampaignViewSet, AssetRequestViewSet, AnnualEquipmentViewSet

# สร้าง Router สำหรับ Assets
router = DefaultRouter()
router.register(r'campaigns', SurveyCampaignViewSet,
                basename='survey-campaign')
router.register(r'requests', AssetRequestViewSet, basename='asset-request')

# ✅ 2. ลงทะเบียน Route ใหม่สำหรับสำรวจครุภัณฑ์ประจำปี
router.register(r'annual-equipments', AnnualEquipmentViewSet,
                basename='annual-equipment')

urlpatterns = [
    path('', include(router.urls)),
]
