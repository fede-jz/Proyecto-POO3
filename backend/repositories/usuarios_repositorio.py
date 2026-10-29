from typing import Optional
from uuid import UUID


def crear(conn, email: str, contrasenia_hash: str, nombre: str):
    """
    Inserta un nuevo usuario en la base de datos de manera segura mediante parámetros SQL (%s).
    """
    return conn.execute(
        """
        INSERT INTO usuarios (email, contrasenia_hash, nombre)
        VALUES (%s, %s, %s)
        RETURNING id, email, nombre, rol, telegram_chat_id, creado_en
        """,
        (email, contrasenia_hash, nombre)
    ).fetchone()


def buscar_por_email(conn, email: str):
    """
    Busca un usuario por su correo electrónico (insensible a mayúsculas/minúsculas).
    """
    return conn.execute(
        """
        SELECT id, email, contrasenia_hash, nombre, rol, telegram_chat_id, creado_en
        FROM usuarios
        WHERE LOWER(email) = LOWER(%s)
        """,
        (email,)
    ).fetchone()


def buscar_por_id(conn, usuario_id: UUID):
    """
    Busca un usuario por su ID (UUID).
    """
    return conn.execute(
        """
        SELECT id, email, contrasenia_hash, nombre, rol, telegram_chat_id, creado_en
        FROM usuarios
        WHERE id = %s
        """,
        (usuario_id,)
    ).fetchone()


def listar(conn):
    """
    Lista todos los usuarios registrados (sin exponer hash de contraseña).
    """
    return conn.execute(
        """
        SELECT id, email, nombre, rol, telegram_chat_id, creado_en
        FROM usuarios
        ORDER BY creado_en DESC
        """
    ).fetchall()


def actualizar_rol(conn, usuario_id: UUID, rol: str):
    """
    Cambia el rol de un usuario y devuelve el usuario actualizado (sin exponer hash de contraseña).
    """
    return conn.execute(
        """
        UPDATE usuarios
        SET rol = %s
        WHERE id = %s
        RETURNING id, email, nombre, rol, telegram_chat_id, creado_en
        """,
        (rol, usuario_id)
    ).fetchone()


def contar_administradores(conn) -> int:
    """
    Cuenta cuántos usuarios tienen rol Administrador.
    """
    return conn.execute(
        "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'Administrador'"
    ).fetchone()["total"]


def guardar_codigo_telegram(conn, usuario_id: UUID, codigo: str, expira_en):
    """
    Guarda el código de vinculación con Telegram del usuario (reemplaza el anterior si había uno).
    """
    return conn.execute(
        "UPDATE usuarios SET telegram_cod = %s, telegram_cod_expira_en = %s WHERE id = %s",
        (codigo, expira_en, usuario_id)
    )


def buscar_por_codigo_telegram(conn, codigo: str):
    """
    Busca al usuario dueño de un código de vinculación que todavía no venció.
    """
    return conn.execute(
        """
        SELECT id, nombre
        FROM usuarios
        WHERE telegram_cod = %s AND telegram_cod_expira_en > now()
        """,
        (codigo,)
    ).fetchone()


def vincular_telegram(conn, usuario_id: UUID, chat_id: int):
    """
    Guarda el chat de Telegram del usuario y borra su código de vinculación.
    Un chat solo puede estar vinculado a una cuenta: si ya lo estaba a otra, se le quita.
    """
    conn.execute(
        "UPDATE usuarios SET telegram_chat_id = NULL WHERE telegram_chat_id = %s AND id <> %s",
        (chat_id, usuario_id)
    )
    return conn.execute(
        """
        UPDATE usuarios
        SET telegram_chat_id = %s, telegram_cod = NULL, telegram_cod_expira_en = NULL
        WHERE id = %s
        """,
        (chat_id, usuario_id)
    )


def listar_chats_telegram(conn) -> list[int]:
    """
    Devuelve los chats de Telegram de todos los usuarios vinculados.
    """
    filas = conn.execute("SELECT telegram_chat_id FROM usuarios WHERE telegram_chat_id IS NOT NULL").fetchall()
    return [fila["telegram_chat_id"] for fila in filas]
