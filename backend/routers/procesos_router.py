from fastapi import APIRouter, Depends, Request
from controllers import procesos_controller
from controllers.auth_controller import auth_controller
from uuid import UUID
from schemas import proceso_schema

router = APIRouter()

@router.get("/sistema")
def listar_procesos_sistema(request: Request, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return request.app.state.procesos_cache

@router.get("/", response_model=list[proceso_schema.ProcesoOut])
def listar_procesos_bd(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return procesos_controller.obtener_procesos_db()

@router.get("/{proceso_id}", response_model=proceso_schema.ProcesoOut)
def obterner_proceso_bd_por_id(proceso_id: UUID, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return procesos_controller.obtener_proceso_db(proceso_id)
