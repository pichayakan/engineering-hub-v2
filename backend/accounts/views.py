# accounts/views.py
from django.contrib.auth import login, logout, authenticate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions , generics, viewsets
from .serializers import UserSerializer, UserRegistrationSerializer , UserListSerializer ,TeamSerializer
from .models import User,Team
from api.permissions import IsAdminOrReadOnly


class RegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

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
    """
    View to list all active users in the system.
    """

    queryset = User.objects.filter(is_active=True).order_by("username")
    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]


class TeamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing teams. (Typically for admins)
    """

    queryset = Team.objects.all().order_by("name")
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]