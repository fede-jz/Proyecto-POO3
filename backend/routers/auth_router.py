from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from controllers.auth_controller import auth_controller
from schemas import usuario_schema

router = APIRouter()
security = HTTPBearer()


@router.post("/registro", response_model=usuario_schema.UsuarioLoginResponse, status_code=status.HTTP_201_CREATED)
def registrar_usuario(data: usuario_schema.UsuarioCreate):
    usuario = auth_controller.registrar_usuario(data)
    token = auth_controller.crear_token(usuario)
    return {
        "access_token": token,
        "usuario": usuario,
    }


@router.post("/login", response_model=usuario_schema.UsuarioLoginResponse, status_code=status.HTTP_200_OK)
def iniciar_sesion(data: usuario_schema.UsuarioLogin):
    usuario = auth_controller.iniciar_sesion(data)
    token = auth_controller.crear_token(usuario)
    return {
        "access_token": token,
        "usuario": usuario,
    }


@router.get("/me", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return auth_controller.obtener_usuario_actual(credentials.credentials)
