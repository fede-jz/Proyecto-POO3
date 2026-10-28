from fastapi import HTTPException, status
from psycopg.errors import UniqueViolation
from repositories import alertas_repositorio, procesos_repositorio
from schemas.alerta_schema import AlertaCreate, AlertasGlobalesUpdate
from uuid import UUID
from db import pool

#------------ENDPOINTS----------------

def listar_alertas_db() -> list[dict]:
    """
    Obtiene todas las alertas del sistema, globales y por proceso.
    """
    with pool.connection() as conn:
        return alertas_repositorio.listar(conn)

def obtener_alertas_globales_db() -> dict:
    """
    Obtiene los límites de las alertas globales del servidor ({"cpu": ..., "ram": ...}).
    Si alguna no existe, su valor es None.
    """
    with pool.connection() as conn:
        globales = alertas_repositorio.listar_globales(conn)
    limites = {"cpu": None, "ram": None}
    for alerta in globales:
        limites[alerta["tipo"]] = alerta["valor_limite"]
    return limites

def guardar_alertas_globales_db(usuario_id: UUID, data: AlertasGlobalesUpdate) -> dict:
    """
    Crea o actualiza las alertas globales de CPU y RAM del servidor.
    Las dos van en la misma conexión, así que si falla una no se guarda ninguna.
    """
    with pool.connection() as conn:
        cpu = alertas_repositorio.guardar_global(conn, "cpu", data.cpu, usuario_id)
        ram = alertas_repositorio.guardar_global(conn, "ram", data.ram, usuario_id)
    return {"cpu": cpu["valor_limite"], "ram": ram["valor_limite"]}

def listar_eventos_db() -> list[dict]:
    """
    Obtiene los últimos eventos (alertas disparadas), del más reciente al más antiguo.
    """
    with pool.connection() as conn:
        return alertas_repositorio.listar_eventos(conn)

def reconocer_evento_db(evento_id: UUID, usuario_id: UUID) -> dict:
    """
    Marca un evento como reconocido por el usuario (alguien se está ocupando).
    """
    with pool.connection() as conn:
        if not alertas_repositorio.reconocer_evento(conn, evento_id, usuario_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El evento no existe."
            )
        return alertas_repositorio.buscar_evento_por_id(conn, evento_id)

def eliminar_evento_db(evento_id: UUID) -> dict:
    """
    Elimina un evento de la base de datos.
    """
    with pool.connection() as conn:
        if not alertas_repositorio.eliminar_evento(conn, evento_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El evento no existe."
            )
    return {"mensaje": "Evento eliminado."}

def crear_alerta_db(usuario_id: UUID, data: AlertaCreate) -> dict:
    """
    Crea una alerta del sistema:
    - Con nombre de proceso: guarda el proceso por nombre (o lo reutiliza si ya estaba guardado) y crea la alerta sobre él.
    - Sin nombre de proceso: crea una alerta global del servidor.
    """
    proceso = None
    try:
        with pool.connection() as conn:
            if data.nombre_proceso:
                proceso = procesos_repositorio.obtener_o_crear(conn, data.nombre_proceso)
            alerta = alertas_repositorio.crear(conn, proceso["id"] if proceso else None, usuario_id, data.tipo, data.valor_limite)
    except UniqueViolation:
        # uq_alerta_tipo: una sola alerta por tipo para el mismo proceso, y una sola global por tipo
        destino = f"el proceso '{data.nombre_proceso}'" if data.nombre_proceso else "el servidor"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una alerta de tipo '{data.tipo}' para {destino}."
        )

    return {**alerta, "nombre_proceso": proceso["nombre"] if proceso else None}
