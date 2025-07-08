# backend/accounts/serializers.py
from rest_framework import serializers
from .models import User, Department  # แก้ไข import

# --- Serializers สำหรับ User ---


class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={"input_type": "password"}, write_only=True)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "first_name",
            "last_name",
            "phone_number",
            "employee_id",
            "department",
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

    # --- ส่วนที่แก้ไข ---
    def create(self, validated_data):
        # นำ password และ password2 ออกจาก dict
        validated_data.pop("password2")
        password = validated_data.pop("password")

        # สร้าง user โดยส่ง password แยกต่างหาก
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(read_only=True)
    # เพิ่มฟิลด์นี้เพื่อส่งชื่อ Department ไปด้วย
    department_name = serializers.CharField(
        source="department.name", read_only=True, allow_null=True
    )

    class Meta:
        model = User
        # ตรวจสอบให้แน่ใจว่ามี 'department' และ 'department_name' อยู่ใน fields
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
            "department",
            "department_name",
        ]


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name","phone_number"]


# --- Serializer สำหรับ Department ---


class DepartmentSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Department
        fields = ["id", "name", "parent", "manager", "member_count"]


# --- Serializer สำหรับ Dashboard ---


class MemberWorkloadSerializer(serializers.ModelSerializer):
    total_tasks = serializers.IntegerField()
    todo_tasks = serializers.IntegerField()
    inprogress_tasks = serializers.IntegerField()
    done_tasks = serializers.IntegerField()
    accepted_tasks = serializers.IntegerField(source='accepted_tasks_count')
    pending_tasks = serializers.IntegerField(source='pending_tasks_count')

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 
            'total_tasks', 'todo_tasks', 'inprogress_tasks', 'done_tasks',
            'pending_tasks', 'accepted_tasks'
        ]

class DepartmentWorkloadSerializer(serializers.ModelSerializer):
    members_workload = MemberWorkloadSerializer(source='members', many=True)
    class Meta:
        model = Department
        fields = ['id', 'name', 'members_workload']


class AssignerPerformanceSerializer(serializers.ModelSerializer):
    # เราจะย้ายคำจำกัดความนี้ไปที่ api/serializers.py เพื่อหลีกเลี่ยง Circular Import
    # created_tasks_details = TaskForAssignerSerializer(source='created_tasks', many=True)
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]  # Simplified for now
