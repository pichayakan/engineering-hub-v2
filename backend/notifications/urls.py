# notifications/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views  # ✅ Import แบบนี้เพื่อแก้ปัญหา Circular Import

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')

urlpatterns = [
    # ✅ เรียกผ่าน views.line_webhook
    path('line-webhook/', views.line_webhook, name='line-webhook'),

    # Router Paths
    path('', include(router.urls)),
]
