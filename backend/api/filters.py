# backend/api/filters.py
from django_filters import rest_framework as filters
from .models import Task, Project
from datetime import date, timedelta


class TaskFilter(filters.FilterSet):
    # --- เพิ่มส่วนที่ขาดหายไปกลับเข้ามา ---
    date_range = filters.ChoiceFilter(
        label="Date Range",
        method="filter_by_date_range",
        choices=[
            ("today", "Today"),
            ("week", "This Week"),
            ("14days", "Last 14 Days"),
            ("month", "This Month"),
            ("year", "This Year"),
        ],
    )

    project = filters.ModelChoiceFilter(
        field_name="project", queryset=Project.objects.all()
    )
    status = filters.ChoiceFilter(choices=Task.STATUS_CHOICES)
    priority = filters.ChoiceFilter(choices=Task.PRIORITY_CHOICES)

    class Meta:
        model = Task
        # เพิ่มชื่อ fields ใหม่เข้าไป
        fields = ["date_range", "project", "status", "priority"]

    def filter_by_date_range(self, queryset, name, value):
        today = date.today()
        if value == "today":
            return queryset.filter(created_at__date=today)
        elif value == "week":
            start_of_week = today - timedelta(days=today.weekday())
            return queryset.filter(created_at__date__gte=start_of_week)
        elif value == "14days":
            fourteen_days_ago = today - timedelta(days=14)
            return queryset.filter(created_at__date__gte=fourteen_days_ago)
        elif value == "month":
            return queryset.filter(
                created_at__year=today.year, created_at__month=today.month
            )
        elif value == "year":
            return queryset.filter(created_at__year=today.year)
        return queryset
