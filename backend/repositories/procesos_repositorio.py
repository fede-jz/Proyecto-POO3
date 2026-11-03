def obtener_o_crear(conn, nombre):
    # Si el proceso ya está guardado lo devuelve; el DO UPDATE no cambia nada pero hace que RETURNING devuelva la fila
    return conn.execute(
        """
        INSERT INTO procesos (nombre)
        VALUES (%s)
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING *
        """,
        (nombre,)
    ).fetchone()

def crear(conn, nombre):
    # Falla con UniqueViolation si el proceso ya está guardado (ya se monitorea)
    return conn.execute(
        "INSERT INTO procesos (nombre) VALUES (%s) RETURNING *",
        (nombre,)
    ).fetchone()

def buscar_por_id(conn, proceso_id):
    return conn.execute("SELECT * FROM procesos WHERE id = %s", (proceso_id,)).fetchone()

def listar(conn):
    return conn.execute("SELECT * FROM procesos ORDER BY nombre").fetchall()

def eliminar(conn, proceso_id):
    # Por el ON DELETE CASCADE también se borran su historial, sus alertas y los eventos de esas alertas
    return conn.execute("DELETE FROM procesos WHERE id = %s RETURNING id", (proceso_id,)).fetchone()

def actualizar_estado(conn, proceso_id, estado):
    return conn.execute(
        "UPDATE procesos SET estado = %s WHERE id = %s RETURNING *",
        (estado, proceso_id)
    ).fetchone()
