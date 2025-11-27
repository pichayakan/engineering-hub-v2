# backend/accounts/views.py
from django.db.models import Count
from rest_framework import viewsets, permissions, generics, status
from django.contrib.auth import login, logout, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
# --- ✅ ADD THESE IMPORTS ---
from rest_framework.decorators import api_view, permission_classes
from workflows.models import ProjectWorkflow, StepStatus
from workflows.serializers import SimpleProjectWorkflowSerializer

from .models import User, Department
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserListSerializer,
    DepartmentSerializer,
    UserDetailSerializer,  # ✅ IMPORT THE NEW SERIALIZER
)


class RegistrationView(APIView):
    # ... (no changes)
    permission_classes = [permissions.AllowAny]

    def post(self, request, format=None):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully. Please wait for admin approval."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    # ... (no changes)
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
                return Response({"error": "Account not activated or is pending approval."}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"error": "Invalid Credentials"}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    # ... (no changes)
    def post(self, request, format=None):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserDetailView(APIView):
    # ... (no changes)
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request, format=None):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    # ... (no changes)
    queryset = User.objects.filter(is_active=True).order_by("username")
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    # ... (no changes)
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.annotate(member_count=Count("members")).order_by("name")

    def get_permissions(self):
        if self.action == "list":
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAdminUser]
        return [permission() for permission in permission_classes]

# --- ✅ ADD THIS NEW VIEW AT THE END OF THE FILE ---


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_profile_view(request, user_id):
    """
    Provides a detailed profile for a single user, including their work.
    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

    # Serialize the main user data
    user_data = UserDetailSerializer(user).data

    # Get workflows created by the user
    created_workflows = ProjectWorkflow.objects.filter(
        created_by=user).order_by('-created_at')

    # Get steps completed by the user
    completed_steps = StepStatus.objects.filter(
        completed_by=user, status='COMPLETED')

    # Add serialized data to the response
    user_data['created_workflows'] = SimpleProjectWorkflowSerializer(
        created_workflows, many=True).data
    user_data['completed_steps_count'] = completed_steps.count()

    return Response(user_data)
