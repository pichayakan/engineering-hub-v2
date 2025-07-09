# backend/api/filters.py
from django_filters import rest_framework as filters
from .models import Task
from datetime import date, timedelta


class TaskFilter(filters.FilterSet):
    # สร้าง Filter field ใหม่ชื่อ 'date_range'
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

    class Meta:
        model = Task
        fields = ["date_range"]

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
