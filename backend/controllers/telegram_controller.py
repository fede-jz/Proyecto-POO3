import json
import logging
import os
import secrets
import threading
import urllib.request
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from repositories import usuarios_repositorio
from uuid import UUID
from db import pool

# Si no hay token en el .env, Telegram queda desactivado y el resto del backend funciona igual
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USUARIO = os.getenv("TELEGRAM_BOT_USUARIO", "")

CODIGO_LARGO = 8
CODIGO_CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sin 0/O ni 1/I para que no se confundan al escribirlo
CODIGO_VIGENCIA_MINUTOS = 10

def _llamar_api(metodo: str, datos: dict, timeout: float = 10):
    """
    Llama a un método de la API de Telegram (getUpdates, sendMessage, ...) y devuelve su resultado.
    """
    peticion = urllib.request.Request(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{metodo}",
        data=json.dumps(datos).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
        return json.load(respuesta)["result"]

def _enviar_mensaje(chat_id: int, texto: str):
    _llamar_api("sendMessage", {"chat_id": chat_id, "text": texto})

#------------ENDPOINTS----------------

def generar_codigo_db(usuario_id: UUID) -> dict:
    """
    Genera el código para vincular el Telegram del usuario. Vence a los 10 minutos.
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_BOT_USUARIO:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram no está configurado en el servidor."
        )
    codigo = "".join(secrets.choice(CODIGO_CARACTERES) for _ in range(CODIGO_LARGO))
    expira_en = datetime.now(timezone.utc) + timedelta(minutes=CODIGO_VIGENCIA_MINUTOS)
    with pool.connection() as conn:
        usuarios_repositorio.guardar_codigo_telegram(conn, usuario_id, codigo, expira_en)
    return {"codigo": codigo, "bot": TELEGRAM_BOT_USUARIO, "expira_en": expira_en}

#------------BOT (recepción de mensajes)----------------

def vincular_db(codigo: str, chat_id: int) -> dict | None:
    """
    Vincula el chat con el usuario dueño del código. Devuelve el usuario, o None si el código no existe o venció.
    """
    with pool.connection() as conn:
        usuario = usuarios_repositorio.buscar_por_codigo_telegram(conn, codigo)
        if usuario:
            usuarios_repositorio.vincular_telegram(conn, usuario["id"], chat_id)
    return usuario

def _procesar_mensaje(mensaje: dict):
    """
    Responde los comandos del bot: '/start CODIGO' (llega desde el link) o '/vincular CODIGO' (escrito a mano).
    """
    if not mensaje or "text" not in mensaje:
        return
    chat_id = mensaje["chat"]["id"]
    partes = mensaje["text"].split()
    comando = partes[0].split("@")[0].lower()   # en grupos el comando llega como /start@nombre_del_bot

    if comando not in ("/start", "/vincular") or len(partes) < 2:
        _enviar_mensaje(chat_id, "👋 Para recibir las alertas del sistema, vinculá tu cuenta desde Ajustes → Perfil en la web.")
        return

    usuario = vincular_db(partes[1].strip().upper(), chat_id)
    if usuario:
        _enviar_mensaje(chat_id, f"✅ Listo, {usuario['nombre']}. Tu cuenta quedó vinculada: vas a recibir acá las alertas del sistema.")
    else:
        _enviar_mensaje(chat_id, "❌ El código no es válido o ya venció. Generá uno nuevo desde Ajustes → Perfil en la web.")

def _escuchar_mensajes(detener: threading.Event):
    """
    Long polling: le pregunta a Telegram por mensajes nuevos (cada consulta espera hasta 25s a que llegue alguno).
    """
    offset = None
    while not detener.is_set():
        datos = {"timeout": 25, "allowed_updates": ["message"]}
        if offset is not None:
            datos["offset"] = offset   # confirma los mensajes ya procesados para que Telegram no los vuelva a mandar
        try:
            actualizaciones = _llamar_api("getUpdates", datos, timeout=35)
        except Exception:
            logging.exception("Error al consultar mensajes de Telegram")
            detener.wait(5)
            continue
        for actualizacion in actualizaciones:
            offset = actualizacion["update_id"] + 1
            try:
                _procesar_mensaje(actualizacion.get("message"))
            except Exception:
                logging.exception("Error al procesar un mensaje de Telegram")

def iniciar_bot(detener: threading.Event) -> threading.Thread | None:
    """
    Arranca el bot en un hilo aparte. Es daemon para que no frene el apagado del servidor
    mientras espera la respuesta de Telegram.
    """
    if not TELEGRAM_BOT_TOKEN:
        print("Telegram desactivado: falta TELEGRAM_BOT_TOKEN en el .env")
        return None
    hilo = threading.Thread(target=_escuchar_mensajes, args=(detener,), daemon=True)
    hilo.start()
    print("Bot de Telegram iniciado")
    return hilo
