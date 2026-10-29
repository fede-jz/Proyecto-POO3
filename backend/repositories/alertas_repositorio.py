def crear(conn, proceso_id, creado_por, tipo, valor_limite = None):
    # proceso_id en None crea una alerta global del servidor
    return conn.execute(
        """
        INSERT INTO alertas (proceso_id, creado_por, tipo, valor_limite)
        VALUES (%s, %s, %s, %s)
        RETURNING *
        """,
        (proceso_id, creado_por, tipo, valor_limite)
    ).fetchone()

def guardar_global(conn, tipo, valor_limite, creado_por):
    # Crea la alerta global del tipo o, si ya existe, solo actualiza su límite (se conserva quién la creó)
    return conn.execute(
        """
        INSERT INTO alertas (proceso_id, creado_por, tipo, valor_limite)
        VALUES (NULL, %s, %s, %s)
        ON CONFLICT ON CONSTRAINT uq_alerta_tipo DO UPDATE SET valor_limite = EXCLUDED.valor_limite
        RETURNING *
        """,
        (creado_por, tipo, valor_limite)
    ).fetchone()

def listar_globales(conn):
    return conn.execute("SELECT * FROM alertas WHERE proceso_id IS NULL").fetchall()

def listar_activas(conn):
    return conn.execute(
        """
        SELECT a.*, p.nombre AS nombre_proceso
        FROM alertas a
        LEFT JOIN procesos p ON p.id = a.proceso_id
        WHERE a.activo
        """
    ).fetchall()

def crear_evento(conn, alerta_id, tipo_evento, valor_detectado = None):
    return conn.execute(
        """
        INSERT INTO eventos (alerta_id, tipo_evento, valor_detectado)
        VALUES (%s, %s, %s)
        RETURNING *
        """,
        (alerta_id, tipo_evento, valor_detectado)
    ).fetchone()

def marcar_disparada(conn, alerta_id, disparada):
    # Al dispararse también se registra cuándo fue la última vez
    return conn.execute(
        """
        UPDATE alertas
        SET disparada = %s,
            ultima_alerta_en = CASE WHEN %s THEN now() ELSE ultima_alerta_en END
        WHERE id = %s
        """,
        (disparada, disparada, alerta_id)
    )

def marcar_notificado(conn, evento_id):
    return conn.execute("UPDATE eventos SET notificado = TRUE WHERE id = %s", (evento_id,))

def actualizar_ultima_alerta(conn, alerta_id):
    return conn.execute("UPDATE alertas SET ultima_alerta_en = now() WHERE id = %s", (alerta_id,))

def listar_eventos(conn, limite = 100):
    # Los más recientes primero, con los datos de la alerta que los disparó
    return conn.execute(
        """
        SELECT e.*, a.tipo, a.valor_limite, a.proceso_id, p.nombre AS nombre_proceso
        FROM eventos e
        JOIN alertas a ON a.id = e.alerta_id
        LEFT JOIN procesos p ON p.id = a.proceso_id
        ORDER BY e.creado_en DESC
        LIMIT %s
        """,
        (limite,)
    ).fetchall()

def reconocer_evento(conn, evento_id, usuario_id):
    # Si ya estaba reconocido se conserva quién y cuándo lo reconoció primero
    return conn.execute(
        """
        UPDATE eventos
        SET reconocido = TRUE,
            reconocido_por = COALESCE(reconocido_por, %s),
            reconocido_en = COALESCE(reconocido_en, now())
        WHERE id = %s
        RETURNING id
        """,
        (usuario_id, evento_id)
    ).fetchone()

def eliminar_evento(conn, evento_id):
    return conn.execute("DELETE FROM eventos WHERE id = %s RETURNING id", (evento_id,)).fetchone()

def buscar_evento_por_id(conn, evento_id):
    return conn.execute(
        """
        SELECT e.*, a.tipo, a.valor_limite, a.proceso_id, p.nombre AS nombre_proceso
        FROM eventos e
        JOIN alertas a ON a.id = e.alerta_id
        LEFT JOIN procesos p ON p.id = a.proceso_id
        WHERE e.id = %s
        """,
        (evento_id,)
    ).fetchone()

def listar(conn):
    # Primero las globales (sin proceso) y después las de cada proceso
    return conn.execute(
        """
        SELECT a.*, p.nombre AS nombre_proceso
        FROM alertas a
        LEFT JOIN procesos p ON p.id = a.proceso_id
        ORDER BY p.nombre NULLS FIRST, a.tipo
        """
    ).fetchall()
