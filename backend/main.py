import threading
from contextlib import asynccontextmanager
from db import pool
from controllers import procesos_controller, alertas_controller
from routers import procesos_router, auth_router, alertas_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ----------- CICLO DE VIDA (LIFESPAN) -----------


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Abrir pool de base de datos al iniciar
    pool.open(wait=True)

    # 2. INICIAR EL MONITOR EN SEGUNDO PLANO
    hilo_monitor = threading.Thread(
        target=alertas_controller.iniciar_bucle_monitoreo, daemon=True)
    hilo_monitor.start()

    try:
        yield
    finally:
        # 3. Cerrar pool al apagar la app
        pool.close()

app = FastAPI(lifespan=lifespan)

# --- CONFIGURACIÓN DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -----------------------------

app.include_router(procesos_router.router,
                   prefix="/procesos", tags=["Procesos"])
app.include_router(auth_router.router, prefix="/auth", tags=["Autenticación"])
app.include_router(alertas_router.router, prefix="/alertas", tags=["Alertas"])
