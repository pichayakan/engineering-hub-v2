import csv
import datetime
from django.http import HttpResponse
from django.db.models import Count, Q  # ✅ สำคัญมาก ต้องมีบรรทัดนี้
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from accounts.models import Department

from .models import SurveyCampaign, AssetRequest
from .serializers import SurveyCampaignSerializer, AssetRequestSerializer


class SurveyCampaignViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SurveyCampaign.objects.filter(is_active=True)
    serializer_class = SurveyCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        try:
            campaign = self.get_object()

            # (ส่วนตรวจสอบ Relation เหมือนเดิม)
            if hasattr(campaign, 'assets'):
                qs = campaign.assets.all()
            else:
                qs = campaign.assetrequest_set.all()

            status_counts = list(
                qs.values('status').annotate(count=Count('status')))
            category_counts = list(
                qs.values('category').annotate(count=Count('category')))

            # ✅ แก้จุดนี้: เปลี่ยนจาก created_by__username เป็น 'province'
            # เพื่อให้กราฟในหน้า Admin แสดงชื่อจังหวัด/แผนก
            province_counts = list(qs.values('province').annotate(
                total=Count('id'),
                submitted=Count('id', filter=Q(status='SUBMITTED')),
                approved=Count('id', filter=Q(status='APPROVED'))
            ).order_by('-total'))

            return Response({
                'campaign': campaign.name,
                'status_summary': status_counts,
                'category_summary': category_counts,
                'province_summary': province_counts  # ส่งค่ากลับไป
            })

        except Exception as e:
            print(f"❌ STATS ERROR: {str(e)}")
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        try:
            campaign = self.get_object()

            # (ส่วนดึง assets และกรองสิทธิ์ เหมือนเดิม...)
            if hasattr(campaign, 'assets'):
                assets = campaign.assets.all().select_related(
                    'created_by', 'department').order_by('department', 'created_at')
            else:
                assets = campaign.assetrequest_set.all().select_related(
                    'created_by', 'department').order_by('department', 'created_at')

            if not request.user.is_staff:
                if request.user.department:
                    assets = assets.filter(department=request.user.department)
                else:
                    assets = assets.filter(created_by=request.user)

            response = HttpResponse(content_type='text/csv')
            filename = f"assets_campaign_{pk}_{datetime.date.today()}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response.write(u'\ufeff'.encode('utf8'))
            writer = csv.writer(response)

            # ✅ 1. เพิ่ม Header "Request Type"
            writer.writerow([
                'ID',
                'Request Type (ประเภท)',  # ✅ เพิ่มใหม่
                'Department (หน่วยงาน)',
                'Province (จังหวัด)',
                'User (ผู้บันทึก)',
                'Status (สถานะ)',
                'Category (อุปกรณ์)',
                'Sub-Type (ชนิด)',
                'Spec (ขนาด)',
                'Location Type (สถานที่ตั้ง)',
                'Location Name (ชื่อสถานที่)',
                'Brand/Model',
                'Asset No.',
                'Install Year (ปีติดตั้ง)',
                'Age (อายุ-ปี)',
                'Condition (สภาพ)',
                'Impact (ผลกระทบ)',
                'Reason (เหตุผล)',
                'Image 1',
                'Image 2',
                'Created At',
                'Updated At'
            ])

            for asset in assets:
                dept_name = asset.department.name if asset.department else "-"
                img1 = request.build_absolute_uri(
                    asset.image_1.url) if asset.image_1 else ""
                img2 = request.build_absolute_uri(
                    asset.image_2.url) if asset.image_2 else ""

                # ✅ 2. เตรียมข้อมูล Spec ให้ครบทุกประเภท
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

                # ✅ 3. เขียนลง CSV (อย่าลืมใส่ get_request_type_display)
                writer.writerow([
                    asset.id,
                    asset.get_request_type_display(),  # ✅ ใส่ข้อมูล Request Type ตรงนี้
                    dept_name,
                    asset.province,
                    asset.created_by.username if asset.created_by else '-',
                    asset.get_status_display(),
                    asset.get_category_display(),
                    sub_type,
                    spec,
                    asset.get_location_type_display(),
                    asset.location_name,
                    asset.brand_model,
                    asset.asset_number,
                    asset.install_year,
                    asset.age,
                    asset.get_condition_display(),
                    asset.customer_impact,
                    asset.reason,
                    img1,
                    img2,
                    asset.created_at.strftime('%Y-%m-%d %H:%M'),
                    asset.updated_at.strftime('%Y-%m-%d %H:%M')
                ])

            return response

        except Exception as e:
            print(f"❌ EXPORT ERROR: {str(e)}")
            return Response({'error': str(e)}, status=500)


class AssetRequestViewSet(viewsets.ModelViewSet):
    queryset = AssetRequest.objects.all().order_by('-created_at')
    serializer_class = AssetRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # 1. กรองตาม Campaign
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)

        # 2. กรองตาม Status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        # ✅ 3. เพิ่ม: กรองตาม Department (สำหรับ Admin Dashboard)
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # 4. User ทั่วไปเห็นแค่ของตัวเอง (หรือของแผนกตัวเอง ถ้าต้องการ)
        if not self.request.user.is_staff:
            queryset = queryset.filter(created_by=self.request.user)

        return queryset

    def perform_create(self, serializer):
        # ✅ Logic บันทึกอัตโนมัติ
        user = self.request.user

        # เตรียมค่าที่จะบันทึก
        save_kwargs = {
            'created_by': user,
            'department': user.department,  # ดึง department จาก User Profile
        }

        # ถ้าใน Model มี field 'province' ให้บันทึกชื่อแผนกเป็น Snapshot ลงไปด้วย
        if user.department:
            save_kwargs['province'] = user.department.name

        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.status != 'DRAFT':
            raise PermissionDenied("แก้ไขได้เฉพาะรายการที่เป็น Draft เท่านั้น")
        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        asset = self.get_object()
        if asset.status != 'DRAFT':
            return Response({'detail': 'ทำได้เฉพาะรายการที่เป็น Draft เท่านั้น'}, status=400)

        asset.status = 'SUBMITTED'
        asset.save()
        return Response({'status': 'submitted', 'detail': 'ส่งข้อมูลเรียบร้อยแล้ว'})

    # ✅ 1. ฟังก์ชันอนุมัติ (เปลี่ยนเป็น APPROVED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        # เช็คสิทธิ์: เฉพาะ Staff เท่านั้นถึงกดได้
        if not request.user.is_staff:
            return Response({'detail': 'ไม่มีสิทธิ์อนุมัติ'}, status=403)

        asset = self.get_object()
        asset.status = 'APPROVED'
        asset.save()
        return Response({'status': 'approved', 'detail': 'อนุมัติรายการเรียบร้อย'})

    # ✅ 2. ฟังก์ชันไม่อนุมัติ/ส่งคืน (เปลี่ยนกลับเป็น DRAFT หรือ REJECTED)
    # ในที่นี้ขอเปลี่ยนเป็น DRAFT เพื่อให้ User แก้ไขแล้วส่งใหม่ได้
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_staff:
            return Response({'detail': 'ไม่มีสิทธิ์ไม่อนุมัติ'}, status=403)

        asset = self.get_object()
        asset.status = 'DRAFT'  # ส่งกลับไปแก้
        # asset.status = 'REJECTED' # หรือถ้าจะปฏิเสธถาวรให้ใช้ REJECTED
        asset.save()
        return Response({'status': 'rejected', 'detail': 'ส่งกลับแก้ไขเรียบร้อย'})
