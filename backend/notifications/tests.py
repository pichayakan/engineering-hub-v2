import requests


def send_line_message(access_token, user_id, message):
    url = "https://api.line.me/v2/bot/message/push"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }
    data = {
        "to": user_id,
        "messages": [
            {
                "type": "text",
                "text": message,
            }
        ],
    }

    response = requests.post(url, json=data, headers=headers)
    return response.json()


if __name__ == "__main__":
    access_token = "6QtgKQBg+An0/2Rj9bv5uarez415HKjs13JKVYo3xRE0TNFo0Ybepz12hnLUEoPKFWVubCjKn+EvttVXPMz74tUxprsLlUHwBYEjvEnY4Y2vtTcRbok8kDfSesEwvKgPyb6NDkHJoqrWVQ3s3jznLQdB04t89/1O/w1cDnyilFU="
    user_id = "U04b7395f2a0153e329f58c47e4309005"
    message = "Hello, this is a Line message from Python!"

    result = send_line_message(access_token, user_id, message)
    print(result)
