from fastapi import APIRouter, status
from controllers.auth_controller import auth_controller
from schemas import usuario_schema

router = APIRouter()


@router.post("/registro", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(data: usuario_schema.UsuarioCreate):
    return auth_controller.registrar_usuario(data)


@router.post("/login", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_200_OK)
def iniciar_sesion(data: usuario_schema.UsuarioLogin):
    return auth_controller.iniciar_sesion(data)

@router.post("/telegram/generar-codigo")
def generar_codigo_telegram(usuario_id: str):
    return auth_controller.generar_codigo_telegram(usuario_id)