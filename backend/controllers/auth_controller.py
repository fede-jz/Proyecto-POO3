import hashlib
import html
import random
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import jwt

from fastapi import HTTPException, status

try:
    from db import pool
except ImportError:
    from backend.db import pool

from repositories import usuarios_repositorio
from schemas.usuario_schema import UsuarioCreate, UsuarioLogin

# CLAVES DE CONFIGURACIÓN JWT (En producción usar os.getenv("JWT_SECRET"))
SECRET_KEY = "SYS_MONITOR_CLAVE_SUPER_SECRETA_CAMBIAR_EN_PROD"
ALGORITHM = "HS256"
EXPIRATION_MINUTES = 60 * 24


def _asegurar_pool_abierto():
    """Abre el pool de conexiones si aún no fue abierto."""
    if not getattr(pool, "_opened", False):
        pool.open()

import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import Depends, HTTPException, status
from uuid import UUID
from db import pool
from repositories import usuarios_repositorio
from schemas.usuario_schema import UsuarioCreate, UsuarioLogin

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "monitoreo-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

security = HTTPBearer()


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

    @staticmethod
    def crear_token_acceso(usuario_id: str, email: str) -> str:
        expiracion = datetime.utcnow() + timedelta(minutes=EXPIRATION_MINUTES)
        payload = {
            "sub": str(usuario_id),
            "email": email,
            "exp": expiracion
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    @classmethod
    def verificar_token(cls, token: str) -> dict:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401, detail="El token ha expirado.")
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=401, detail="Token de autenticación no válido.")

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
        data: UsuarioCreate,
    ) -> dict:
        """
        Registra un usuario en la base de datos y le asigna alertas por defecto:
        1. Escapa caracteres especiales en los campos de entrada.
        2. Verifica si el usuario ya existe.
        3. Hashea la contraseña.
        4. Almacena el usuario, un proceso de sistema, la relación y las alertas iniciales.
        """
        _asegurar_pool_abierto()

        """
        Registra un usuario en la base de datos:
        1. Escapa caracteres especiales en los campos de entrada.
        2. Verifica si el usuario ya existe en la base de datos.
        3. Hashea la contraseña.
        4. Almacena el usuario de forma segura con consultas parametrizadas.
        """
        
        # 1. Escapar caracteres especiales y normalizar datos
        nombre_sanitizado = cls.escapar_caracteres(data.nombre)
        email_sanitizado = cls.escapar_caracteres(data.email).lower()

        # 2. Verificar si el usuario ya existe en la base de datos
        if cls.verificar_usuario_existe(email_sanitizado):
            raise HTTPException(
                status_code=400,
                detail=f"El usuario con el email '{email_sanitizado}' ya se encuentra registrado."
            )

        # 3. Hashear la contraseña
        contrasenia_hasheada = cls.hash_contrasenia(data.contrasenia)

        # 4. Guardar en la base de datos y sembrar alertas por defecto
        with pool.connection() as conn:
            with conn.cursor() as cur:
                # A. Crear el usuario utilizando el repositorio existente
                nuevo_usuario = usuarios_repositorio.crear(
                    conn=conn,
                    email=email_sanitizado,
                    contrasenia_hash=contrasenia_hasheada,
                    nombre=nombre_sanitizado,
                )
                usuario_id = nuevo_usuario["id"]

                # B. Asegurar la existencia de un proceso genérico del sistema
                cur.execute(
                    """
                    INSERT INTO procesos (nombre, estado)
                    VALUES ('Sistema', 'activo')
                    ON CONFLICT (nombre) DO UPDATE SET estado = 'activo'
                    RETURNING id
                    """
                )
                proceso_row = cur.fetchone()
                proceso_id = proceso_row["id"] if isinstance(
                    proceso_row, dict) else proceso_row[0]

                # C. Crear la relación en usuarios_procesos
                cur.execute(
                    """
                    INSERT INTO usuarios_procesos (usuario_id, proceso_id, activo)
                    VALUES (%s, %s, TRUE)
                    ON CONFLICT (usuario_id, proceso_id) DO UPDATE SET activo = TRUE
                    RETURNING id
                    """,
                    (usuario_id, proceso_id)
                )
                up_row = cur.fetchone()
                up_id = up_row["id"] if isinstance(up_row, dict) else up_row[0]

                # D. Crear las alertas por defecto (CPU y RAM al 80%)
                cur.execute(
                    """
                    INSERT INTO alertas (usuario_proceso_id, tipo, valor_limite, activo)
                    VALUES 
                        (%s, 'cpu', 80.0, TRUE),
                        (%s, 'ram', 80.0, TRUE)
                    ON CONFLICT (usuario_proceso_id, tipo) DO NOTHING
                    """,
                    (up_id, up_id)
                )

        # 4. Guardar en la base de datos de forma segura
        with pool.connection() as conn:
            nuevo_usuario = usuarios_repositorio.crear(
                conn=conn,
                email=email_sanitizado,
                contrasenia_hash=contrasenia_hasheada,
                nombre=nombre_sanitizado,
            )
            conn.commit()

        return nuevo_usuario

    @classmethod
    def iniciar_sesion(
        cls,
        data: UsuarioLogin,
    ) -> dict:
        _asegurar_pool_abierto()

        email_sanitizado = cls.escapar_caracteres(data.email).lower()

        """
        Inicia sesión verificando credenciales:
        1. Escapa caracteres especiales en el correo electrónico.
        2. Verifica si el usuario existe en la base de datos.
        3. Verifica si la contraseña provista coincide con el hash almacenado.
        4. Retorna la información del usuario autenticado (sin el hash de la contraseña).
        """

        # 1. Escapar caracteres especiales y normalizar correo
        email_sanitizado = cls.escapar_caracteres(data.email).lower()

        # 2. Verificar si el usuario existe en la base de datos
        usuario = cls.obtener_usuario_por_email(email_sanitizado)
        if not usuario or not cls.verificar_contrasenia(data.contrasenia, usuario["contrasenia_hash"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"El correo electrónico o la contraseña son incorrectos."
            )

        usuario_seguro = {k: v for k,
                          v in usuario.items() if k != "contrasenia_hash"}
        token = cls.crear_token_acceso(usuario["id"], usuario["email"])

        if "rol" in usuario_seguro and usuario_seguro["rol"] is not None:
            usuario_seguro["rol"] = str(usuario_seguro["rol"])

        return {
            "access_token": token,
            "token_type": "bearer",
            "usuario": usuario_seguro
        }

    @classmethod
    def generar_codigo_telegram(cls, usuario_id: str) -> dict:
        _asegurar_pool_abierto()
        codigo = f"SYS-{random.randint(1000, 9999)}"
        expira_en = datetime.utcnow() + timedelta(minutes=10)

        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE usuarios 
                    SET telegram_cod = %s, telegram_cod_expira_en = %s 
                    WHERE id = %s
                    RETURNING id, email
                    """,
                    (codigo, expira_en, usuario_id)
                )
                resultado = cur.fetchone()
                conn.commit()

                if not resultado:
                    raise HTTPException(
                        status_code=404, detail="Usuario no encontrado")

        return {"success": True, "codigo": codigo, "expira_en": "10 minutos"}
        # 3. Retornar información del usuario sin exponer el hash de la contraseña
        usuario_seguro = {k: v for k, v in usuario.items() if k != "contrasenia_hash"}
        return usuario_seguro

    @staticmethod
    def crear_token(usuario: dict) -> str:
        """Genera un JWT con la información mínima del usuario."""
        expiracion = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
        payload = {
            "sub": str(usuario["id"]),
            "email": usuario["email"],
            "nombre": usuario["nombre"],
            "exp": expiracion,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @classmethod
    def obtener_usuario_por_id(cls, usuario_id: str) -> dict | None:
        """Busca un usuario activo por su UUID."""
        try:
            with pool.connection() as conn:
                usuario = usuarios_repositorio.buscar_por_id(conn, UUID(usuario_id))
                if not usuario:
                    return None
                return {k: v for k, v in usuario.items() if k != "contrasenia_hash"}
        except ValueError:
            return None

    @classmethod
    def obtener_usuario_actual(cls, token: str) -> dict:
        """Valida un JWT y devuelve el usuario autenticado."""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="El token expiró.") from exc
        except jwt.InvalidTokenError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.") from exc

        usuario = cls.obtener_usuario_por_id(str(payload.get("sub")))
        if not usuario:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado.")

        return usuario

    @staticmethod
    def get_current_user_dependency(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        """Dependency para proteger rutas con Bearer token."""
        return auth_controller.obtener_usuario_actual(credentials.credentials)


# Alias bajo convención CamelCase
AuthController = auth_controller
