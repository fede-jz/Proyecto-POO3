import asyncio
from fastapi import FastAPI, HTTPException, status
import time
import psutil
from backend.controllers.auth_controller import _asegurar_pool_abierto
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

def obtener_proceso_db(proceso_id: UUID) -> dict:
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

#--------------------CLI-------------------------

def verificar_y_actualizar_proceso_cli(nombre: str = None):
    """
    Pregunta por el nombre de un proceso (o usa el parámetro si se provee) y:
    - Si está en el sistema pero NO en la base de datos: lo registra con estado 'activo' y guarda métricas en historial.
    - Si NO está en el sistema pero SÍ en la base de datos: notifica el cambio y actualiza el estado a 'inactivo'.
    - Si está en el sistema Y en la base de datos: asegura estado 'activo' y registra métricas actuales en historial.
    - Si no está en el sistema ni en la base de datos: notifica que no existe.
    """
    if not nombre:
        nombre = input("Ingrese el nombre del proceso a buscar/monitorear (ej. explorer.exe): ").strip()

    if not nombre:
        print("No se ingresó ningún nombre de proceso.")
        return None

    # 1. Buscar en el sistema operativo
    proceso_sistema = buscar_proceso_en_sistema(nombre)

    # Nombres posibles para consultar en la base de datos
    nombre_busqueda = proceso_sistema["name"] if proceso_sistema else nombre
    variantes_db = [nombre_busqueda.lower()]
    if not nombre_busqueda.lower().endswith(".exe"):
        variantes_db.append(f"{nombre_busqueda.lower()}.exe")

    _asegurar_pool_abierto()
    with pool.connection() as conn:
        with conn.cursor() as cur:
                # 2. Consultar si ya existe en la base de datos
                cur.execute(
                    "SELECT id, nombre, estado FROM procesos WHERE LOWER(nombre) = ANY(%s)",
                    (variantes_db,)
                )
                db_proceso = cur.fetchone()

                # Caso 1: Está en el sistema pero NO en la base de datos
                if proceso_sistema and not db_proceso:
                    cur.execute(
                        "INSERT INTO procesos (nombre, estado) VALUES (%s, %s) RETURNING id, nombre, estado",
                        (proceso_sistema["name"], "activo")
                    )
                    nuevo = cur.fetchone()
                    proceso_id = nuevo["id"]

                    # Registrar métricas iniciales en historial
                    cur.execute(
                        "INSERT INTO historial (proceso_id, ram_porcentaje, cpu_porcentaje) VALUES (%s, %s, %s)",
                        (proceso_id, proceso_sistema["memory_percent"], proceso_sistema["cpu_percent"])
                    )
                    conn.commit()

                    print(f"\n[NUEVO] El proceso '{proceso_sistema['name']}' fue encontrado en ejecución en el sistema.")
                    print(f"-> Guardado en la base de datos con estado: 'activo'")
                    print(f"-> Métricas iniciales: CPU {proceso_sistema['cpu_percent']}% | RAM {proceso_sistema['memory_percent']}% (PIDs: {proceso_sistema['pids']})")
                    return nuevo

                # Caso 2: NO está en el sistema pero SÍ en la base de datos
                elif not proceso_sistema and db_proceso:
                    estado_anterior = db_proceso["estado"]
                    if estado_anterior != "inactivo":
                        cur.execute(
                            "UPDATE procesos SET estado = 'inactivo' WHERE id = %s RETURNING id, nombre, estado",
                            (db_proceso["id"],)
                        )
                        actualizado = cur.fetchone()
                        conn.commit()
                        print(f"\n[ALERTA] El proceso '{db_proceso['nombre']}' NO se encuentra en ejecución en el sistema.")
                        print(f"-> Estaba registrado con estado '{estado_anterior}'. Se actualizó su estado a 'inactivo' en la base de datos.")
                        return actualizado
                    else:
                        print(f"\n[INFO] El proceso '{db_proceso['nombre']}' está registrado en la base de datos pero sigue sin ejecutarse (estado: 'inactivo').")
                        return db_proceso

                # Caso 3: SÍ está en el sistema Y SÍ en la base de datos
                elif proceso_sistema and db_proceso:
                    proceso_id = db_proceso["id"]
                    estado_anterior = db_proceso["estado"]

                    if estado_anterior != "activo":
                        cur.execute(
                            "UPDATE procesos SET estado = 'activo' WHERE id = %s RETURNING id, nombre, estado",
                            (proceso_id,)
                        )
                        conn.commit()
                        print(f"\n[REACTIVADO] El proceso '{db_proceso['nombre']}' volvió a encontrarse en el sistema.")
                        print(f"-> Estado actualizado de '{estado_anterior}' a 'activo' en la base de datos.")
                    else:
                        print(f"\n[EN EJECUCIÓN] El proceso '{db_proceso['nombre']}' continúa activo en el sistema.")

                    # Registrar nuevas métricas en historial
                    cur.execute(
                        "INSERT INTO historial (proceso_id, ram_porcentaje, cpu_porcentaje) VALUES (%s, %s, %s)",
                        (proceso_id, proceso_sistema["memory_percent"], proceso_sistema["cpu_percent"]))

                    # ---> AÑADIR LLAMADA A LA EVALUACIÓN DE ALERTAS AQUÍ <---
                    evaluar_y_disparar_alertas(conn, proceso_id, proceso_sistema["cpu_percent"], proceso_sistema["memory_percent"])

                    conn.commit()
                    print(f"-> Métricas registradas: CPU {proceso_sistema['cpu_percent']}% | RAM {proceso_sistema['memory_percent']}% (PIDs: {proceso_sistema['pids']})")
                    return db_proceso

                # Caso 4: NO está en el sistema NI en la base de datos
                else:
                    print(f"\n[NO ENCONTRADO] El proceso '{nombre}' no está ejecutándose en el sistema ni se encuentra registrado en la base de datos.")
                    return None

def eliminar_proceso_db_cli(nombre: str = None):
    """
    Elimina un proceso de la base de datos (tabla procesos).
    Por las restricciones ON DELETE CASCADE, también se eliminan sus registros en historial.
    """
    if not nombre:
        nombre = input("\nIngrese el nombre del proceso a eliminar de la base de datos (ej. explorer.exe): ").strip()

    if not nombre:
        print("No se ingresó ningún nombre de proceso.")
        return False

    nombre_limpio = nombre.strip().lower()
    variantes_db = [nombre_limpio]
    if not nombre_limpio.endswith(".exe"):
        variantes_db.append(f"{nombre_limpio}.exe")

    _asegurar_pool_abierto()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nombre, estado FROM procesos WHERE LOWER(nombre) = ANY(%s)",
                (variantes_db,)
            )
            proceso = cur.fetchone()

            if not proceso:
                print(f"\n[NO ENCONTRADO] El proceso '{nombre}' no está registrado en la base de datos.")
                return False

            confirmar = input(f"¿Confirmar la eliminación de '{proceso['nombre']}' (estado: {proceso['estado']}) y su historial? (s/n): ").strip().lower()
            if confirmar in ("s", "si", "y", "yes"):
                cur.execute("DELETE FROM procesos WHERE id = %s RETURNING nombre;", (proceso["id"],))
                conn.commit()
                print(f"\n[ELIMINADO] El proceso '{proceso['nombre']}' fue eliminado exitosamente de la base de datos.")
                return True
            else:
                print("\nOperación cancelada. El proceso no fue eliminado.")
                return False

#--------------------ALERTAS AUTOMÁTICAS-------------------------

def evaluar_y_disparar_alertas(conn, proceso_id: UUID, cpu_actual: float, ram_actual: float):
    """
    Evalúa las métricas actuales del proceso frente a los umbrales configurados 
    en la tabla 'alertas' y registra un 'evento' si se supera el límite.
    """
    with conn.cursor() as cur:
        # Buscar todas las alertas activas asociadas a este proceso a través de usuarios_procesos
        cur.execute(
            """
            SELECT a.id, a.tipo, a.valor_limite, u.telegram_chat_id
            FROM alertas a
            JOIN usuarios_procesos up ON a.usuario_proceso_id = up.id
            JOIN usuarios u ON up.usuario_id = u.id
            WHERE up.proceso_id = %s AND a.activo = TRUE
            """,
            (proceso_id,)
        )
        alertas_configuradas = cur.fetchall()

        for alerta in alertas_configuradas:
            tipo = alerta["tipo"]
            limite = alerta["valor_limite"]
            valor_detectado = None

            if tipo == "cpu" and cpu_actual > limite:
                valor_detectado = cpu_actual
            elif tipo == "ram" and ram_actual > limite:
                valor_detectado = ram_actual

            # Si se superó el límite, registramos el evento en la BD
            if valor_detectado is not None:
                cur.execute(
                    """
                    INSERT INTO eventos (alerta_id, tipo_evento, valor_detectado, notificado)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (alerta["id"], f"exceso_{tipo}", valor_detectado, False)
                )
                evento_creado = cur.fetchone()
                
                # Opcional: Aquí podrías disparar el envío del mensaje a Telegram usando alerta["telegram_chat_id"]
                print(f"[ALERTA AUTOMÁTICA] ¡Umbral de {tipo.upper()} superado! Límite: {limite}%, Detectado: {valor_detectado}%. Evento ID: {evento_creado['id']}")
        
        
        
#===============REVISAR SI SE QUEDA O SE VA===============================       
        proceso = procesos_repositorio.buscar_por_id(conn, proceso_id)
    if not proceso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El proceso no existe."
        )
    return proceso
