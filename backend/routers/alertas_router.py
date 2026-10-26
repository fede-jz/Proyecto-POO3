from fastapi import APIRouter, Depends
from controllers import alertas_controller
from controllers.auth_controller import auth_controller
from schemas import alerta_schema

router = APIRouter()

@router.post("/", response_model=alerta_schema.AlertaOut, status_code=201)
def crear_alerta(data: alerta_schema.AlertaCreate, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.crear_alerta_db(current_user["id"], data)
