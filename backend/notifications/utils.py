from .line_utils import send_line_push_message
from .telegram_utils import send_telegram_group_message, send_telegram_message


def send_notifications(user, message):
    """
    Send notification via all available channels (LINE + Telegram Group).
    """
    # LINE แจ้งเฉพาะ user
    send_line_push_message(user, message)

    # Telegram ส่งเข้า Group (ไม่ต้องเจาะจง user)
    send_telegram_group_message(message)

    # Telegram ส่งเข้า user
    send_telegram_message(user, message)
