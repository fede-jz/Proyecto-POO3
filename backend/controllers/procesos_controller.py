import asyncio
import logging
from controllers import monitor_controller, telegram_controller
from fastapi import FastAPI, HTTPException, status
import time
import psutil
from psycopg.errors import UniqueViolation
from repositories import procesos_repositorio, historial_repositorio
from schemas.proceso_schema import ProcesoCreate
from uuid import UUID
from db import pool

def _agrupar_procesos_por_nombre(procesos):
    # Agrupa los procesos que tengan el mismo nombre y suma sus valores de CPU y memoria
    grupos = {}
    for proceso in procesos:
        grupo = grupos.setdefault(proceso['name'], {
            'name': proceso['name'],
            'pids': [],
            'cpu_percent': 0.0,
            'memory_percent': 0.0,
        })
        grupo['pids'].append(proceso['pid'])
        grupo['cpu_percent'] += proceso['cpu_percent']
        grupo['memory_percent'] += proceso['memory_percent']

    for grupo in grupos.values():
        grupo['cpu_percent'] = round(grupo['cpu_percent'], 2)
        grupo['memory_percent'] = round(grupo['memory_percent'], 2)

    return list(grupos.values())

async def guardar_procesos_en_cache(app: FastAPI):
    print("Worker iniciado")
    ultimo_historial = 0.0
    while True:
        # El escaneo espera 0.5s para medir la CPU; se corre en otro hilo para no bloquear las peticiones de la API
        procesos = await asyncio.to_thread(listar_procesos_sistema)
        app.state.procesos_cache = {
            "procesos": _agrupar_procesos_por_nombre(procesos),
            # Uso total del servidor desde la medición anterior (la primera vuelta siempre da 0)
            "cpuTotal": psutil.cpu_percent(),
            "ramTotal": psutil.virtual_memory().percent,
        }
        # Un error en la base no tiene que frenar el worker: se registra y se reintenta en la próxima vuelta
        try:
            eventos = await asyncio.to_thread(monitor_controller.evaluar_alertas_db, app.state.procesos_cache)
            for evento in eventos:
                print(f"[ALERTA] {evento['tipo_evento']} (valor: {evento['valor_detectado']}) - evento {evento['id']}")
            if eventos:
                await asyncio.to_thread(telegram_controller.notificar_eventos_db, eventos)
        except Exception:
            logging.exception("Error al evaluar las alertas")
        # El historial de los procesos monitoreados se guarda cada INTERVALO_HISTORIAL_SEGUNDOS, no en cada vuelta
        if time.monotonic() - ultimo_historial >= monitor_controller.INTERVALO_HISTORIAL_SEGUNDOS:
            ultimo_historial = time.monotonic()
            try:
                await asyncio.to_thread(monitor_controller.guardar_historial_db, app.state.procesos_cache)
            except Exception:
                logging.exception("Error al guardar el historial de procesos")
        await asyncio.sleep(5)

def listar_procesos_sistema():
    # La primera medición de CPU siempre da 0, entonces se hace una medición inicial para despues tener el valor correcto
    for p in psutil.process_iter():
        try:
            p.cpu_percent(None)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    time.sleep(0.5) # Espera para obtener un valor de CPU más preciso

    procesos = []
    cant_nucleos = psutil.cpu_count() or 1
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        # Ignora el proceso del sistema que da valores raros y los procesos protegidos cuyo nombre no se puede leer
        if p.info['pid'] == 0 or not p.info['name']:
            continue
        procesos.append({
            'pid': p.info['pid'],
            'name': p.info['name'],
            'cpu_percent': (p.info['cpu_percent'] or 0) / cant_nucleos,
            'memory_percent': p.info['memory_percent'] or 0,
        })
    return procesos

def buscar_proceso_en_sistema(nombre: str):
    """
    Busca si un proceso específico está en ejecución y agrupa sus métricas.
    Permite coincidencia con o sin extensión .exe (no sensible a mayúsculas).
    """
    nombre_limpio = nombre.strip().lower()
    variantes = {nombre_limpio}
    if not nombre_limpio.endswith(".exe"):
        variantes.add(f"{nombre_limpio}.exe")

    for proc in _agrupar_procesos_por_nombre(listar_procesos_sistema()):
        if proc["name"].lower() in variantes:
            return proc
    return None

#------------ENDPOINTS----------------
def obtener_procesos_db() -> list[dict]:
    """
    Obtiene la lista de procesos registrados en la base de datos.
    """
    with pool.connection() as conn:
        return procesos_repositorio.listar(conn)

def obtener_proceso_db(proceso_id: UUID) -> dict:
    """
    Obtiene un proceso a través de su ID
    """
    with pool.connection() as conn:
        proceso = procesos_repositorio.buscar_por_id(conn, proceso_id)
    if not proceso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El proceso no existe."
        )
    return proceso

def monitorear_proceso_db(data: ProcesoCreate) -> dict:
    """
    Empieza a monitorear un proceso guardándolo en la base (todos los procesos guardados son los monitoreados).
    El proceso puede no estar corriendo todavía: se va a ver como 'desconocido' hasta la próxima vuelta del monitor.
    """
    try:
        with pool.connection() as conn:
            return procesos_repositorio.crear(conn, data.nombre)
    except UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El proceso '{data.nombre}' ya se está monitoreando."
        )

def dejar_de_monitorear_db(proceso_id: UUID) -> dict:
    """
    Deja de monitorear un proceso borrándolo de la base.
    Junto con él se eliminan su historial, sus alertas y los eventos de esas alertas.
    """
    with pool.connection() as conn:
        if not procesos_repositorio.eliminar(conn, proceso_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El proceso no existe."
            )
    return {"mensaje": "Se dejó de monitorear el proceso."}

def obtener_historial_db(proceso_id: UUID, horas: int) -> list[dict]:
    """
    Obtiene el historial de CPU y RAM de un proceso en las últimas `horas`.
    Los rangos largos se promedian en intervalos para devolver como mucho ~360 puntos.
    """
    segundos_por_punto = max(monitor_controller.INTERVALO_HISTORIAL_SEGUNDOS, horas * 3600 // 360)
    with pool.connection() as conn:
        if not procesos_repositorio.buscar_por_id(conn, proceso_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El proceso no existe."
            )
        return historial_repositorio.listar_por_proceso(conn, proceso_id, horas, segundos_por_punto)
