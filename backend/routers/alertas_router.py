from fastapi import APIRouter, Depends
from controllers import alertas_controller
from controllers.auth_controller import auth_controller
from schemas import alerta_schema

router = APIRouter()

@router.get("/", response_model=list[alerta_schema.AlertaOut])
def listar_alertas(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.listar_alertas_db()

@router.get("/globales", response_model=alerta_schema.AlertasGlobalesOut)
def obtener_alertas_globales(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.obtener_alertas_globales_db()

@router.put("/globales", response_model=alerta_schema.AlertasGlobalesOut)
def guardar_alertas_globales(data: alerta_schema.AlertasGlobalesUpdate, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return alertas_controller.guardar_alertas_globales_db(current_user["id"], data)

@router.post("/", response_model=alerta_schema.AlertaOut, status_code=201)
def crear_alerta(data: alerta_schema.AlertaCreate, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return alertas_controller.crear_alerta_db(current_user["id"], data)
