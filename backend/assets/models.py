# backend/assets/models.py

from django.db import models
from django.conf import settings

import datetime


class SurveyCampaign(models.Model):
    """เก็บข้อมูลรอบการสำรวจ เช่น 'สำรวจงบปี 2570'"""
    name = models.CharField(max_length=200)
    year = models.IntegerField(default=2570, help_text="ปีงบประมาณ")
    is_active = models.BooleanField(
        default=True, help_text="เปิดให้กรอกข้อมูลหรือไม่")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class AssetRequest(models.Model):
    """เก็บข้อมูลอุปกรณ์แต่ละตัวที่จังหวัดส่งมา"""
    CATEGORY_CHOICES = [
        ('AIR', 'Air Conditioner'),
        ('RECTIFIER', 'Rectifier'),
        ('BATTERY', 'Battery'),
        ('UPS', 'UPS'),
        ('OTHER', 'Other'),
    ]

    LOCATION_TYPE_CHOICES = [
        ('EXCHANGE', 'อาคารชุมสาย (Exchange)'),
        ('SERVICE_CENTER', 'ศูนย์บริการลูกค้า'),
        ('OFFICE', 'อาคารสำนักงาน'),
        ('BASE_STATION', 'สถานีฐาน (Base Station)'),
        ('OTHER', 'อื่นๆ'),
    ]

    CONDITION_CHOICES = [
        ('GOOD', 'ใช้งานได้ปกติ'),
        ('FAIR', 'พอใช้ (เริ่มเสื่อมสภาพ)'),
        ('POOR', 'ควรเปลี่ยน (เสีย/เสื่อมสภาพมาก)'),
        ('DAMAGED', 'ชำรุด (ใช้งานไม่ได้)'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'แบบร่าง'),
        ('SUBMITTED', 'ส่งข้อมูลแล้ว'),
        ('APPROVED', 'ส่วนกลางตรวจสอบแล้ว'),
        ('REJECTED', 'ตีกลับแก้ไข'),
    ]

    AIR_TYPE_CHOICES = [
        ('WALL', 'ติดผนัง (Wall Type)'),
        ('CEILING', 'แขวนใต้ฝ้า (Ceiling Type)'),
        ('CASSETTE', 'ฝังฝ้า 4 ทิศทาง (Cassette Type)'),
        ('FLOOR', 'ตั้งพื้น (Floor Type)'),
        ('OTHER', 'อื่นๆ')
    ]

    AIR_BTU_CHOICES = [
        ('9000', '9,000 BTU'),
        ('12000', '12,000 BTU'),
        ('18000', '18,000 BTU'),
        ('24000', '24,000 BTU'),
        ('30000', '30,000 BTU'),
        ('36000', '36,000 BTU'),
        ('40000+', 'มากกว่า 40,000 BTU'),
    ]
    REQUEST_TYPE_CHOICES = [
        ('NEW', 'ขอใหม่ (New Request)'),
        ('REPLACE', 'ทดแทนของเดิม (Replacement)')
    ]
    request_type = models.CharField(
        max_length=10, choices=REQUEST_TYPE_CHOICES, default='REPLACE', verbose_name="ประเภทคำขอ")

    # --- ✅ เพิ่ม Field ใหม่ (ตั้ง null=True ไว้ เพราะสินค้าอื่นจะไม่ได้กรอก) ---
    air_type = models.CharField(
        max_length=20, choices=AIR_TYPE_CHOICES, blank=True, null=True, verbose_name="ประเภทแอร์")
    air_btu = models.CharField(
        max_length=20, choices=AIR_BTU_CHOICES, blank=True, null=True, verbose_name="ขนาด BTU")

    battery_amp = models.IntegerField(
        blank=True, null=True, verbose_name="ขนาดแอมป์ (Ah)")

    ups_kva = models.DecimalField(
        max_digits=5, decimal_places=2, blank=True, null=True, verbose_name="ขนาด UPS (kVA)")
    rectifier_amp = models.IntegerField(
        blank=True, null=True, verbose_name="ขนาด Rectifier (Amp)")

    # Links
    campaign = models.ForeignKey(
        SurveyCampaign, on_delete=models.CASCADE, related_name='assets')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # ✅ ปรับปรุงใหม่: ผูกกับ Department เพื่อระบุสังกัดที่แท้จริง
    department = models.ForeignKey(
        'accounts.Department',  # ใช้ String Reference เพื่อป้องกัน Circular Import
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_assets',
        help_text="หน่วยงานเจ้าของสินทรัพย์ (ดึงอัตโนมัติจาก User)"
    )

    # เก็บชื่อจังหวัด/ส่วนงาน ไว้เป็น Text เผื่อไว้ Filter ง่ายๆ หรือดู Snapshot
    province = models.CharField(
        max_length=100, blank=True, help_text="ชื่อจังหวัด/ส่วนงาน (Snapshot ณ วันที่บันทึก)")

    # Asset Details
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    location_type = models.CharField(
        max_length=50, choices=LOCATION_TYPE_CHOICES)
    location_name = models.CharField(
        max_length=200, help_text="ชื่อสถานที่ เช่น ชุมสายบ้านไผ่")

    asset_number = models.CharField(
        max_length=50, blank=True, null=True, verbose_name="เลขสินทรัพย์")
    brand_model = models.CharField(
        # บางทีขอใหม่ยังไม่รู้รุ่น
        max_length=100, blank=True, null=True, verbose_name="ยี่ห้อ/รุ่น")
    install_year = models.IntegerField(
        blank=True, null=True, verbose_name="ปีที่ติดตั้ง")
    age = models.IntegerField(
        default=0, verbose_name="อายุการใช้งาน", blank=True, null=True)
    condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, blank=True, null=True, verbose_name="สภาพ")
    customer_impact = models.IntegerField(
        default=0, verbose_name="ผลกระทบลูกค้า")
    condition = models.CharField(
        max_length=20, choices=CONDITION_CHOICES, default='FAIR')
    reason = models.TextField(
        blank=True, help_text="เหตุผลความจำเป็นในการขอทดแทน")

    # Evidence
    image_1 = models.ImageField(
        upload_to='assets/evidence/', blank=True, null=True)
    image_2 = models.ImageField(
        upload_to='assets/evidence/', blank=True, null=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.category} - {self.location_name} ({self.province})"

    # @property
    # def age(self):
    #     import datetime
    #     current_year = datetime.date.today().year
    #     return current_year - self.install_year

    def save(self, *args, **kwargs):
        # ถ้ามีปีติดตั้ง ให้คำนวณอายุ
        if self.install_year:
            import datetime
            current_year = datetime.date.today().year
            self.age = current_year - self.install_year
        else:
            # ถ้าไม่มี (เช่น ขอใหม่) ให้อายุเป็น 0
            self.age = 0

        super().save(*args, **kwargs)
