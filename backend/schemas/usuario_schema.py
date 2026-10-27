import re
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

# Tipos de roles admitidos en el sistema
RolPermitido = Literal["Administrador", "Operador de Guardia", "Visualizador"]


class UsuarioCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255,
                       description="Correo electrónico del usuario")
    contrasenia: str = Field(..., min_length=4, max_length=255,
                             description="Contraseña en texto plano")
    nombre: str = Field(..., min_length=1, max_length=100,
                        description="Nombre completo o alias del usuario")

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        v_limpio = v.strip().lower()
        patron = r"^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$"
        if not re.match(patron, v_limpio):
            raise ValueError("El formato del correo electrónico no es válido.")
        return v_limpio


class UsuarioLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255,
                       description="Correo electrónico del usuario")
    contrasenia: str = Field(..., min_length=1, max_length=255,
                             description="Contraseña del usuario")

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        v_limpio = v.strip().lower()
        patron = r"^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$"
        if not re.match(patron, v_limpio):
            raise ValueError("El formato del correo electrónico no es válido.")
        return v_limpio


class UsuarioOut(BaseModel):
    id: UUID
    email: str
    nombre: str
    creado_en: datetime
    rol: str
    telegram_chat_id: Optional[int] = None


class Config:
    from_attributes = True


# NUEVO: Esquema para devolver el token junto al perfil validado de UsuarioOut
class LoginRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut

# Esquema para actualizar rol de manera tipada y segura


class ActualizarRolSchema(BaseModel):
    rol: RolPermitido = Field(..., description="Nuevo rol asignado al miembro")
