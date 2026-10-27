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


def actualizar_rol(conn, usuario_id: UUID, nuevo_rol: str):
    """Actualiza el rol de un usuario específico de manera parametrizada."""
    return conn.execute(
        """
        UPDATE usuarios
        SET rol = %s
        WHERE id = %s
        RETURNING id, email, nombre, rol, telegram_chat_id, creado_en
        """,
        (nuevo_rol, usuario_id)
    ).fetchone()


def contar_administradores(conn) -> int:
    """Devuelve la cantidad total de administradores registrados en el sistema."""
    row = conn.execute(
        """
        SELECT COUNT(*) as total
        FROM usuarios
        WHERE rol = 'Administrador'
        """
    ).fetchone()
    return row["total"] if isinstance(row, dict) else row[0]
