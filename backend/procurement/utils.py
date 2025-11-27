# backend/procurement/utils.py
import io
import os
import re
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader

# --- 1. ฟังก์ชันเดิม (จัดการชื่อไฟล์) ---


def sanitize_filename(name: str) -> str:
    """
    ทำความสะอาดชื่อไฟล์:
    - ตัด path ส่วนเกินออก
    - ลบ .pdf ซ้ำ
    - เอา dot (.) ออก ยกเว้น .pdf
    - ลบ space / อักขระแปลก ๆ
    """
    # เอาเฉพาะชื่อก่อนนามสกุล
    if "." in name:
        base = name.rsplit(".", 1)[0]
    else:
        base = name

    # ลบ prefix signed_ และ timestamp เก่า
    base = re.sub(r"^signed_", "", base)
    base = re.sub(r"_[0-9]{8}-[0-9]{6}$", "", base)

    # แทนที่ . และ space ด้วย _
    base = re.sub(r"[.\s]+", "_", base)

    # กันอักขระพิเศษ (อนุญาตภาษาไทย)
    # หมายเหตุ: Regex นี้อาจต้องปรับตามความต้องการ แต่ของเดิมใช้ได้ดีระดับหนึ่ง
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


# --- 2. ฟังก์ชันใหม่ (สร้าง PDF บันทึกข้อความ) ---

def generate_procurement_pdf(procurement_request, user):
    """
    สร้างไฟล์ PDF บันทึกข้อความอัตโนมัติ (Memo) พร้อม Logo และรองรับตัวหนา
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4  # A4 = (595.27, 841.89) points

    # --- 1. ลงทะเบียนฟอนต์ (ธรรมดา & หนา) ---
    font_dir = os.path.join(settings.BASE_DIR, 'static', 'fonts')
    font_regular = os.path.join(font_dir, 'THSarabunNew.ttf')
    font_bold = os.path.join(font_dir, 'THSarabunNew Bold.ttf')

    # Default font names
    font_name_reg = 'Helvetica'
    font_name_bold = 'Helvetica-Bold'

    # ตรวจสอบและลงทะเบียนฟอนต์
    if os.path.exists(font_regular):
        pdfmetrics.registerFont(TTFont('THSarabunNew', font_regular))
        font_name_reg = 'THSarabunNew'

        if os.path.exists(font_bold):
            pdfmetrics.registerFont(TTFont('THSarabunNew-Bold', font_bold))
            font_name_bold = 'THSarabunNew-Bold'
        else:
            # ถ้าไม่มีตัวหนา ให้ใช้ตัวธรรมดาแทน
            font_name_bold = 'THSarabunNew'

    # --- Helper Function: วาดข้อความแบบ (Label ตัวหนา + Value ตัวบาง) ---
    def draw_text_line(canvas_obj, x, y, label, value, size=16):
        # วาด Label (ตัวหนา)
        canvas_obj.setFont(font_name_bold, size)
        canvas_obj.drawString(x, y, label)

        # คำนวณความกว้างเพื่อหาจุดเริ่ม Value
        label_width = canvas_obj.stringWidth(label, font_name_bold, size)

        # วาด Value (ตัวธรรมดา)
        canvas_obj.setFont(font_name_reg, size)
        canvas_obj.drawString(x + label_width + 5, y, value)

    # ==========================================
    # ✅ ส่วนที่ 1: วาดโลโก้ (Logo)
    # ==========================================
    logo_path = os.path.join(settings.BASE_DIR, 'static',
                             'images', '04_NT-Logo-with-Full-Name.png')

    if os.path.exists(logo_path):
        target_height = 1.5 * cm
        aspect_ratio = 2769 / 530
        logo_height = target_height
        logo_width = target_height * aspect_ratio

        logo_x = 2.5 * cm
        logo_y = height - (2.0 * cm) - logo_height

        try:
            c.drawImage(logo_path, logo_x, logo_y, width=logo_width,
                        height=logo_height, mask='auto')
        except Exception as e:
            print(f"Error drawing logo: {e}")

    # ==========================================
    # ✅ ส่วนที่ 2: หัวกระดาษ (Header)
    # ==========================================
    # ใช้ตัวหนาสำหรับหัวข้อ
    c.setFont(font_name_bold, 24)
    title_y = height - 4.5 * cm
    c.drawCentredString(width / 2, title_y, "บันทึกข้อความ")

    # ==========================================
    # ✅ ส่วนที่ 3: เนื้อหา (Content)
    # ==========================================
    text_start_y = title_y - 1.5 * cm
    line_height = 0.8 * cm
    margin_left = 2.5 * cm
    current_y = text_start_y

    # --- เตรียมข้อมูล ---
    doc_num = procurement_request.document_number if procurement_request.document_number else "-"
    created_date = procurement_request.created_at.strftime(
        '%d/%m/%Y') if procurement_request.created_at else "-"

    requester_name = "Unknown"
    if procurement_request.created_by:
        requester_name = f"{procurement_request.created_by.first_name} {procurement_request.created_by.last_name}"

    current_step_name = procurement_request.current_step.name if procurement_request.current_step else "Completed"
    approve_date = timezone.now().strftime('%d/%m/%Y %H:%M')
    approver_name = f"{user.first_name} {user.last_name}"

    # ดึงแผนก (Department)
    # ปรับ Logic ให้รองรับโครงสร้าง User ของคุณ
    user_department = "-"
    if hasattr(user, 'department') and user.department:
        user_department = str(user.department)
    # ถ้า department อยู่ใน profile หรือที่อื่น ให้เพิ่ม logic ตรงนี้

    # --- วาดบรรทัด (ใช้ draw_text_line เพื่อผสมตัวหนา/บาง) ---

    # 1. ส่วนราชการ
    # draw_text_line(c, margin_left, current_y, "ส่วนราชการ: ",
    #                ".........................................................................................................................")
    # current_y -= line_height

    # 2. ที่ / วันที่
    # (วาด 2 คอลัมน์ในบรรทัดเดียว)
    draw_text_line(c, margin_left, current_y, "เลขที่: ", f"วขตป./{doc_num}")
    # ขยับไปกลางหน้าเพื่อวาดวันที่
    draw_text_line(c, width/2 + 1*cm, current_y, "วันที่: ", f"{created_date}")
    current_y -= line_height

    # 3. เรื่อง
    draw_text_line(c, margin_left, current_y, "เรื่อง: ",
                   f"{procurement_request.title}")
    current_y -= line_height * 2  # เว้นบรรทัด

    # 4. เรียน
    draw_text_line(c, margin_left, current_y, "เรียน ", "ผู้เกี่ยวข้อง")
    current_y -= line_height * 1.5  # เว้นบรรทัด

    # 5. เนื้อหาบรรยาย (ใช้ตัวธรรมดาล้วน)
    c.setFont(font_name_reg, 16)

    lines_body = [
        f"          ตามที่ {requester_name} ได้ทำการขออนุมัติเรื่อง {procurement_request.title}",
        f"ปัจจุบันอยู่ในขั้นตอน \"{current_step_name}\" นั้น",
        " ",
        f"          บัดนี้ การดำเนินการดังกล่าวได้รับความเห็นชอบและอนุมัติเรียบร้อยแล้ว",
        " ",
        " ",
        "           จึงเรียนมาเพื่อโปรดทราบและดำเนินการต่อไป",
    ]

    for line in lines_body:
        c.drawString(margin_left, current_y, line)
        current_y -= line_height

    # ==========================================
    # ✅ ส่วนที่ 4: ส่วนลงนาม (Signature Area)
    # ==========================================
    sig_center_x = width - 5 * cm

    # วาดเส้นเซ็นชื่อ
    c.setFont(font_name_reg, 16)
    current_y -= line_height * 2
    signature_line_y = current_y
    c.drawCentredString(sig_center_x, signature_line_y,
                        f"( ลงชื่อ ) ........................................................")

    # ==========================================
    # ✅ ส่วนแทรกลายเซ็น (Hardcode Path)
    # ==========================================

    # 1. กำหนดชื่อไฟล์ลายเซ็นที่คุณวางไว้ใน static/images/
    # <--- ⚠️ แก้ชื่อไฟล์ตรงนี้ให้ตรงกับไฟล์จริง
    signature_filename = "worawitl_sign-removebg.png"
    signature_image_path = os.path.join(
        settings.BASE_DIR, 'static', 'images', signature_filename)

    if os.path.exists(signature_image_path):
        try:
            # กำหนดขนาดกรอบ
            max_sig_width = 3.5 * cm
            max_sig_height = 1.5 * cm

            # อ่านขนาดจริงเพื่อรักษา Aspect Ratio
            img = ImageReader(signature_image_path)
            iw, ih = img.getSize()
            aspect = ih / float(iw)

            draw_width = max_sig_width
            draw_height = max_sig_width * aspect

            if draw_height > max_sig_height:
                draw_height = max_sig_height
                draw_width = draw_height / aspect

            # วางตำแหน่ง (กึ่งกลาง X, ลอยเหนือเส้น Y)
            draw_x = sig_center_x - (draw_width / 2)
            draw_y = signature_line_y + (0.2 * cm)

            c.drawImage(signature_image_path, draw_x, draw_y,
                        width=draw_width, height=draw_height, mask='auto')

        except Exception as e:
            print(f"Error drawing signature: {e}")
    else:
        print(f"Signature file not found at: {signature_image_path}")

    # ------------------------------------------

    # วาดชื่อตัวบรรจง (ตัวหนา)
    current_y -= line_height
    c.setFont(font_name_bold, 16)
    c.drawCentredString(sig_center_x, current_y, f"( {approver_name} )")

    # วาดตำแหน่ง/แผนก และ วันที่ (คงเดิม)
    current_y -= line_height
    c.setFont(font_name_reg, 16)
    if user_department != "-":
        c.drawCentredString(sig_center_x, current_y, f"{user_department}")
        current_y -= line_height
    else:
        c.drawCentredString(sig_center_x, current_y, f"ผู้อนุมัติ")
        current_y -= line_height

    c.drawCentredString(sig_center_x, current_y, f"{approve_date}")

    # --- จบการทำงาน ---
    c.showPage()
    c.save()

    buffer.seek(0)
    filename = f"memo_{procurement_request.id}_{timezone.now().strftime('%H%M%S')}.pdf"
    return ContentFile(buffer.getvalue(), name=filename)
