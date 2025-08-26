import re
from django.utils import timezone


def sanitize_filename(name: str) -> str:
    """
    ทำความสะอาดชื่อไฟล์:
    - ตัด path ส่วนเกินออก
    - ลบ .pdf ซ้ำ
    - เอา dot (.) ออก ยกเว้น .pdf
    - ลบ space / อักขระแปลก ๆ
    """
    # เอาเฉพาะชื่อก่อนนามสกุล
    base = name.rsplit(".", 1)[0]

    # ลบ prefix signed_ และ timestamp เก่า
    base = re.sub(r"^signed_", "", base)
    base = re.sub(r"_[0-9]{8}-[0-9]{6}$", "", base)

    # แทนที่ . และ space ด้วย _
    base = re.sub(r"[.\s]+", "_", base)

    # กันอักขระพิเศษ
    base = re.sub(r"[^a-zA-Z0-9ก-ฮะ-็่-๋์_-]", "", base)

    return base.strip("_")


def generate_signed_filename(original_name: str) -> str:
    """
    คืนชื่อไฟล์ใหม่ในรูปแบบ:
    signed_<base>_<timestamp>.pdf
    """
    base = sanitize_filename(original_name)
    timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
    return f"signed_{base}_{timestamp}.pdf"
