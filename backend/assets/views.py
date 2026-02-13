# backend/assets/views.py

import csv
import datetime
from django.http import HttpResponse
from django.db.models import Count, Q
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from accounts.models import Department
from .models import SurveyCampaign, AssetRequest
from .serializers import SurveyCampaignSerializer, AssetRequestSerializer

# ✅ Helper function: เช็คว่าเป็น Admin หรือ Group 'AssetAdmin'


def is_admin_or_asset_admin(user):
    return (
        user.is_superuser or
        user.is_staff or
        user.groups.filter(name='AssetAdmin').exists()
    )


class SurveyCampaignViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SurveyCampaign.objects.filter(is_active=True)
    serializer_class = SurveyCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        # ... (โค้ดเดิม ไม่ต้องแก้) ...
        try:
            campaign = self.get_object()
            if hasattr(campaign, 'assets'):
                qs = campaign.assets.all()
            else:
                qs = campaign.assetrequest_set.all()

            status_counts = list(
                qs.values('status').annotate(count=Count('status')))
            category_counts = list(
                qs.values('category').annotate(count=Count('category')))
            province_counts = list(qs.values('province').annotate(
                total=Count('id'),
                submitted=Count('id', filter=Q(status='SUBMITTED')),
                approved=Count('id', filter=Q(status='APPROVED'))
            ).order_by('-total'))

            return Response({
                'campaign': campaign.name,
                'status_summary': status_counts,
                'category_summary': category_counts,
                'province_summary': province_counts
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        # ... (โค้ดเดิมส่วน campaign/assets) ...
        try:
            campaign = self.get_object()
            if hasattr(campaign, 'assets'):
                assets = campaign.assets.all().select_related(
                    'created_by', 'department').order_by('department', 'created_at')
            else:
                assets = campaign.assetrequest_set.all().select_related(
                    'created_by', 'department').order_by('department', 'created_at')

            # ✅ แก้ไขจุดที่ 1: ใช้ Helper Function เช็คสิทธิ์แทน is_staff
            if not is_admin_or_asset_admin(request.user):
                if request.user.department:
                    assets = assets.filter(department=request.user.department)
                else:
                    assets = assets.filter(created_by=request.user)

            # ... (โค้ดสร้าง CSV เดิมทั้งหมด จนจบฟังก์ชัน) ...
            response = HttpResponse(content_type='text/csv')
            filename = f"assets_campaign_{pk}_{datetime.date.today()}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response.write(u'\ufeff'.encode('utf8'))
            writer = csv.writer(response)

            # (ใส่ Header และ Loop Write Row เหมือนเดิม)
            writer.writerow(['ID', 'Request Type', 'Department', 'Province', 'User', 'Status', 'Category', 'Sub-Type', 'Spec', 'Location Type', 'Location Name',
                            'Brand/Model', 'Asset No.', 'Install Year', 'Age', 'Condition', 'Impact', 'Reason', 'Image 1', 'Image 2', 'Created At', 'Updated At'])

            for asset in assets:
                # ... (Logic เตรียมข้อมูลเหมือนเดิม) ...
                dept_name = asset.department.name if asset.department else "-"
                img1 = request.build_absolute_uri(
                    asset.image_1.url) if asset.image_1 else ""
                img2 = request.build_absolute_uri(
                    asset.image_2.url) if asset.image_2 else ""
                sub_type = "-"
                spec = "-"
                if asset.category == 'AIR':
                    sub_type = asset.get_air_type_display() if asset.air_type else "-"
                    spec = f"{asset.air_btu} BTU" if asset.air_btu else "-"
                elif asset.category == 'BATTERY':
                    sub_type = "Battery"
                    spec = f"{asset.battery_amp} Ah" if asset.battery_amp else "-"
                elif asset.category == 'UPS':
                    sub_type = "UPS"
                    spec = f"{asset.ups_kva} kVA" if asset.ups_kva else "-"
                elif asset.category == 'RECTIFIER':
                    sub_type = "Rectifier"
                    spec = f"{asset.rectifier_amp} A" if asset.rectifier_amp else "-"

                writer.writerow([
                    asset.id, asset.get_request_type_display(), dept_name, asset.province,
                    asset.created_by.username if asset.created_by else '-',
                    asset.get_status_display(), asset.get_category_display(), sub_type, spec,
                    asset.get_location_type_display(), asset.location_name, asset.brand_model,
                    asset.asset_number, asset.install_year, asset.age,
                    asset.get_condition_display(), asset.customer_impact, asset.reason,
                    img1, img2,
                    asset.created_at.strftime('%Y-%m-%d %H:%M'),
                    asset.updated_at.strftime('%Y-%m-%d %H:%M')
                ])
            return response

        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AssetRequestViewSet(viewsets.ModelViewSet):
    queryset = AssetRequest.objects.all().order_by('-created_at')
    serializer_class = AssetRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # ... (Filter Campaign/Status/Department เดิม) ...
        if self.request.query_params.get('campaign'):
            queryset = queryset.filter(
                campaign_id=self.request.query_params.get('campaign'))
        if self.request.query_params.get('status'):
            queryset = queryset.filter(
                status=self.request.query_params.get('status'))
        if self.request.query_params.get('department'):
            queryset = queryset.filter(
                department_id=self.request.query_params.get('department'))

        # ✅ แก้ไขจุดที่ 2: ถ้าไม่ใช่ Admin และไม่ใช่ AssetAdmin ให้เห็นแค่ของตัวเอง
        if not is_admin_or_asset_admin(self.request.user):
            queryset = queryset.filter(created_by=self.request.user)

        return queryset

    # ... (perform_create, perform_update, submit เหมือนเดิม) ...
    def perform_create(self, serializer):
        user = self.request.user
        save_kwargs = {'created_by': user, 'department': user.department}
        if user.department:
            save_kwargs['province'] = user.department.name
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        if self.get_object().status != 'DRAFT':
            raise PermissionDenied("แก้ไขได้เฉพาะ Draft")
        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        asset = self.get_object()
        if asset.status != 'DRAFT':
            return Response({'detail': 'ต้องเป็น Draft'}, status=400)
        asset.status = 'SUBMITTED'
        asset.save()
        return Response({'status': 'submitted', 'detail': 'ส่งข้อมูลเรียบร้อยแล้ว'})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        # ✅ แก้ไขจุดที่ 3: ให้ AssetAdmin อนุมัติได้
        if not is_admin_or_asset_admin(request.user):
            return Response({'detail': 'ไม่มีสิทธิ์อนุมัติ'}, status=403)
        asset = self.get_object()
        asset.status = 'APPROVED'
        asset.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        # ✅ แก้ไขจุดที่ 4: ให้ AssetAdmin Reject ได้
        if not is_admin_or_asset_admin(request.user):
            return Response({'detail': 'ไม่มีสิทธิ์ไม่อนุมัติ'}, status=403)
        asset = self.get_object()
        asset.status = 'DRAFT'
        asset.save()
        return Response({'status': 'rejected'})
