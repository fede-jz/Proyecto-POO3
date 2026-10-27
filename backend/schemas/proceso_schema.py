from pydantic import BaseModel
from uuid import UUID

class ProcesoOut(BaseModel):
    id: UUID
    nombre: str
    estado: str