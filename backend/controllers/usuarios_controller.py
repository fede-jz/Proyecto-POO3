from fastapi import HTTPException, status
from repositories import usuarios_repositorio
from uuid import UUID
from db import pool

#------------ENDPOINTS----------------
def listar_usuarios_db() -> list[dict]:
    """
    Obtiene la lista de usuarios registrados en la base de datos.
    """
    with pool.connection() as conn:
        return usuarios_repositorio.listar(conn)

def actualizar_rol_db(usuario_id: UUID, rol: str) -> dict:
    """
    Cambia el rol de un usuario.
    No permite quitarle el rol al último Administrador, porque los administradores se asignan a mano
    en la base de datos y el sistema quedaría sin nadie que pueda gestionar roles.
    """
    with pool.connection() as conn:
        usuario = usuarios_repositorio.buscar_por_id(conn, usuario_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario no existe."
            )

        if usuario["rol"] == "Administrador" and rol != "Administrador" and usuarios_repositorio.contar_administradores(conn) <= 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede quitar el rol al único Administrador del sistema."
            )

        return usuarios_repositorio.actualizar_rol(conn, usuario_id, rol)
