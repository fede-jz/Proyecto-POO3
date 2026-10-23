import re
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class UsuarioCreate(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Correo electrónico del usuario")
    contrasenia: str = Field(..., min_length=4, max_length=255, description="Contraseña en texto plano")
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre completo o alias del usuario")

    @field_validator("email")
    @classmethod
    def validar_email(cls, v: str) -> str:
        v_limpio = v.strip().lower()
        patron = r"^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$"
        if not re.match(patron, v_limpio):
            raise ValueError("El formato del correo electrónico no es válido.")
        return v_limpio


class UsuarioLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255, description="Correo electrónico del usuario")
    contrasenia: str = Field(..., min_length=1, max_length=255, description="Contraseña del usuario")

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


class UsuarioLoginResponse(BaseModel):
    token: str
    usuario: UsuarioOut
