# backend/assets/views.py

import csv
import datetime
import io  # เพิ่ม io สำหรับอ่านไฟล์ CSV
from django.http import HttpResponse
from django.db.models import Count, Q
from django.db import transaction  # เพิ่ม transaction สำหรับ Bulk Create
from rest_framework import viewsets, permissions, status  # เพิ่ม status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
# เพิ่ม MultiPartParser สำหรับรับไฟล์
from rest_framework.parsers import MultiPartParser

from rest_framework.pagination import PageNumberPagination

from rest_framework import filters

from accounts.models import Department
# ✅ นำเข้า AnnualEquipment มาด้วย
from .models import SurveyCampaign, AssetRequest, AnnualEquipment
# ✅ นำเข้า AnnualEquipmentSerializer มาด้วย
from .serializers import SurveyCampaignSerializer, AssetRequestSerializer, AnnualEquipmentSerializer


# ✅ Helper function: เช็คว่าเป็น Admin หรือ Group 'AssetAdmin'


def is_admin_or_asset_admin(user):
    return (
        user.is_superuser or
        user.is_staff or
        user.groups.filter(name='AssetAdmin').exists()
    )


class StandardResultSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


class SurveyCampaignViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SurveyCampaign.objects.filter(is_active=True)
    serializer_class = SurveyCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
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
        try:
            campaign = self.get_object()
            if hasattr(campaign, 'assets'):
                assets = campaign.assets.all().select_related(
                    'created_by', 'department').order_by('department', 'created_at')
            else:
                assets = campaign.assetrequest_set.all().select_related(
                    'created_by', 'department').order_by('department', 'created_at')

            if not is_admin_or_asset_admin(request.user):
                if request.user.department:
                    assets = assets.filter(department=request.user.department)
                else:
                    assets = assets.filter(created_by=request.user)

            response = HttpResponse(content_type='text/csv')
            filename = f"assets_campaign_{pk}_{datetime.date.today()}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response.write(u'\ufeff'.encode('utf8'))
            writer = csv.writer(response)

            writer.writerow(['ID', 'Request Type', 'Department', 'Province', 'User', 'Status', 'Category', 'Sub-Type', 'Spec', 'Location Type', 'Location Name',
                            'Brand/Model', 'Asset No.', 'Install Year', 'Age', 'Condition', 'Impact', 'Reason', 'Image 1', 'Image 2', 'Created At', 'Updated At'])

            for asset in assets:
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

        if self.request.query_params.get('campaign'):
            queryset = queryset.filter(
                campaign_id=self.request.query_params.get('campaign'))
        if self.request.query_params.get('status'):
            queryset = queryset.filter(
                status=self.request.query_params.get('status'))
        if self.request.query_params.get('department'):
            queryset = queryset.filter(
                department_id=self.request.query_params.get('department'))

        if not is_admin_or_asset_admin(self.request.user):
            queryset = queryset.filter(created_by=self.request.user)

        return queryset

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
        if not is_admin_or_asset_admin(request.user):
            return Response({'detail': 'ไม่มีสิทธิ์อนุมัติ'}, status=403)
        asset = self.get_object()
        asset.status = 'APPROVED'
        asset.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not is_admin_or_asset_admin(request.user):
            return Response({'detail': 'ไม่มีสิทธิ์ไม่อนุมัติ'}, status=403)
        asset = self.get_object()
        asset.status = 'DRAFT'
        asset.save()
        return Response({'status': 'rejected'})


# --- ✅ ระบบจัดการครุภัณฑ์ประจำปี (Annual Equipment) เพิ่มใหม่ ---

class AnnualEquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = AnnualEquipmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultSetPagination

    filter_backends = [filters.SearchFilter]
    search_fields = ['asset_number', 'description', 'cost_center']

    def get_queryset(self):
        user = self.request.user
        qs = AnnualEquipment.objects.all()

        # 1. กรองสิทธิ์ตามแผนก
        if not (is_admin_or_asset_admin(user) or getattr(user.department, 'name', '') == "ส่วนวิศวกรรมและบริหารโครงข่าย (วขตป.)"):
            if user.department:
                qs = qs.filter(department=user.department)
            else:
                return AnnualEquipment.objects.none()

        # ✅ 2. เพิ่มการกรองตามสถานะ (current_status) ที่ส่งมาจาก Frontend
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(current_status=status_param)

        return qs

    def perform_update(self, serializer):
        serializer.save(last_updated_by=self.request.user)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def import_csv(self, request):
        file_obj = request.FILES.get('file')
        fiscal_year = request.data.get('fiscal_year', '2026')

        if not file_obj:
            return Response({"error": "ไม่พบไฟล์ CSV"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file_obj.read().decode('cp874')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            equipments_to_create = []
            batch_size = 5000
            total_imported = 0

            # ✅ ปรับปรุงการสร้าง Mapping: เอา cost_center เป็น Key หลักในการค้นหา Department
            dept_mapping = {}
            for dept in Department.objects.exclude(cost_center__isnull=True).exclude(cost_center=''):
                # ตัดช่องว่างส่วนเกินเพื่อความแม่นยำในการเทียบ
                clean_cctr = str(dept.cost_center).strip()
                dept_mapping[clean_cctr] = dept

            with transaction.atomic():
                for row in reader:
                    # ดึงค่ารหัสศูนย์ต้นทุนจาก CSV และตัดช่องว่าง
                    cost_center_val = str(row.get('ศ.ต้นทุน', '')).strip()

                    # ✅ ทำการเทียบรหัสศูนย์ต้นทุนกับตาราง Department ตรงนี้
                    mapped_department = dept_mapping.get(cost_center_val, None)

                    apc_str = row.get('ราคาทุน APC', '0').replace(
                        ',', '').strip()
                    book_val_str = row.get(
                        'มูลค่าตามบัญชี', '0').replace(',', '').strip()

                    try:
                        apc_value = float(apc_str) if apc_str else 0
                        book_value = float(book_val_str) if book_val_str else 0
                    except ValueError:
                        apc_value = 0
                        book_value = 0

                    equipment = AnnualEquipment(
                        fiscal_year=fiscal_year,
                        asset_class=row.get('คลาส', ''),
                        asset_number=row.get('สินทรัพย์', ''),
                        s_no=row.get('SNo.', ''),
                        old_asset=row.get('ท/ส เดิม', ''),
                        description=row.get('คำอธิบายของสินทรัพย์', ''),
                        cap_date=row.get('Cap.date', ''),
                        quantity=row.get('ปริมาณ', ''),
                        unit=row.get('Unit', ''),
                        cost_center=cost_center_val,
                        rsp_cctr=row.get('Rsp.CCtr', ''),
                        fund_center=row.get('ศ.เงินทุน', ''),
                        act_typ=row.get('ActTyp', ''),
                        sub_dept=row.get('ปภ.ย่อยสท.', ''),
                        evg_3=row.get('EVG.3', ''),
                        center_code=row.get('รหัสศูนย์', ''),
                        location=row.get('ที่ตั้ง', ''),
                        department=mapped_department,  # ✅ ผูกแผนกที่เทียบได้ลงไปที่นี่
                        apc_value=apc_value,
                        book_value=book_value
                    )
                    equipments_to_create.append(equipment)

                    if len(equipments_to_create) >= batch_size:
                        AnnualEquipment.objects.bulk_create(
                            equipments_to_create, ignore_conflicts=True)
                        total_imported += len(equipments_to_create)
                        equipments_to_create = []

                if equipments_to_create:
                    AnnualEquipment.objects.bulk_create(
                        equipments_to_create, ignore_conflicts=True)
                    total_imported += len(equipments_to_create)

            return Response({
                "message": f"นำเข้าข้อมูลสำเร็จแล้วจำนวน {total_imported} รายการ"
            }, status=status.HTTP_201_CREATED)

        except UnicodeDecodeError:
            return Response({"error": "Format ไฟล์ไม่ถูกต้อง (ต้องเป็น TIS-620 หรือ Windows-874)"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def delete_all_data(self, request):
        user = self.request.user
        # ตรวจสอบสิทธิ์: ต้องเป็น Admin, สต๊าฟ, หรืออยู่สังกัด วขตป. เท่านั้นถึงมีสิทธิ์ลบ
        if not (is_admin_or_asset_admin(user) or getattr(user.department, 'name', '') == "ส่วนวิศวกรรมและบริหารโครงข่าย (วขตป.)"):
            return Response({"error": "คุณไม่มีสิทธิ์ในการลบข้อมูลทั้งหมดของระบบ"}, status=status.HTTP_403_FORBIDDEN)

        queryset = AnnualEquipment.objects.all()
        total_count = queryset.count()

        if total_count == 0:
            return Response({"message": "ไม่พบข้อมูลในระบบให้ลบครับ"}, status=status.HTTP_404_NOT_FOUND)

        try:
            batch_size = 5000
            deleted_total = 0

            while True:
                chunk_ids = list(queryset.values_list(
                    'id', flat=True)[:batch_size])
                if not chunk_ids:
                    break
                _, deleted_counts = AnnualEquipment.objects.filter(
                    id__in=chunk_ids).delete()
                deleted_total += len(chunk_ids)

            return Response({
                "message": f"ลบข้อมูลทั้งหมดสำเร็จจำนวน {deleted_total} รายการ"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def cost_center_summary(self, request):
        user = self.request.user
        qs = self.get_queryset()  # ใช้สิทธิ์กรองตาม User เดียวกันกับตารางหลัก

        # จัดกลุ่มและนับจำนวนตาม ศ.ต้นทุน
        summary = qs.values('cost_center').annotate(
            total_items=Count('id'),
            total_apc=Count('id')  # หรือจะรวมมูลค่าก็ได้
            # ดึงมาแสดง 10 อันดับแรกที่ม,ครุภัณฑ์เยอะสุด
        ).order_by('-total_items')

        return Response(summary, status=status.HTTP_200_OK)
