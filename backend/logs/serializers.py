# backend/logs/serializers.py
from rest_framework import serializers
from .models import LogEntry
from accounts.serializers import UserListSerializer


class LogEntrySerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)

    class Meta:
        model = LogEntry
        fields = '__all__'
