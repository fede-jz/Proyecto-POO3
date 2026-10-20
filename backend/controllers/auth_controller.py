import hashlib
import html
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status

try:
    from db import pool
except ImportError:
    from backend.db import pool

from repositories import usuarios_repositorio
from schemas.usuario_schema import UsuarioCreate, UsuarioLogin


def _asegurar_pool_abierto():
    """Abre el pool de conexiones si aún no fue abierto."""
    if not getattr(pool, "_opened", False):
        pool.open()


class auth_controller:

    @staticmethod
    def escapar_caracteres(texto: str) -> str:
        """
        Escapa caracteres especiales para mitigar ataques como XSS o inyecciones,
        y remueve espacios en blanco innecesarios.
        """
        if not isinstance(texto, str):
            return texto
        return html.escape(texto.strip())

    @staticmethod
    def hash_contrasenia(contrasenia: str) -> str:
        """
        Genera el hash seguro SHA-256 de la contraseña proporcionada.
        """
        return hashlib.sha256(contrasenia.encode("utf-8")).hexdigest()

    @staticmethod
    def verificar_contrasenia(contrasenia_plana: str, contrasenia_hasheada: str) -> bool:
        """
        Compara la contraseña en texto plano hasheada con el hash almacenado.
        """
        return hashlib.sha256(contrasenia_plana.encode("utf-8")).hexdigest() == contrasenia_hasheada

    @classmethod
    def obtener_usuario_por_email(cls, email: str) -> dict | None:
        """
        Busca y retorna un usuario de la base de datos por su email.
        """
        _asegurar_pool_abierto()
        email_limpio = cls.escapar_caracteres(email).lower()
        with pool.connection() as conn:
            return usuarios_repositorio.buscar_por_email(conn, email_limpio)

    @classmethod
    def verificar_usuario_existe(cls, email: str) -> bool:
        """
        Verifica en la base de datos si ya existe un usuario registrado con el email dado.
        """
        return cls.obtener_usuario_por_email(email) is not None

    @classmethod
    def registrar_usuario(
        cls,
        data: Optional[UsuarioCreate] = None,
        email: Optional[str] = None,
        contrasenia: Optional[str] = None,
        nombre: Optional[str] = None,
        telegram_chat_id: Optional[int] = None,
    ) -> dict:
        """
        Registra un usuario en la base de datos:
        1. Escapa caracteres especiales en los campos de entrada.
        2. Verifica si el usuario ya existe en la base de datos.
        3. Hashea la contraseña.
        4. Almacena el usuario de forma segura con consultas parametrizadas.
        """
        _asegurar_pool_abierto()

        if data is not None:
            email_val = str(data.email)
            contrasenia_val = data.contrasenia
            nombre_val = data.nombre
            telegram_chat_id_val = data.telegram_chat_id
        else:
            email_val = email
            contrasenia_val = contrasenia
            nombre_val = nombre
            telegram_chat_id_val = telegram_chat_id

        if not email_val or not contrasenia_val or not nombre_val:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los campos email, contrasenia y nombre son obligatorios."
            )

        # 1. Escapar caracteres especiales y normalizar datos
        nombre_sanitizado = cls.escapar_caracteres(nombre_val)
        email_sanitizado = cls.escapar_caracteres(email_val).lower()

        # 2. Verificar si el usuario ya existe en la base de datos
        if cls.verificar_usuario_existe(email_sanitizado):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El usuario con el email '{email_sanitizado}' ya se encuentra registrado."
            )

        # 3. Hashear la contraseña
        contrasenia_hasheada = cls.hash_contrasenia(contrasenia_val)

        # 4. Guardar en la base de datos de forma segura
        with pool.connection() as conn:
            nuevo_usuario = usuarios_repositorio.crear(
                conn=conn,
                email=email_sanitizado,
                contrasenia_hash=contrasenia_hasheada,
                nombre=nombre_sanitizado,
                telegram_chat_id=telegram_chat_id_val,
            )
            conn.commit()

        return nuevo_usuario

    @classmethod
    def iniciar_sesion(
        cls,
        data: Optional[UsuarioLogin] = None,
        email: Optional[str] = None,
        contrasenia: Optional[str] = None,
    ) -> dict:
        """
        Inicia sesión verificando credenciales:
        1. Escapa caracteres especiales en el correo electrónico.
        2. Verifica si el usuario existe en la base de datos.
        3. Verifica si la contraseña provista coincide con el hash almacenado.
        4. Retorna la información del usuario autenticado (sin el hash de la contraseña).
        """
        _asegurar_pool_abierto()

        if data is not None:
            email_val = str(data.email)
            contrasenia_val = data.contrasenia
        else:
            email_val = email
            contrasenia_val = contrasenia

        if not email_val or not contrasenia_val:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere email y contraseña para iniciar sesión."
            )

        # 1. Escapar caracteres especiales y normalizar correo
        email_sanitizado = cls.escapar_caracteres(email_val).lower()

        # 2. Verificar si el usuario existe en la base de datos
        usuario = cls.obtener_usuario_por_email(email_sanitizado)
        if not usuario or not cls.verificar_contrasenia(contrasenia_val, usuario["contrasenia_hash"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El correo electrónico o la contraseña son incorrectos."
            )

        # 3. Retornar información del usuario sin exponer el hash de la contraseña
        usuario_seguro = {k: v for k, v in usuario.items() if k != "contrasenia_hash"}
        return usuario_seguro


# Alias bajo convención CamelCase
AuthController = auth_controller
