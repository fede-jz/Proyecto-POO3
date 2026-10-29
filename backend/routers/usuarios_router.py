from fastapi import APIRouter, Depends
from controllers import usuarios_controller
from controllers.auth_controller import auth_controller
from uuid import UUID
from schemas import usuario_schema

router = APIRouter()

@router.get("/", response_model=list[usuario_schema.UsuarioOut])
def listar_usuarios(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return usuarios_controller.listar_usuarios_db()

@router.put("/{usuario_id}/rol", response_model=usuario_schema.UsuarioOut)
def actualizar_rol_usuario(usuario_id: UUID, data: usuario_schema.UsuarioActualizarRol, current_user: dict = Depends(auth_controller.requerir_administrador)):
    return usuarios_controller.actualizar_rol_db(usuario_id, data.rol)
