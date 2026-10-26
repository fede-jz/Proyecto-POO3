import asyncio
from fastapi import FastAPI
import time
import psutil
from repositories import procesos_repositorio
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
    while True:
        app.state.procesos_cache = _agrupar_procesos_por_nombre(listar_procesos_sistema())
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
        # Ignora el proceso del sistema que da valores raros
        if p.info['pid'] == 0:
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

def obtener_proceso_db(proceso_id: UUID) -> dict | None:
    """
    Obtiene un proceso a través de su ID
    """
    with pool.connection() as conn:
        return procesos_repositorio.buscar_por_id(conn, proceso_id)

def eliminar_proceso_db(proceso_id: UUID) -> bool:
    """
    Eliminar un proceso registrado en la base de datos.
    """
    with pool.connection() as conn:
        return procesos_repositorio.eliminar(conn, proceso_id)
