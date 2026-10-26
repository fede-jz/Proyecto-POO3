import time
import psutil
from datetime import datetime, timedelta
from db import pool

# Cooldown para evitar saturar eventos
ULTIMOS_DISPAROS = {}
# corresponde a 5 minutos de cooldown entre eventos de la misma alerta
COOLDOWN_MINUTOS = 5


def evaluar_y_capturar_picos_globales():
    """
    Monitorea el uso global. Si supera el umbral, crea los eventos específicos 
    ('cpu' o 'ram') basándose en el consumo general y guarda en el historial 
    los 5 procesos más críticos con sus valores individuales reales.
    """
    UMBRAL_GLOBAL_CPU = 80.0
    UMBRAL_GLOBAL_RAM = 80.0

    # 1. Obtener métricas globales de la máquina
    cpu_global = psutil.cpu_percent(interval=1)
    ram_global = psutil.virtual_memory().percent

    if cpu_global < UMBRAL_GLOBAL_CPU and ram_global < UMBRAL_GLOBAL_RAM:
        return

    print(
        f"⚠️ [MONITOREO] Pico global detectado -> CPU: {cpu_global}%, RAM: {ram_global}%")

    with pool.connection() as conn:
        with conn.cursor() as cur:
            # A. Buscar todas las alertas activas en la BDD
            cur.execute(
                """
                SELECT id, tipo, valor_limite 
                FROM alertas 
                WHERE activo = TRUE
                """
            )
            reglas_alertas = cur.fetchall()

            eventos_cpu_creados = []
            eventos_ram_creados = []
            ahora = datetime.utcnow()

            # B. Evaluar el consumo global contra los límites de las alertas
            for regla in reglas_alertas:
                alerta_id = regla["id"]
                tipo_regla = regla["tipo"]  # 'cpu' o 'ram'
                valor_limite = regla["valor_limite"] or 80.0

                # Evaluar según corresponda al tipo de regla de la alerta
                if tipo_regla == 'cpu' and cpu_global >= valor_limite:
                    ultimo = ULTIMOS_DISPAROS.get(alerta_id)
                    if not ultimo or ahora - ultimo > timedelta(minutes=COOLDOWN_MINUTOS):
                        cur.execute(
                            """
                            INSERT INTO eventos (alerta_id, tipo_evento, valor_detectado, notificado)
                            VALUES (%s, %s, %s, FALSE)
                            RETURNING id
                            """,
                            (alerta_id, "exceso_global_cpu", cpu_global)
                        )
                        evento_row = cur.fetchone()
                        evento_id = evento_row["id"] if isinstance(
                            evento_row, dict) else evento_row[0]

                        ULTIMOS_DISPAROS[alerta_id] = ahora
                        eventos_cpu_creados.append(evento_id)

                elif tipo_regla == 'ram' and ram_global >= valor_limite:
                    ultimo = ULTIMOS_DISPAROS.get(alerta_id)
                    if not ultimo or ahora - ultimo > timedelta(minutes=COOLDOWN_MINUTOS):
                        cur.execute(
                            """
                            INSERT INTO eventos (alerta_id, tipo_evento, valor_detectado, notificado)
                            VALUES (%s, %s, %s, FALSE)
                            RETURNING id
                            """,
                            (alerta_id, "exceso_global_ram", ram_global)
                        )
                        evento_row = cur.fetchone()
                        evento_id = evento_row["id"] if isinstance(
                            evento_row, dict) else evento_row[0]

                        ULTIMOS_DISPAROS[alerta_id] = ahora
                        eventos_ram_creados.append(evento_id)

            # Si no se creó ningún evento nuevo por el cooldown, terminamos
            if not eventos_cpu_creados and not eventos_ram_creados:
                conn.commit()
                return

            # C. Capturar los procesos activos y sus valores individuales reales
            procesos_activos = []
            for p in psutil.process_iter(['name', 'cpu_percent', 'memory_percent']):
                try:
                    info = p.info
                    cpu_val = info.get('cpu_percent') or 0.0
                    ram_val = info.get('memory_percent') or 0.0

                    procesos_activos.append({
                        "name": info.get('name') or "desconocido",
                        "cpu": round(float(cpu_val), 2),
                        "ram": round(float(ram_val), 2)
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass

            # D. Si se dispararon eventos de CPU, guardamos el Top 5 ordenado por mayor CPU individual
            if eventos_cpu_creados:
                procesos_activos.sort(key=lambda x: x['cpu'], reverse=True)
                top_cpu = procesos_activos[:5]
                evento_principal_cpu = eventos_cpu_creados[0]

                for proc in top_cpu:
                    cur.execute(
                        """
                        INSERT INTO procesos (nombre, estado)
                        VALUES (%s, 'activo')
                        ON CONFLICT (nombre) DO UPDATE SET estado = 'activo'
                        RETURNING id
                        """,
                        (proc["name"],)
                    )
                    proceso_row = cur.fetchone()
                    proceso_id = proceso_row["id"] if isinstance(
                        proceso_row, dict) else proceso_row[0]

                    cur.execute(
                        """
                        INSERT INTO historial (proceso_id, cpu_porcentaje, ram_porcentaje, evento_id)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (proceso_id, registrado_en) DO NOTHING
                        """,
                        (proceso_id, proc["cpu"],
                         proc["ram"], evento_principal_cpu)
                    )

            # E. Si se dispararon eventos de RAM, guardamos el Top 5 ordenado por mayor RAM individual
            if eventos_ram_creados:
                procesos_activos.sort(key=lambda x: x['ram'], reverse=True)
                top_ram = procesos_activos[:5]
                evento_principal_ram = eventos_ram_creados[0]

                for proc in top_ram:
                    cur.execute(
                        """
                        INSERT INTO procesos (nombre, estado)
                        VALUES (%s, 'activo')
                        ON CONFLICT (nombre) DO UPDATE SET estado = 'activo'
                        RETURNING id
                        """,
                        (proc["name"],)
                    )
                    proceso_row = cur.fetchone()
                    proceso_id = proceso_row["id"] if isinstance(
                        proceso_row, dict) else proceso_row[0]

                    cur.execute(
                        """
                        INSERT INTO historial (proceso_id, cpu_porcentaje, ram_porcentaje, evento_id)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (proceso_id, registrado_en) DO NOTHING
                        """,
                        (proceso_id, proc["cpu"],
                         proc["ram"], evento_principal_ram)
                    )

            conn.commit()
    print("✅ [BDD] Eventos globales y procesos con sus consumos individuales guardados correctamente.")


def iniciar_bucle_monitoreo():
    """Bucle infinito que corre en segundo plano vigilando el servidor"""
    while True:
        try:
            evaluar_y_capturar_picos_globales()
        except Exception as e:
            print("❌ Error en hilo de monitoreo:", e)
        time.sleep(10)
