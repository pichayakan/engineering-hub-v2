# accounts/serializers.py
from rest_framework import serializers
from .models import User


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
        ]


class UserListSerializer(serializers.ModelSerializer):
    """
    A lightweight serializer for listing users.
    """

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]