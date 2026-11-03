def insertar_muestras(conn, muestras):
    # muestras: lista de (proceso_id, cpu_porcentaje, ram_porcentaje); todas con la misma fecha de registro
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO historial (proceso_id, cpu_porcentaje, ram_porcentaje)
            VALUES (%s, %s, %s)
            """,
            muestras
        )

def eliminar_anteriores_a(conn, dias):
    # Retención: borra las muestras más viejas que la cantidad de días indicada
    return conn.execute(
        "DELETE FROM historial WHERE registrado_en < now() - make_interval(days => %s)",
        (dias,)
    )

def listar_por_proceso(conn, proceso_id, horas, segundos_por_punto):
    # Agrupa las muestras en intervalos de segundos_por_punto (promedio) para no devolver miles de puntos en rangos largos
    return conn.execute(
        """
        SELECT date_bin(make_interval(secs => %s), registrado_en, TIMESTAMPTZ '2000-01-01') AS registrado_en,
               AVG(cpu_porcentaje)::REAL AS cpu_porcentaje,
               AVG(ram_porcentaje)::REAL AS ram_porcentaje
        FROM historial
        WHERE proceso_id = %s
          AND registrado_en >= now() - make_interval(hours => %s)
        GROUP BY 1
        ORDER BY 1
        """,
        (segundos_por_punto, proceso_id, horas)
    ).fetchall()
