from uuid import UUID


def listar_alertas(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.tipo, a.valor_limite, a.activo, p.nombre as proceso_nombre
            FROM alertas a
            JOIN usuarios_procesos up ON a.usuario_proceso_id = up.id
            JOIN procesos p ON up.proceso_id = p.id
            """
        )
        return cur.fetchall()


def listar_eventos(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 
                e.id, 
                e.alerta_id, 
                e.tipo_evento, 
                e.valor_detectado, 
                e.notificado, 
                e.creado_en,
                p.id AS proceso_id,
                p.nombre AS proceso_nombre
            FROM eventos e
            JOIN alertas a ON e.alerta_id = a.id
            JOIN usuarios_procesos up ON a.usuario_proceso_id = up.id
            JOIN procesos p ON up.proceso_id = p.id
            ORDER BY e.creado_en DESC
            LIMIT 50
            """
        )
        return cur.fetchall()


def actualizar_limite(conn, alerta_id: str, nuevo_limite: float):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE alertas
            SET valor_limite = %s
            WHERE id = %s
            RETURNING id, tipo, valor_limite, activo
            """,
            (nuevo_limite, alerta_id)
        )
        return cur.fetchone()


def eliminar_evento(conn, evento_id: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM eventos
            WHERE id = %s
            """,
            (UUID(evento_id),)
        )


def marcar_evento_reconocido(conn, evento_id: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE eventos
            SET notificado = TRUE
            WHERE id = %s
            RETURNING id, notificado
            """,
            (UUID(evento_id),)
        )
        return cur.fetchone()


def obtener_umbrales_usuario(conn, usuario_id) -> dict:
    """Obtiene los umbrales actuales de CPU y RAM del usuario."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.tipo, a.valor_limite 
            FROM alertas a
            JOIN usuarios_procesos up ON a.usuario_proceso_id = up.id
            WHERE up.usuario_id = %s
            """,
            (usuario_id,)
        )
        filas = cur.fetchall()
        umbrales = {"cpu": 80.0, "ram": 80.0}
        for f in filas:
            umbrales[f["tipo"]] = float(f["valor_limite"])
        return umbrales


def actualizar_umbrales_usuario(conn, usuario_id, nuevo_cpu, nuevo_ram) -> dict:
    """Actualiza de forma atómica los umbrales de CPU y RAM del usuario."""
    with conn.cursor() as cur:
        # Actualizar CPU
        cur.execute(
            """
            UPDATE alertas a SET valor_limite = %s
            FROM usuarios_procesos up
            WHERE a.usuario_proceso_id = up.id AND up.usuario_id = %s AND a.tipo = 'cpu'
            """,
            (nuevo_cpu, usuario_id)
        )
        # Actualizar RAM
        cur.execute(
            """
            UPDATE alertas a SET valor_limite = %s
            FROM usuarios_procesos up
            WHERE a.usuario_proceso_id = up.id AND up.usuario_id = %s AND a.tipo = 'ram'
            """,
            (nuevo_ram, usuario_id)
        )
        conn.commit()
    return {"cpu": nuevo_cpu, "ram": nuevo_ram}
