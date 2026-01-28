import os
from django.conf import settings
from django.http import FileResponse, Http404

# ❌ ลบอันเก่าออก
# from django.contrib.auth.decorators import login_required

# ✅ 1. Import ของใหม่จาก DRF
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

# ✅ 2. เปลี่ยน Decorator ให้รองรับ API และ JWT


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def protected_media_serve(request, path):
    document_root = os.path.join(settings.MEDIA_ROOT, 'protected')
    fullpath = os.path.join(document_root, path)

    if not os.path.exists(fullpath):
        raise Http404("File not found")

    return FileResponse(open(fullpath, 'rb'), as_attachment=False)
