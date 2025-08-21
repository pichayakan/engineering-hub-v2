# backend/accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import Group
from .models import User, Department

# --- Serializers for User Management ---


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(
        style={"input_type": "password"}, write_only=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "email", "username", "first_name", "last_name", "phone_number",
            "employee_id", "department", "password", "password2",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(read_only=True)
    department_name = serializers.CharField(
        source="department.name", read_only=True, allow_null=True
    )
    groups = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name", "phone_number",
            "employee_id", "role", "is_staff", "department", "department_name", "groups",
        ]


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "phone_number"]

# --- Serializer for Department Management ---


class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "parent", "manager", "member_count"]

# --- Serializers for Dashboards & Detailed Views ---


class GroupSerializer(serializers.ModelSerializer):
    members = UserListSerializer(source="user_set", many=True, read_only=True)

    class Meta:
        model = Group
        fields = ["id", "name", "members"]


class UserDetailForHistorySerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.name", read_only=True, allow_null=True
    )
    groups = GroupSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "department_name", "groups"]

# --- ✅ ADD THIS NEW SERIALIZER FOR THE PROFILE PAGE ---


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for the new user profile page.
    """
    groups = GroupSerializer(many=True, read_only=True)
    department_name = serializers.CharField(
        source='department.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'is_staff', 'role', 'department_name', 'groups',
            'employee_id',  # ADDED
            'phone_number',  # ADDED
        ]

# --- (MemberWorkloadSerializer & DepartmentWorkloadSerializer remain unchanged) ---


class MemberWorkloadSerializer(serializers.ModelSerializer):
    total_tasks = serializers.IntegerField()
    todo_tasks = serializers.IntegerField()
    inprogress_tasks = serializers.IntegerField()
    done_tasks = serializers.IntegerField()
    accepted_tasks = serializers.IntegerField(source="accepted_tasks_count")
    pending_tasks = serializers.IntegerField(source="pending_tasks_count")

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "total_tasks", "todo_tasks",
            "inprogress_tasks", "done_tasks", "pending_tasks", "accepted_tasks",
        ]


class DepartmentWorkloadSerializer(serializers.ModelSerializer):
    members_workload = MemberWorkloadSerializer(source="members", many=True)

    class Meta:
        model = Department
        fields = ["id", "name", "members_workload"]
