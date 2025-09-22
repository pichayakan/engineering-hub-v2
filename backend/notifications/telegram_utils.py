# backend/notifications/telegram_utils.py
import requests
from django.conf import settings
from logs.models import LogEntry


def send_telegram_group_message(message):
    """
    Send a message to the Telegram group.
    """
    if not getattr(settings, "TELEGRAM_GROUP_CHAT_ID", None):
        print("Skipping Telegram group notification (no group chat id).")
        return

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": settings.TELEGRAM_GROUP_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        print("Successfully sent Telegram group notification.")
        LogEntry.objects.create(
            level=LogEntry.LogLevel.INFO,
            message=f"Sent Telegram group notification: \"{message}\""
        )
    except requests.exceptions.RequestException as e:
        print(f"Error sending Telegram group notification: {e}")
        LogEntry.objects.create(
            level=LogEntry.LogLevel.ERROR,
            message=f"Error sending Telegram group notification: {e}"
        )


def send_telegram_message(user, message):
    """
    Send a Telegram message to a specific user.
    Includes error handling and debug logs.
    """
    # --- Validation ---
    if not getattr(user, "telegram_chat_id", None):
        print(
            f"[DEBUG] Skipping Telegram message: user {user.username} has no telegram_chat_id.")
        return
    if not getattr(user, "notify_enabled", True):
        print(
            f"[DEBUG] Skipping Telegram message: notifications disabled for user {user.username}.")
        return

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": user.telegram_chat_id,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        print(
            f"[DEBUG] Sending Telegram message to user {user.username} (chat_id={user.telegram_chat_id})")
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()

        print(
            f"[DEBUG] Telegram message sent successfully to {user.username}. Response: {response.json()}")
        LogEntry.objects.create(
            level=LogEntry.LogLevel.TELEGRAM,  # ถ้าอยากแยกให้เพิ่ม LogLevel.TELEGRAM
            message=f"Sent Telegram notification to {user.username}: \"{message}\"",
            user=user
        )

    except requests.exceptions.HTTPError as http_err:
        print(
            f"[ERROR] Telegram API error for user {user.username}: {http_err} - {http_err.response.text}")
        LogEntry.objects.create(
            level=LogEntry.LogLevel.ERROR,
            message=f"Telegram API error for {user.username}: {http_err} - {http_err.response.text}",
            user=user
        )

    except requests.exceptions.RequestException as req_err:
        print(
            f"[ERROR] RequestException while sending Telegram message to {user.username}: {req_err}")
        LogEntry.objects.create(
            level=LogEntry.LogLevel.ERROR,
            message=f"RequestException while sending Telegram message to {user.username}: {req_err}",
            user=user
        )

    except Exception as e:
        print(
            f"[ERROR] Unexpected error while sending Telegram message to {user.username}: {e}")
        LogEntry.objects.create(
            level=LogEntry.LogLevel.ERROR,
            message=f"Unexpected error while sending Telegram message to {user.username}: {e}",
            user=user
        )
