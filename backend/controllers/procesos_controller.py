import time
import psutil

def listar_procesos():
    # La primera medición de CPU siempre da 0, entonces se hace una medición inicial para despues tener el valor correcto
    for p in psutil.process_iter():
        try:
            p.cpu_percent(None)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    time.sleep(0.5) # Espera para obtener un valor de CPU más preciso

    procesos = []
    cant_nucleos = psutil.cpu_count()
    for p in psutil.process_iter(['pid', 'name', 'status', 'cpu_percent', 'memory_percent']):
        if p.info['pid'] == 0:
            # Ignora el proceso del sistema que da valores raros
            continue

        procesos.append({
            'pid': p.info['pid'],
            'name': p.info['name'],
            'status': p.info['status'],
            'cpu_percent': round((p.info['cpu_percent'] or 0) / cant_nucleos, 2),
            'memory_percent': round(p.info['memory_percent'] or 0, 2), 
        })
    return procesos