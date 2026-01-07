import django_filters
from .models import ProcurementRequest


class ProcurementRequestFilter(django_filters.FilterSet):
    # กรองตามช่วงวันที่สร้าง (Created At)
    created_year = django_filters.NumberFilter(
        field_name='created_at', lookup_expr='year')
    created_month = django_filters.NumberFilter(
        field_name='created_at', lookup_expr='month')
    created_day = django_filters.NumberFilter(
        field_name='created_at', lookup_expr='day')

    # กรองตามช่วงวันที่ (Start - End)
    start_date = django_filters.DateFilter(
        field_name='created_at', lookup_expr='gte')
    end_date = django_filters.DateFilter(
        field_name='created_at', lookup_expr='lte')

    # กรองข้อความ (Search)
    title = django_filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = ProcurementRequest
        fields = [
            'is_completed',
            'is_cancelled',
            'category',
            'project',
            'requesting_department',
            'created_year',
            'created_month',
            'created_day'
        ]
