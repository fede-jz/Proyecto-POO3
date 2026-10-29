from fastapi import APIRouter, Depends
from controllers import alertas_controller
from controllers.auth_controller import auth_controller
from schemas import alerta_schema
from uuid import UUID

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

@router.get("/eventos", response_model=list[alerta_schema.EventoOut])
def listar_eventos(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.listar_eventos_db()

@router.put("/eventos/{evento_id}/reconocer", response_model=alerta_schema.EventoOut)
def reconocer_evento(evento_id: UUID, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.reconocer_evento_db(evento_id, current_user["id"])

@router.delete("/eventos/{evento_id}")
def eliminar_evento(evento_id: UUID, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return alertas_controller.eliminar_evento_db(evento_id)

@router.post("/", response_model=alerta_schema.AlertaOut, status_code=201)
def crear_alerta(data: alerta_schema.AlertaCreate, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return alertas_controller.crear_alerta_db(current_user["id"], data)

# Las rutas con {alerta_id} van al final para que no capturen /globales ni /eventos
@router.get("/{alerta_id}", response_model=alerta_schema.AlertaOut)
def obtener_alerta(alerta_id: UUID, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return alertas_controller.obtener_alerta_db(alerta_id)

@router.put("/{alerta_id}", response_model=alerta_schema.AlertaOut)
def actualizar_alerta(alerta_id: UUID, data: alerta_schema.AlertaUpdate, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return alertas_controller.actualizar_alerta_db(alerta_id, data)

@router.delete("/{alerta_id}")
def eliminar_alerta(alerta_id: UUID, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return alertas_controller.eliminar_alerta_db(alerta_id)
