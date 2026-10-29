from fastapi import APIRouter, Depends, status
from controllers.auth_controller import auth_controller
from schemas import usuario_schema

router = APIRouter()


@router.post("/registro", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(data: usuario_schema.UsuarioCreate):
    return auth_controller.registrar_usuario(data)


@router.post("/login", response_model=usuario_schema.UsuarioLoginResponse, status_code=status.HTTP_200_OK)
def iniciar_sesion(data: usuario_schema.UsuarioLogin):
    return auth_controller.iniciar_sesion(data)


@router.get("/me", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_usuario_actual(current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return current_user
