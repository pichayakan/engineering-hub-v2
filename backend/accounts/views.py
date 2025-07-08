# backend/accounts/views.py
from django.db.models import Count
from rest_framework import viewsets, permissions, generics, status
from django.contrib.auth import login, logout, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import User , Department # ลบ Team ออก
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserListSerializer,
    DepartmentSerializer,  # เปลี่ยนจาก TeamSerializer เป็น DepartmentSerializer
)


class RegistrationView(APIView):
    # อนุญาตให้ทุกคน (ที่ยังไม่ login) สามารถเข้าถึงได้
    permission_classes = [permissions.AllowAny]

    # กำหนดให้ View นี้รับเฉพาะคำขอแบบ POST เท่านั้น
    def post(self, request, format=None):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "message": "User registered successfully. Please wait for admin approval."
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, format=None):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(request, username=email, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                return Response(UserSerializer(user).data)
            else:
                return Response(
                    {"error": "Account not activated or is pending approval."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            return Response(
                {"error": "Invalid Credentials"}, status=status.HTTP_400_BAD_REQUEST
            )


class LogoutView(APIView):
    def post(self, request, format=None):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    queryset = User.objects.filter(is_active=True).order_by("username")
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Departments.
    """

    serializer_class = DepartmentSerializer

    # --- ส่วนที่รวมโค้ดที่ดีที่สุดเข้าด้วยกัน ---

    def get_queryset(self):
        """
        Annotates each department with the count of its members.
        """
        # ใช้ annotate เพื่อนับจำนวนสมาชิกในแต่ละ department
        return Department.objects.annotate(member_count=Count("members")).order_by(
            "name"
        )

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Allows anyone to list departments (for registration page),
        but only admins for other actions.
        """
        if self.action == "list":
            # อนุญาตให้ทุกคนสามารถ "ดู" รายชื่อ department ได้
            permission_classes = [permissions.AllowAny]
        else:
            # สำหรับการกระทำอื่นๆ ทั้งหมด (สร้าง, แก้ไข, ลบ) ต้องเป็น Admin เท่านั้น
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]
