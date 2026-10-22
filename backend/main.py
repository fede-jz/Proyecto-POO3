from contextlib import asynccontextmanager
from db import pool
from controllers import procesos_controller
from routers import procesos_router, auth_router
from fastapi import FastAPI
# <--- AÑADIR ESTO PARA CONFIGURACIÓN DE CORS
from fastapi.middleware.cors import CORSMiddleware

# -----------API----------------
# Ciclo de vida (Lifespan) de FastAPI, inicializa y cierra el pool de conexiones al iniciar y apagar la aplicación


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=True)
    try:
        yield
    finally:
        pool.close()

app = FastAPI(lifespan=lifespan)

# --- AÑADIR CONFIGURACIÓN DE CORS ---
app.add_middleware(
    CORSMiddleware,
    # En producción puedes acotarlo al dominio de tu frontend
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------------------------

app.include_router(procesos_router.router,
                   prefix="/procesos", tags=["Procesos"])
app.include_router(auth_router.router, prefix="/auth", tags=["Autenticación"])


# ----------CLI DE PRUEBA--------
def mostrar_tabla_procesos(procesos):
    """Muestra una lista de procesos agrupados con formato de tabla."""
    print(f"\n{'NOMBRE':<35} | {'PIDs':<20} | {'CPU (%)':<8} | {'RAM (%)':<8}")
    print("-" * 80)
    for p in procesos:
        pids_str = ", ".join(map(str, p["pids"]))
        if len(pids_str) > 18:
            pids_str = pids_str[:15] + "..."
        print(
            f"{p['name']:<35} | {pids_str:<20} | {p['cpu_percent']:<8.2f} | {p['memory_percent']:<8.2f}")
    print("-" * 80)
    print(f"Total de procesos agrupados: {len(procesos)}\n")


def menu():
    """Menú interactivo por consola para probar el monitoreo de procesos."""
    while True:
        print("\n" + "=" * 52)
        print("          SISTEMA DE MONITOREO DE PROCESOS          ")
        print("=" * 52)
        print("1. Listar procesos del sistema")
        print("2. Buscar un proceso en particular en el sistema")
        print("3. Agregar / actualizar proceso en la base de datos")
        print("4. Ver procesos registrados en la base de datos")
        print("5. Quitar proceso de la base de datos (seguimiento)")
        print("0. Salir")
        print("=" * 52)

        opcion = input("Seleccione una opción: ").strip()

        if opcion == "1":
            print("\nObteniendo y calculando métricas de procesos en el sistema...")
            raw = procesos_controller.listar_procesos_sistema()
            agrupados = procesos_controller._agrupar_procesos_por_nombre(raw)
            agrupados.sort(key=lambda x: x["name"].lower())
            mostrar_tabla_procesos(agrupados)

        elif opcion == "2":
            nombre = input(
                "\nIngrese el nombre del proceso a buscar (ej. explorer.exe): ").strip()
            if not nombre:
                print("Nombre no válido.")
                continue
            print(f"Buscando '{nombre}' en el sistema...")
            encontrado = procesos_controller.buscar_proceso_en_sistema(nombre)
            if encontrado:
                print("\n[PROCESO ENCONTRADO EN EL SISTEMA]")
                print(f"  Nombre: {encontrado['name']}")
                print(f"  PIDs:   {', '.join(map(str, encontrado['pids']))}")
                print(f"  CPU:    {encontrado['cpu_percent']}%")
                print(f"  RAM:    {encontrado['memory_percent']}%")
            else:
                print(
                    f"\n[NO ENCONTRADO] El proceso '{nombre}' no está ejecutándose en el sistema.")

        elif opcion == "3":
            procesos_controller.verificar_y_actualizar_proceso_cli()

        elif opcion == "4":
            procesos_db = procesos_controller.obtener_procesos_db()
            if not procesos_db:
                print("\nNo hay procesos registrados en la base de datos.")
            else:
                print(f"\n{'NOMBRE':<35} | {'ESTADO':<15}")
                print("-" * 55)
                for p in procesos_db:
                    print(f"{p['nombre']:<35} | {p['estado']:<15}")
                print("-" * 55)
                print(f"Total en base de datos: {len(procesos_db)}")

        elif opcion == "5":
            procesos_controller.eliminar_proceso_db_cli()

        elif opcion == "0":
            print("\nSaliendo del sistema...")
            break

        else:
            print("\nOpción no válida. Por favor ingrese un número del 0 al 5.")


def main():
    menu()


if __name__ == "__main__":
    main()
