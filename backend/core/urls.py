# backend/core/urls.py
from django.contrib import admin
from django.urls import path, include, re_path

from django.conf import settings  # 1. Import settings
from django.conf.urls.static import static

# Import view สำเร็จรูปจากไลบรารี
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from api.views import FileDownloadView

from procurement.views_media import protected_media_serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/auth/", include("accounts.urls")),
    # เพิ่ม URL สำหรับ JWT
    # 1. Endpoint สำหรับ Login (ส่ง email, password มาแล้วได้ token กลับไป)
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    # 2. Endpoint สำหรับขอ token ใหม่ด้วย refresh token
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("download/<uuid:pk>/", FileDownloadView.as_view(), name="file-download"),
    path("api/procurement/", include("procurement.urls")),
    path('api/workflows/', include('workflows.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/logs/', include('logs.urls')),

    # re_path(r'^protected_files/(?P<path>.*)$',
    #         protected_media_serve, name='protected_media'),
    re_path(r'^media/protected/(?P<path>.*)$',
            protected_media_serve, name='protected_media'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
