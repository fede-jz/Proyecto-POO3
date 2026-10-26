from fastapi import APIRouter, status, Depends, Header, HTTPException
from controllers.auth_controller import auth_controller
from schemas import usuario_schema
from db import pool
from uuid import UUID
from repositories import usuarios_repositorio

router = APIRouter()


@router.post("/registro", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(data: usuario_schema.UsuarioCreate):
    return auth_controller.registrar_usuario(data)


@router.post("/login", response_model=usuario_schema.LoginRespuesta, status_code=status.HTTP_200_OK)
def iniciar_sesion(data: usuario_schema.UsuarioLogin):
    return auth_controller.iniciar_sesion(data)


@router.post("/telegram/generar-codigo")
def generar_codigo_telegram(usuario_id: str):
    return auth_controller.generar_codigo_telegram(usuario_id)


# Dependencia para extraer y validar el usuario mediante el token Bearer
def obtener_usuario_autenticado(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Formato de autorización inválido.")
    token = authorization.split(" ")[1]
    payload = auth_controller.verificar_token(token)
    usuario_id = payload.get("sub")

    with pool.connection() as conn:
        usuario = usuarios_repositorio.buscar_por_id(conn, UUID(usuario_id))
        if not usuario:
            raise HTTPException(
                status_code=404, detail="Usuario no encontrado.")

        # Retornar usuario sin el hash
        usuario_seguro = {k: v for k,
                          v in usuario.items() if k != "contrasenia_hash"}
        return usuario_seguro


# NUEVO ENDPOINT PARA VALIDAR EN F5
@router.get("/me", response_model=usuario_schema.UsuarioOut)
def obtener_perfil_actual(usuario: dict = Depends(obtener_usuario_autenticado)):
    return usuario
