from fastapi import APIRouter, Depends, HTTPException
from db import pool
from repositories import alertas_repositorio
from routers.auth_router import obtener_usuario_autenticado
from controllers import alertas_controller
from controllers.auth_controller import auth_controller
from schemas import alerta_schema

router = APIRouter()


@router.get("")
def listar_alertas_y_eventos(usuario: dict = Depends(obtener_usuario_autenticado)):
    """Permite a cualquier usuario autenticado ver las reglas y los eventos"""
    with pool.connection() as conn:
        reglas = alertas_repositorio.listar_alertas(conn)
        eventos = alertas_repositorio.listar_eventos(conn)
        return {"reglas": reglas, "eventos": eventos}


@router.put("/{alerta_id}/limite")
def modificar_umbral_alerta(alerta_id: str, nuevo_limite: float, usuario: dict = Depends(obtener_usuario_autenticado)):
    """Solo los administradores pueden modificar los umbrales"""
    if usuario.get("rol") != "Administrador":
        raise HTTPException(
            status_code=403, detail="Acceso denegado. Solo administradores.")

    with pool.connection() as conn:
        alerta_actualizada = alertas_repositorio.actualizar_limite(
            conn, alerta_id, nuevo_limite)
        conn.commit()
        return {"success": True, "alerta": alerta_actualizada}


@router.delete("/eventos/{evento_id}")
def eliminar_evento(evento_id: str, usuario: dict = Depends(obtener_usuario_autenticado)):
    """Solo los administradores pueden eliminar eventos de alerta"""
    if usuario.get("rol") != "Administrador":
        raise HTTPException(
            status_code=403, detail="Acceso denegado. Solo administradores.")

    with pool.connection() as conn:
        alertas_repositorio.eliminar_evento(conn, evento_id)
        conn.commit()
        return {"success": True, "mensaje": "Evento eliminado correctamente de la BDD"}


@router.delete("/{alerta_id}")
def eliminar_alerta(alerta_id: str, usuario: dict = Depends(obtener_usuario_autenticado)):
    """Solo los administradores pueden eliminar reglas de alerta"""
    if usuario.get("rol") != "Administrador":
        raise HTTPException(
            status_code=403, detail="Acceso denegado. Solo administradores.")

    with pool.connection() as conn:
        alertas_repositorio.eliminar(conn, alerta_id)
        conn.commit()
        return {"success": True, "mensaje": "Alerta eliminada correctamente"}


@router.put("/eventos/{evento_id}/reconocer")
def reconocer_evento(evento_id: str, usuario=Depends(obtener_usuario_autenticado)):
    with pool.connection() as conn:
        resultado = alertas_repositorio.marcar_evento_reconocido(
            conn, evento_id)
        if not resultado:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        conn.commit()
        return {"success": True, "mensaje": "Alerta marcada como reconocida en Supabase"}

@router.post("/", response_model=alerta_schema.AlertaOut, status_code=201)
def crear_alerta(data: alerta_schema.AlertaCreate, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.crear_alerta_db(current_user["id"], data)
