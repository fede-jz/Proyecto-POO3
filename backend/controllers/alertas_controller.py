from fastapi import HTTPException, status
from psycopg.errors import UniqueViolation
from repositories import alertas_repositorio, procesos_repositorio
from schemas.alerta_schema import AlertaCreate
from uuid import UUID
from db import pool

#------------ENDPOINTS----------------

def crear_alerta_db(usuario_id: UUID, data: AlertaCreate) -> dict:
    """
    Crea una alerta del usuario sobre un proceso:
    1. Guarda el proceso por nombre, o lo reutiliza si ya estaba guardado.
    2. Crea la relación usuario-proceso, o la reutiliza si ya existía.
    3. Crea la alerta.
    Todo va en la misma conexión, así que si falla la alerta no quedan el proceso ni la relación sueltos.
    """
    try:
        with pool.connection() as conn:
            proceso = procesos_repositorio.obtener_o_crear(conn, data.nombre_proceso)
            usuario_proceso = alertas_repositorio.obtener_o_crear_usuario_proceso(conn, usuario_id, proceso["id"])
            alerta = alertas_repositorio.crear(conn, usuario_proceso["id"], data.tipo, data.valor_limite)
    except UniqueViolation:
        # uq_alerta_tipo: una sola alerta por tipo para el mismo usuario y proceso
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una alerta de tipo '{data.tipo}' para el proceso '{data.nombre_proceso}'."
        )

    return {**alerta, "proceso_id": proceso["id"], "nombre_proceso": proceso["nombre"]}
