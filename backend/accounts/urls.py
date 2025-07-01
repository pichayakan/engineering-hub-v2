# accounts/urls.py
from django.urls import path
from .views import (
    RegistrationView,
    LoginView,
    LogoutView,
    UserDetailView,
    UserListView,  # <-- Import View ใหม่
)

urlpatterns = [
    path("register/", RegistrationView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("user/", UserDetailView.as_view(), name="user-detail"),
    path("users/", UserListView.as_view(), name="user-list"),  # <-- เพิ่ม URL ใหม่นี้
]
