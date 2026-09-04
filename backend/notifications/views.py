import json
from datetime import date
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend

from .models import Notification
from .serializers import NotificationSerializer
from .line_utils import send_line_push_message

# 🔹 Import Models สำหรับ Workflow และ Calendar
from workflows.models import ProjectWorkflow
from api.models import CalendarEvent  # ดึงจาก app api ที่เก็บ CalendarEvent ไว้

User = get_user_model()


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        try:
            notification = self.get_object()
            if notification.recipient == request.user:
                notification.is_read = True
                notification.save()
                return Response(status=status.HTTP_204_NO_CONTENT)
            else:
                return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='mark-all-as-read')
    def mark_all_as_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==========================================
# 🟢 LINE Webhook Endpoint (ครบทุกฟังก์ชัน)
# ==========================================
@csrf_exempt
def line_webhook(request):
    if request.method == 'POST':
        try:
            payload = json.loads(request.body.decode('utf-8'))
            events = payload.get('events', [])

            for event in events:
                if event.get('type') == 'message' and event['message']['type'] == 'text':
                    line_user_id = event['source']['userId']
                    raw_text = event['message']['text'].strip()
                    user_text = raw_text.lower()

                    # -------------------------------------------------------------
                    # 1. คำสั่งผูกบัญชี: bind <username_or_email>
                    # -------------------------------------------------------------
                    if user_text.startswith('bind '):
                        identifier = raw_text.split(' ', 1)[1].strip()

                        user = User.objects.filter(username__iexact=identifier).first() or \
                            User.objects.filter(
                                email__iexact=identifier).first()

                        if user:
                            user.line_user_id = line_user_id
                            user.save()
                            user.refresh_from_db()

                            if user.notify_enabled:
                                send_line_push_message(
                                    user,
                                    f"✅ ผูกบัญชี LINE กับผู้ใช้งาน '{user.username}' เรียบร้อยแล้วครับ!"
                                )
                        continue

                    # ค้นหา User จาก line_user_id สำหรับคำสั่งถัดๆ ไป
                    current_user = User.objects.filter(
                        line_user_id=line_user_id).first()
                    if not current_user:
                        continue

                    # -------------------------------------------------------------
                    # 2. คำสั่งเช็คงาน Workflow (แสดง Note สำหรับเสนอเจ้านาย)
                    # -------------------------------------------------------------
                    elif user_text in ['ปฏิทิน', 'นัดหมาย', 'ตารางงาน', 'schedule', 'today']:
                        from datetime import timedelta
                        from django.utils import timezone  # 👈 ใช้ timezone ของ Django
                        import calendar

                        # ดึงวันที่ปัจจุบันตาม Timezone ของ Server/ระบบ (Asia/Bangkok)
                        now = timezone.localtime(timezone.now())
                        today = now.date()

                        end_of_week = today + \
                            timedelta(days=(6 - today.weekday()))
                        _, last_day_of_month = calendar.monthrange(
                            today.year, today.month)
                        end_of_month = date(
                            today.year, today.month, last_day_of_month)

                        # 🔍 Query นัดหมาย (ใช้วันที่กรองจาก DB)
                        all_events = CalendarEvent.objects.filter(
                            Q(created_by=current_user) | Q(
                                participants=current_user),
                            start_time__date__gte=today,
                            start_time__date__lte=end_of_month
                        ).distinct().order_by('start_time')

                        if all_events.exists():
                            today_events = []
                            this_week_events = []
                            later_this_month_events = []

                            for ev in all_events:
                                # 💡 จุดสำคัญ: แปลง start_time เป็น Localtime ของไทยก่อนดึง .date()
                                local_start_time = timezone.localtime(
                                    ev.start_time)
                                ev_date = local_start_time.date()

                                if ev_date == today:
                                    today_events.append((ev, local_start_time))
                                elif ev_date <= end_of_week:
                                    this_week_events.append(
                                        (ev, local_start_time))
                                else:
                                    later_this_month_events.append(
                                        (ev, local_start_time))

                            msg = f"📅 **ปฏิทินนัดหมายของคุณ {current_user.first_name or current_user.username}**\n"
                            msg += f"ประจำเดือน {today.strftime('%B %Y')}\n"
                            msg += "========================================\n\n"

                            # 🟢 1. วันนี้
                            msg += f"📌 **วันนี้ ({today.strftime('%d/%m/%Y')}):**\n"
                            if today_events:
                                for ev, local_time in today_events:
                                    local_end_time = timezone.localtime(
                                        ev.end_time)
                                    start_t = local_time.strftime('%H:%M')
                                    end_t = local_end_time.strftime('%H:%M')
                                    msg += f"  • {ev.title} ({start_t} - {end_t} น.)\n"
                            else:
                                msg += "  • ไม่มีนัดหมายสำหรับวันนี้\n"
                            msg += "\n"

                            # 🔵 2. สัปดาห์นี้
                            msg += "🗓️ **สัปดาห์นี้:**\n"
                            if this_week_events:
                                for ev, local_time in this_week_events:
                                    days_diff = (
                                        local_time.date() - today).days
                                    date_str = local_time.strftime('%d/%m')
                                    start_t = local_time.strftime('%H:%M')
                                    msg += f"  • [{date_str} - อีก {days_diff} วัน] {ev.title} ({start_t} น.)\n"
                            else:
                                msg += "  • ไม่มีนัดหมายเพิ่มเติมในสัปดาห์นี้\n"
                            msg += "\n"

                            # 🟣 3. ถัดไปในเดือนนี้
                            if later_this_month_events:
                                msg += "📆 **ช่วงถัดไปในเดือนนี้:**\n"
                                for ev, local_time in later_this_month_events:
                                    days_diff = (
                                        local_time.date() - today).days
                                    date_str = local_time.strftime('%d/%m')
                                    start_t = local_time.strftime('%H:%M')
                                    msg += f"  • [{date_str} - อีก {days_diff} วัน] {ev.title} ({start_t} น.)\n"
                                msg += "\n"

                            msg += "🔗 ดูปฏิทินทั้งหมดบนระบบเว็บ:\nhttps://tasktracker-bot.com/calendar"
                        else:
                            msg = f"📅 **ปฏิทินนัดหมายประจำเดือน {today.strftime('%B %Y')}**\n"
                            msg += f"🎉 คุณ {current_user.first_name or current_user.username} ไม่มีรายการนัดหมายตั้งแต่วันนี้ถึงสิ้นเดือนครับ"

                        if current_user.notify_enabled:
                            send_line_push_message(current_user, msg)

                    # -------------------------------------------------------------
                    # 3. คำสั่งเช็คปฏิทินนัดหมาย (แบ่งกลุ่ม: วันนี้ / สัปดาห์นี้ / เดือนนี้)
                    # -------------------------------------------------------------
                    elif user_text in ['ปฏิทิน', 'นัดหมาย', 'ตารางงาน', 'schedule', 'today']:
                        from datetime import datetime, time, timedelta
                        import calendar

                        today = date.today()
                        # หาวันสุดท้ายของสัปดาห์นี้ (วันอาทิตย์)
                        end_of_week = today + \
                            timedelta(days=(6 - today.weekday()))
                        # หาวันสุดท้ายของเดือนนี้
                        _, last_day_of_month = calendar.monthrange(
                            today.year, today.month)
                        end_of_month = date(
                            today.year, today.month, last_day_of_month)

                        # 🔍 Query ดึงนัดหมายตั้งแต่วันนี้จนถึงสิ้นเดือน
                        all_events = CalendarEvent.objects.filter(
                            Q(created_by=current_user) | Q(
                                participants=current_user),
                            start_time__date__gte=today,
                            start_time__date__lte=end_of_month
                        ).distinct().order_by('start_time')

                        if all_events.exists():
                            today_events = []
                            this_week_events = []
                            later_this_month_events = []

                            # แยกหมวดหมู่นัดหมาย
                            for ev in all_events:
                                ev_date = ev.start_time.date()
                                if ev_date == today:
                                    today_events.append(ev)
                                elif ev_date <= end_of_week:
                                    this_week_events.append(ev)
                                else:
                                    later_this_month_events.append(ev)

                            msg = f"📅 **ปฏิทินนัดหมายของคุณ {current_user.first_name or current_user.username}**\n"
                            msg += f"ประจำเดือน {today.strftime('%B %Y')}\n"
                            msg += "========================================\n\n"

                            # 🟢 1. วันนี้
                            msg += f"📌 **วันนี้ ({today.strftime('%d/%m/%Y')}):**\n"
                            if today_events:
                                for ev in today_events:
                                    start_t = ev.start_time.strftime('%H:%M')
                                    end_t = ev.end_time.strftime('%H:%M')
                                    msg += f"  • {ev.title} ({start_t} - {end_t} น.)\n"
                            else:
                                msg += "  • ไม่มีนัดหมายสำหรับวันนี้\n"
                            msg += "\n"

                            # 🔵 2. สัปดาห์นี้ (ไม่รวมวันนี้)
                            msg += "🗓️ **สัปดาห์นี้:**\n"
                            if this_week_events:
                                for ev in this_week_events:
                                    days_diff = (
                                        ev.start_time.date() - today).days
                                    date_str = ev.start_time.strftime('%d/%m')
                                    start_t = ev.start_time.strftime('%H:%M')
                                    msg += f"  • [{date_str} - อีก {days_diff} วัน] {ev.title} ({start_t} น.)\n"
                            else:
                                msg += "  • ไม่มีนัดหมายเพิ่มเติมในสัปดาห์นี้\n"
                            msg += "\n"

                            # 🟣 3. ถัดไปในเดือนนี้
                            if later_this_month_events:
                                msg += "📆 **ช่วงถัดไปในเดือนนี้:**\n"
                                for ev in later_this_month_events:
                                    days_diff = (
                                        ev.start_time.date() - today).days
                                    date_str = ev.start_time.strftime('%d/%m')
                                    start_t = ev.start_time.strftime('%H:%M')
                                    msg += f"  • [{date_str} - อีก {days_diff} วัน] {ev.title} ({start_t} น.)\n"
                                msg += "\n"

                            msg += "🔗 ดูปฏิทินทั้งหมดบนระบบเว็บ:\nhttps://tasktracker-bot.com/calendar"
                        else:
                            msg = f"📅 **ปฏิทินนัดหมายประจำเดือน {today.strftime('%B %Y')}**\n"
                            msg += f"🎉 คุณ {current_user.first_name or current_user.username} ไม่มีรายการนัดหมายตั้งแต่วันนี้ถึงสิ้นเดือนครับ"

                        if current_user.notify_enabled:
                            send_line_push_message(current_user, msg)

            return HttpResponse(status=200)
        except Exception as e:
            print(f"⚠️ [LINE Webhook Error]: {e}")
            return HttpResponse(status=400)

    return HttpResponse(status=200)
