# backend/api/permissions.py
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the project.
        # obj ในที่นี้คือ Project instance
        return obj.owner == request.user

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read-only access to any authenticated user,
    but write access only to admin users.
    """

    def has_permission(self, request, view):
        # อนุญาตให้ดูข้อมูล (GET, HEAD, OPTIONS) ได้สำหรับผู้ใช้ที่ login ทุกคน
        if request.method in permissions.SAFE_METHODS:
            return True

        # อนุญาตให้เขียน/แก้ไข/ลบข้อมูลได้เฉพาะผู้ใช้ที่เป็น staff (Admin)
        return request.user and request.user.is_staff