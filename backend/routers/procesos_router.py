from fastapi import APIRouter, Depends, Request
from controllers import procesos_controller
from controllers.auth_controller import auth_controller
from uuid import UUID
from schemas import proceso_schema
from controllers.alertas_controller import METRICAS_ACTUALES

router = APIRouter()

#REVISAR CUAL LISTAR PROCESOS SE QUEDA
@router.get("/sistema")
def listar_procesos_sistema():
    # Obtiene la lista de procesos agrupados como siempre
    lista_procesos = procesos_controller._agrupar_procesos_por_nombre(
        procesos_controller.listar_procesos_sistema()
    )

    # Devuelve tanto la lista para la tabla como los totales unificados
    return {
        "procesos": lista_procesos,
        "cpuTotal": METRICAS_ACTUALES["cpu"],
        "ramTotal": METRICAS_ACTUALES["ram"]
    }

def listar_procesos_sistema(request: Request, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return request.app.state.procesos_cache


@router.get("/", response_model=list[proceso_schema.ProcesoOut])
def listar_procesos_bd(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return procesos_controller.obtener_procesos_db()


@router.get("/{proceso_id}", response_model=proceso_schema.ProcesoOut)
def obterner_proceso_bd_por_id(proceso_id: UUID, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return procesos_controller.obtener_proceso_db(proceso_id)

# Cuando se pasa un modelo de pydantic (ProcesoCreate) es la informacion que debe llegar del body de la request


@router.post("/", response_model=proceso_schema.ProcesoOut, status_code=201)
def crear_proceso_bd(data: proceso_schema.ProcesoCreate):
    return procesos_controller.crear_proceso_db(data.nombre, data.estado)


@router.delete("/{proceso_id}")
def eliminar_proceso_bd(proceso_id: UUID):
    return procesos_controller.eliminar_proceso_db(proceso_id)
