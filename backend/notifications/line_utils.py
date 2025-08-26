# backend/notifications/line_utils.py
import requests
from django.conf import settings


def send_line_push_message(user, message):
    """
    Sends a push message to a specific user via the Line Messaging API.
    """
    # 1. Check if the user has a Line User ID and has notifications enabled
    if not user.line_user_id or not user.notify_enabled:
        print(
            f"Skipping LINE notification for {user.username} (no Line ID or notifications disabled).")
        return

    # 2. Set up the request to the Line API
    url = 'https://api.line.me/v2/bot/message/push'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}'
    }
    body = {
        'to': user.line_user_id,
        'messages': [
            {
                'type': 'text',
                'text': message
            }
        ]
    }

    # 3. Send the request
    try:
        response = requests.post(url, headers=headers, json=body)
        response.raise_for_status()  # Raises an exception for bad status codes (4xx or 5xx)
        print(f"Successfully sent LINE notification to {user.username}.")
    except requests.exceptions.RequestException as e:
        print(f"Error sending LINE notification to {user.username}: {e}")
