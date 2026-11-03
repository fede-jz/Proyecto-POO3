from fastapi import APIRouter, Depends, Query, Request
from controllers import procesos_controller
from controllers.auth_controller import auth_controller
from uuid import UUID
from schemas import proceso_schema

router = APIRouter()

@router.get("/sistema")
def listar_procesos_sistema(request: Request, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return request.app.state.procesos_cache

# Los procesos guardados en la base son los monitoreados (se les guarda historial)
@router.get("/", response_model=list[proceso_schema.ProcesoOut])
def listar_procesos_bd(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return procesos_controller.obtener_procesos_db()

@router.post("/", response_model=proceso_schema.ProcesoOut, status_code=201)
def monitorear_proceso(data: proceso_schema.ProcesoCreate, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return procesos_controller.monitorear_proceso_db(data)

@router.get("/{proceso_id}", response_model=proceso_schema.ProcesoOut)
def obterner_proceso_bd_por_id(proceso_id: UUID, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return procesos_controller.obtener_proceso_db(proceso_id)

@router.delete("/{proceso_id}")
def dejar_de_monitorear(proceso_id: UUID, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return procesos_controller.dejar_de_monitorear_db(proceso_id)

@router.get("/{proceso_id}/historial",response_model=list[proceso_schema.HistorialOut])
def obtener_historial_proceso(
    proceso_id: UUID,
    horas: int = Query(1, ge=1, le=168, description="Rango hacia atrás en horas (máximo 7 días)"),
    current_user: dict = Depends(auth_controller.get_current_user_dependency),
):
    return procesos_controller.obtener_historial_db(proceso_id, horas)
