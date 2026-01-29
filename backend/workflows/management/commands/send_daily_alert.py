# backend/workflows/management/commands/send_daily_alert.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from workflows.models import StepStatus
# ✅ Import ฟังก์ชันส่งข้อความที่คุณมีอยู่แล้วมาใช้
from notifications.telegram_utils import send_telegram_group_message


class Command(BaseCommand):
    help = 'Send daily Telegram alert for overdue and upcoming tasks to the group.'

    def handle(self, *args, **kwargs):
        # ... (ส่วนต้นเหมือนเดิม) ...
        today = timezone.now().date()
        next_3_days = today + timedelta(days=3)

        self.stdout.write("Checking for overdue and nearing SLA tasks...")

        # 1. หา Step ที่ Overdue
        overdue_steps = StepStatus.objects.select_related('workflow', 'step').filter(
            workflow__is_completed=False,
            status__in=['PENDING', 'IN_PROGRESS'],
            due_date__isnull=False,
            due_date__lt=today
        ).order_by('due_date')

        # 2. หา Step ที่ Near SLA
        near_sla_steps = StepStatus.objects.select_related('workflow', 'step').filter(
            workflow__is_completed=False,
            status__in=['PENDING', 'IN_PROGRESS'],
            due_date__isnull=False,
            due_date__gte=today,
            due_date__lte=next_3_days
        ).order_by('due_date')

        if not overdue_steps.exists() and not near_sla_steps.exists():
            self.stdout.write(self.style.SUCCESS("No tasks to alert today."))
            return

        # 3. สร้างข้อความ
        message = f"📢 <b>สรุปงานประจำวันที่ {today.strftime('%d/%m/%Y')}</b>\n\n"

        if overdue_steps.exists():
            message += "🚨 <b>งานที่เกินกำหนด (Overdue):</b>\n"
            for item in overdue_steps:
                days_late = (today - item.due_date).days
                # ❌ ลบบรรทัด assignee_name ออก

                message += (
                    f"🔴 <b>{item.workflow.title}</b>\n"
                    f"   └ Step: {item.step.name}\n"
                    # ❌ ลบบรรทัด Assignee ออก
                    f"   └ Late: {days_late} วัน (Due: {item.due_date.strftime('%d/%m')})\n\n"
                )

        if near_sla_steps.exists():
            message += "⚠️ <b>งานใกล้ถึงกำหนด (Upcoming 3 Days):</b>\n"
            for item in near_sla_steps:
                days_left = (item.due_date - today).days
                icon = "🟠" if days_left == 0 else "🟡"
                # ❌ ลบบรรทัด assignee_name ออก

                message += (
                    f"{icon} <b>{item.workflow.title}</b>\n"
                    f"   └ Step: {item.step.name}\n"
                    # ❌ ลบบรรทัด Assignee ออก
                    f"   └ Left: {days_left} วัน (Due: {item.due_date.strftime('%d/%m')})\n\n"
                )

        message += "🔗 <a href='https://engineering-hub.ntplc.co.th/dashboard'>Login to Dashboard</a>"

        # 4. ส่งข้อความ
        try:
            send_telegram_group_message(message)
            self.stdout.write(self.style.SUCCESS(
                'Successfully sent daily alert to Telegram Group.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Failed to send alert: {e}'))
