from typing import List
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

# Dependencia RBAC: Requiere estrictamente rol 'Administrador'


def requerir_administrador(usuario: dict = Depends(obtener_usuario_autenticado)):
    if usuario.get("rol") != "Administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren permisos de Administrador para realizar esta acción."
        )
    return usuario


@router.get("/me", response_model=usuario_schema.UsuarioOut)
def obtener_perfil_actual(usuario: dict = Depends(obtener_usuario_autenticado)):
    return usuario


# Endpoint para actualizar el rol de un usuario  y además consultar miembros de la bdd
@router.get("/miembros", response_model=List[usuario_schema.UsuarioOut])
def listar_miembros(usuario_actual: dict = Depends(obtener_usuario_autenticado)):
    """Obtiene la lista real de todos los usuarios registrados en Supabase."""
    with pool.connection() as conn:
        miembros = usuarios_repositorio.listar(conn)
        return miembros


@router.put("/miembros/{usuario_id}/rol", response_model=usuario_schema.UsuarioOut)
def cambiar_rol_miembro(
    usuario_id: UUID,
    body: usuario_schema.ActualizarRolSchema,
    admin_actual: dict = Depends(requerir_administrador)
):
    """Permite únicamente a un Administrador modificar el rol de otro usuario."""
    with pool.connection() as conn:
        usuario_objetivo = usuarios_repositorio.buscar_por_id(conn, usuario_id)
        if not usuario_objetivo:
            raise HTTPException(
                status_code=404, detail="El miembro especificado no existe.")

        # Prevención de deadlock: No permitir auto-degradación si es el único administrador
        if str(admin_actual["id"]) == str(usuario_id) and body.rol != "Administrador":
            total_admins = usuarios_repositorio.contar_administradores(conn)
            if total_admins <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="No puedes revocar tu propio rol de Administrador siendo el único en el sistema."
                )

        miembro_actualizado = usuarios_repositorio.actualizar_rol(
            conn, usuario_id, body.rol)
        conn.commit()
        return miembro_actualizado
