from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from uuid import UUID

class ProcesoOut(BaseModel):
    id: UUID
    nombre: str
    estado: str


class ProcesoCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=255, description="Nombre del proceso a monitorear; puede no estar corriendo todavía")

    # Misma normalización que AlertaCreate (sin espacios y con .exe) para no guardar el mismo proceso dos veces
    @field_validator("nombre")
    @classmethod
    def normalizar_nombre(cls, v: str) -> str:
        v_limpio = v.strip()
        if not v_limpio:
            raise ValueError("El nombre del proceso no puede estar vacío.")
        return v_limpio if v_limpio.endswith(".exe") else v_limpio + ".exe"


class HistorialOut(BaseModel):
    registrado_en: datetime
    cpu_porcentaje: float
    ram_porcentaje: float
