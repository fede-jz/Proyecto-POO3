import time
import psutil
from repositories import procesos_repositorio
from uuid import UUID

try:
    from db import pool
except ImportError:
    from backend.db import pool

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

def _asegurar_pool_abierto():
    """Abre el pool de conexiones si aún no fue abierto."""
    if not getattr(pool, '_opened', False):
        pool.open()

#------------ENDPOINTS----------------

def crear_proceso_db(nombre: str, estado: str = "desconocido") -> dict:
    """
    Crea un nuevo registro de proceso en la base de datos.
    """
    # Asegurar que el nombre termine con .exe
    nombre = nombre + ".exe" if not nombre.endswith(".exe") else nombre  
    with pool.connection() as conn:
        proceso_existe = procesos_repositorio.buscar_por_nombre(conn, nombre)
        if proceso_existe:
            return proceso_existe
        return procesos_repositorio.crear(conn, nombre, estado)

def obtener_procesos_db() -> list[dict]:
    """
    Obtiene la lista de procesos registrados en la base de datos.
    """
    # Dejo asegurar pool abierto porque está funcion se llama desde el CLI, en caso de eliminar CLI borrar función
    # Las demás funciones al utilizarlas solamente fastapi ya se asegura que el pool esté abierto con el lifespan
    _asegurar_pool_abierto()
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
