from fastapi import APIRouter, Depends, HTTPException
from db import pool
from repositories import alertas_repositorio
from routers.auth_router import obtener_usuario_autenticado

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


# ==========================================
# NUEVOS ENDPOINTS: Umbrales Personalizados
# ==========================================

@router.get("/mis-umbrales")
def obtener_mis_umbrales(usuario: dict = Depends(obtener_usuario_autenticado)):
    """Permite al usuario autenticado consultar sus propios umbrales"""
    with pool.connection() as conn:
        return alertas_repositorio.obtener_umbrales_usuario(conn, usuario["id"])


@router.put("/mis-umbrales")
def actualizar_mis_umbrales(body: dict, usuario: dict = Depends(obtener_usuario_autenticado)):
    """Permite al usuario autenticado actualizar sus propios umbrales de CPU y RAM"""
    nuevo_cpu = float(body.get("cpu", 80.0))
    nuevo_ram = float(body.get("ram", 80.0))

    with pool.connection() as conn:
        resultado = alertas_repositorio.actualizar_umbrales_usuario(
            conn, usuario["id"], nuevo_cpu, nuevo_ram
        )
        conn.commit()
        return {"success": True, "umbrales": resultado}
