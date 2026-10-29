from repositories import alertas_repositorio, procesos_repositorio
from db import pool

#------------MONITOR DE ALERTAS----------------

def _actualizar_estados_procesos(conn, corriendo: dict) -> set:
    """
    Actualiza el estado de los procesos guardados según estén corriendo ('activo') o no ('inactivo').
    Devuelve los ids de los procesos que se cayeron en esta vuelta (pasaron a 'inactivo' desde otro estado).
    """
    caidos = set()
    for proceso in procesos_repositorio.listar(conn):
        nuevo_estado = "activo" if proceso["nombre"].lower() in corriendo else "inactivo"
        if proceso["estado"] != nuevo_estado:
            procesos_repositorio.actualizar_estado(conn, proceso["id"], nuevo_estado)
            if nuevo_estado == "inactivo":
                caidos.add(proceso["id"])
    return caidos

def _valor_actual(alerta: dict, cache: dict, corriendo: dict) -> float:
    """
    Valor de CPU o RAM que corresponde a la alerta: el total del servidor si es global, o el del proceso.
    Si el proceso no está corriendo se toma como 0.
    """
    if alerta["proceso_id"] is None:
        return cache["cpuTotal"] if alerta["tipo"] == "cpu" else cache["ramTotal"]
    proceso = corriendo.get(alerta["nombre_proceso"].lower())
    if not proceso:
        return 0.0
    return proceso["cpu_percent"] if alerta["tipo"] == "cpu" else proceso["memory_percent"]

def evaluar_alertas_db(cache: dict) -> list[dict]:
    """
    Evalúa las alertas activas contra el caché de procesos recién medido y crea los eventos que correspondan:
    - 'caida': cuando el proceso pasa a 'inactivo' (desde 'desconocido' o 'activo').
    - 'cpu'/'ram': solo cuando el límite empieza a superarse; mientras siga superado no se repite,
      y al volver por debajo la alerta queda lista para el próximo incidente.
    Devuelve los eventos creados.
    """
    corriendo = {proceso["name"].lower(): proceso for proceso in cache["procesos"]}
    eventos = []
    with pool.connection() as conn:
        caidos = _actualizar_estados_procesos(conn, corriendo)

        for alerta in alertas_repositorio.listar_activas(conn):
            if alerta["tipo"] == "caida":
                if alerta["proceso_id"] in caidos:
                    eventos.append(alertas_repositorio.crear_evento(conn, alerta["id"], "caida"))
                    alertas_repositorio.actualizar_ultima_alerta(conn, alerta["id"])
                continue

            valor = _valor_actual(alerta, cache, corriendo)
            supera_limite = valor > alerta["valor_limite"]
            if supera_limite and not alerta["disparada"]:
                eventos.append(alertas_repositorio.crear_evento(conn, alerta["id"], f"exceso_{alerta['tipo']}", valor))
                alertas_repositorio.marcar_disparada(conn, alerta["id"], True)
            elif not supera_limite and alerta["disparada"]:
                alertas_repositorio.marcar_disparada(conn, alerta["id"], False)
    return eventos
