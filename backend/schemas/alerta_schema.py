from datetime import datetime
from typing import Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator


class AlertaCreate(BaseModel):
    nombre_proceso: str = Field(..., min_length=1, max_length=255, description="Nombre del proceso tal como aparece en /procesos/sistema")
    tipo: Literal["caida", "cpu", "ram"]
    valor_limite: Optional[float] = Field(None, ge=0, le=100, description="Porcentaje límite; vacío para 'caida'")

    # Normaliza el nombre (sin espacios y con .exe) para no guardar el mismo proceso dos veces
    @field_validator("nombre_proceso")
    @classmethod
    def normalizar_nombre_proceso(cls, v: str) -> str:
        v_limpio = v.strip()
        if not v_limpio:
            raise ValueError("El nombre del proceso no puede estar vacío.")
        return v_limpio if v_limpio.endswith(".exe") else v_limpio + ".exe"

    # Replica el CHECK ck_alertas_valor_limite de la BBDD para devolver un 422 claro en vez de un error de Postgres
    @model_validator(mode="after")
    def validar_valor_limite(self):
        if self.tipo == "caida" and self.valor_limite is not None:
            raise ValueError("Las alertas de tipo 'caida' no llevan valor_limite.")
        if self.tipo in ("cpu", "ram") and self.valor_limite is None:
            raise ValueError(f"Las alertas de tipo '{self.tipo}' requieren un valor_limite entre 0 y 100.")
        return self


class AlertaOut(BaseModel):
    id: UUID
    proceso_id: UUID
    nombre_proceso: str
    tipo: str
    valor_limite: Optional[float]
    activo: bool
    ultima_alerta_en: Optional[datetime]
