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
