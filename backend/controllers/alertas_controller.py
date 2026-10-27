import time
import psutil
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from db import pool
from bot.telegram_service import enviar_alerta_telegram

# Zona horaria oficial de Argentina (UTC-3)
TZ_ARG = ZoneInfo("America/Argentina/Buenos_Aires")

# Control de cooldown y métricas globales compartidas
ULTIMOS_DISPAROS = {}
COOLDOWN_MINUTOS = 1

METRICAS_ACTUALES = {
    "cpu": 0.0,
    "ram": 0.0
}


def evaluar_y_capturar_picos_globales():
    cpu_global = psutil.cpu_percent(interval=1)
    ram_global = psutil.virtual_memory().percent

    METRICAS_ACTUALES["cpu"] = cpu_global
    METRICAS_ACTUALES["ram"] = ram_global

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.tipo, a.valor_limite, u.telegram_chat_id, u.nombre as usuario_nombre
                FROM alertas a
                LEFT JOIN usuarios_procesos up ON a.usuario_proceso_id = up.id
                LEFT JOIN usuarios u ON up.usuario_id = u.id
                WHERE a.activo = TRUE
                """
            )
            reglas_alertas = cur.fetchall()

            if not reglas_alertas:
                return

            eventos_cpu_creados = []
            eventos_ram_creados = []

            ahora_utc = datetime.utcnow()
            ahora_arg = datetime.now(TZ_ARG)

            for regla in reglas_alertas:
                alerta_id = regla["id"]
                tipo_regla = regla["tipo"]
                valor_limite = float(regla["valor_limite"] or 80.0)
                chat_id = regla.get("telegram_chat_id")
                usuario_nombre = regla.get("usuario_nombre", "Operador")

                supera_umbral = False
                valor_detectado = 0.0

                if tipo_regla == 'cpu' and cpu_global >= valor_limite:
                    supera_umbral = True
                    valor_detectado = cpu_global
                elif tipo_regla == 'ram' and ram_global >= valor_limite:
                    supera_umbral = True
                    valor_detectado = ram_global

                if supera_umbral:
                    ultimo = ULTIMOS_DISPAROS.get(alerta_id)
                    if not ultimo or ahora_utc - ultimo > timedelta(minutes=COOLDOWN_MINUTOS):

                        tipo_evento = f"exceso_{tipo_regla}"
                        cur.execute(
                            """
                            INSERT INTO eventos (alerta_id, tipo_evento, valor_detectado, notificado)
                            VALUES (%s, %s, %s, %s)
                            RETURNING id
                            """,
                            (alerta_id, tipo_evento, valor_detectado,
                             True if chat_id else False)
                        )
                        evento_row = cur.fetchone()
                        evento_id = evento_row["id"] if isinstance(
                            evento_row, dict) else evento_row[0]

                        ULTIMOS_DISPAROS[alerta_id] = ahora_utc

                        if tipo_regla == 'cpu':
                            eventos_cpu_creados.append(evento_id)
                        else:
                            eventos_ram_creados.append(evento_id)

                        if chat_id:
                            fecha_local_str = ahora_arg.strftime(
                                '%d/%m/%Y %H:%M:%S')
                            mensaje = (
                                f"🚨 *ALERTA DE SISTEMA: Exceso de {tipo_regla.upper()}*\n\n"
                                f"Operador: {usuario_nombre}\n"
                                f"⚠️ Uso actual: {valor_detectado}%\n"
                                f"Límite configurado: {valor_limite}%\n"
                                f"Hora (ARG): {fecha_local_str}"
                            )
                            try:
                                enviar_alerta_telegram(chat_id, mensaje)
                            except Exception:
                                pass

            if not eventos_cpu_creados and not eventos_ram_creados:
                conn.commit()
                return

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


def iniciar_bucle_monitoreo():
    while True:
        try:
            evaluar_y_capturar_picos_globales()
        except Exception:
            pass
        time.sleep(10)
