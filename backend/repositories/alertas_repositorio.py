def obtener_o_crear_usuario_proceso(conn, usuario_id, proceso_id):
    # El DO UPDATE no cambia nada, pero hace que RETURNING devuelva el id también cuando la relación ya existe
    return conn.execute(
        """
        INSERT INTO usuarios_procesos (usuario_id, proceso_id)
        VALUES (%s, %s)
        ON CONFLICT (usuario_id, proceso_id) DO UPDATE SET usuario_id = EXCLUDED.usuario_id
        RETURNING *
        """,
        (usuario_id, proceso_id)
    ).fetchone()

def crear(conn, usuario_proceso_id, tipo, valor_limite = None):
    return conn.execute(
        """
        INSERT INTO alertas (usuario_proceso_id, tipo, valor_limite)
        VALUES (%s, %s, %s)
        RETURNING *
        """,
        (usuario_proceso_id, tipo, valor_limite)
    ).fetchone()
