from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator


class AlertaCreate(BaseModel):
    nombre_proceso: Optional[str] = Field(None, min_length=1, max_length=255, description="Nombre del proceso tal como aparece en /procesos/sistema; vacío para una alerta global del servidor")
    tipo: Literal["caida", "cpu", "ram"]
    valor_limite: Optional[float] = Field(None, ge=0, le=100, description="Porcentaje límite; vacío para 'caida'")

    # Normaliza el nombre (sin espacios y con .exe) para no guardar el mismo proceso dos veces
    @field_validator("nombre_proceso")
    @classmethod
    def normalizar_nombre_proceso(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v_limpio = v.strip()
        if not v_limpio:
            raise ValueError("El nombre del proceso no puede estar vacío.")
        return v_limpio if v_limpio.endswith(".exe") else v_limpio + ".exe"

    # Replica los CHECK ck_alertas_valor_limite y ck_alertas_global_sin_caida de la BBDD para devolver un 422 claro en vez de un error de Postgres
    @model_validator(mode="after")
    def validar_valor_limite(self):
        if self.tipo == "caida" and self.valor_limite is not None:
            raise ValueError("Las alertas de tipo 'caida' no llevan valor_limite.")
        if self.tipo in ("cpu", "ram") and self.valor_limite is None:
            raise ValueError(f"Las alertas de tipo '{self.tipo}' requieren un valor_limite entre 0 y 100.")
        if self.tipo == "caida" and self.nombre_proceso is None:
            raise ValueError("Las alertas globales del servidor solo pueden ser de tipo 'cpu' o 'ram'.")
        return self


class AlertaUpdate(BaseModel):
    # Campos opcionales: solo se cambia lo que venga. El tipo y el proceso no se editan (se borra y se crea otra)
    valor_limite: Optional[float] = Field(None, ge=0, le=100, description="Nuevo porcentaje límite (no aplica a 'caida')")
    activo: Optional[bool] = Field(None, description="Activar o desactivar la alerta sin borrarla")

    @model_validator(mode="after")
    def validar_algun_cambio(self):
        if self.valor_limite is None and self.activo is None:
            raise ValueError("Hay que indicar valor_limite o activo.")
        return self


class AlertasGlobalesUpdate(BaseModel):
    cpu: float = Field(..., ge=0, le=100, description="Porcentaje límite de CPU de todo el servidor")
    ram: float = Field(..., ge=0, le=100, description="Porcentaje límite de RAM de todo el servidor")


class AlertasGlobalesOut(BaseModel):
    cpu: Optional[float]    # None = no hay alerta global de CPU
    ram: Optional[float]    # None = no hay alerta global de RAM


class EventoOut(BaseModel):
    id: UUID
    alerta_id: UUID
    tipo: str                         # tipo de la alerta que se disparó: 'cpu', 'ram' o 'caida'
    valor_limite: Optional[float]     # límite que tenía la alerta
    proceso_id: Optional[UUID]        # None = alerta global del servidor
    nombre_proceso: Optional[str]
    tipo_evento: str
    valor_detectado: Optional[float]
    notificado: bool
    reconocido: bool
    reconocido_por: Optional[UUID]
    reconocido_en: Optional[datetime]
    creado_en: datetime


class AlertaOut(BaseModel):
    id: UUID
    proceso_id: Optional[UUID]        # None = alerta global del servidor
    nombre_proceso: Optional[str]
    creado_por: Optional[UUID]
    tipo: str
    valor_limite: Optional[float]
    activo: bool
    ultima_alerta_en: Optional[datetime]
