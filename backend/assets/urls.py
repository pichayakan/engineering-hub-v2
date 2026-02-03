from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SurveyCampaignViewSet, AssetRequestViewSet

# สร้าง Router สำหรับ Assets
router = DefaultRouter()
router.register(r'campaigns', SurveyCampaignViewSet,
                basename='survey-campaign')
router.register(r'requests', AssetRequestViewSet, basename='asset-request')

urlpatterns = [
    path('', include(router.urls)),
]
