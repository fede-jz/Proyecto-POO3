import requests

def enviar_alerta_telegram(chat_id: int, mensaje: str):
    TOKEN = "TU_TOKEN_DE_BOTFATHER_AQUI"
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": mensaje,
        "parse_mode": "Markdown"
    }
    respuesta = requests.post(url, json=payload)
    return respuesta.json()