# accounts/urls.py
from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import (
    RegistrationView,
    LoginView,
    LogoutView,
    UserDetailView,
    UserListView,
    DepartmentViewSet,
)

router = DefaultRouter()
router.register(r"departments", DepartmentViewSet, basename="department")


urlpatterns = [
    path("register/", RegistrationView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("user/", UserDetailView.as_view(), name="user-detail"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("", include(router.urls)),
]
