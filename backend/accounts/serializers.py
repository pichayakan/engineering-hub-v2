# accounts/serializers.py
from rest_framework import serializers
from .models import User, Team


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={"input_type": "password"}, write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "first_name",
            "last_name",
            "phone_number",
            "employee_id",
            "password",
            "password2",
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
        user = User.objects.create_user(**validated_data)
        # ไม่ต้อง set_password ซ้ำซ้อน เพราะ create_user ของเราจัดการให้แล้ว
        # และ is_active จะเป็น False โดยอัตโนมัติตาม default ของ model
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "phone_number",
            "employee_id",
            "role",
            "is_staff",
        ]


class UserListSerializer(serializers.ModelSerializer):
    """
    A lightweight serializer for listing users.
    """

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class TeamSerializer(serializers.ModelSerializer):
    # แสดงรายละเอียดของสมาชิกในทีม
    members_details = UserListSerializer(source="members", many=True, read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "description", "members", "members_details"]
        extra_kwargs = {"members": {"write_only": True, "required": False}}

class MemberWorkloadSerializer(serializers.ModelSerializer):
    """
    Serializer for showing individual member's task stats.
    """

    # ใช้ source เพื่อบอกให้ serializer ดึงข้อมูลจาก attribute ที่เราตั้งชื่อใหม่
    total_tasks = serializers.IntegerField()
    todo_tasks = serializers.IntegerField()
    inprogress_tasks = serializers.IntegerField()
    done_tasks = serializers.IntegerField()
    accepted_tasks = serializers.IntegerField(source="accepted_tasks_count")
    pending_tasks = serializers.IntegerField(source="pending_tasks_count")

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "total_tasks",
            "todo_tasks",
            "inprogress_tasks",
            "done_tasks",
            "pending_tasks",
            "accepted_tasks",
        ]


class TeamWorkloadSerializer(serializers.ModelSerializer):
    """
    Serializer for showing team details along with its members' workload.
    """

    members_workload = MemberWorkloadSerializer(source="members", many=True)

    class Meta:
        model = Team
        fields = ["id", "name", "members_workload"]