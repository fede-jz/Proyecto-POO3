import asyncio
import os
import threading
from contextlib import asynccontextmanager
from db import pool
from controllers import procesos_controller, telegram_controller
from routers import procesos_router, auth_router, alertas_router, usuarios_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#-----------API----------------
# Ciclo de vida (Lifespan) de FastAPI, inicializa y cierra el pool de conexiones al iniciar y apagar la aplicación
@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=True)
    app.state.procesos_cache = {"procesos": [], "cpuTotal": 0.0, "ramTotal": 0.0}
    worker_task = asyncio.create_task(procesos_controller.guardar_procesos_en_cache(app))
    # Bot de Telegram en un hilo aparte (recibe los /start y /vincular de los usuarios)
    detener_bot = threading.Event()
    telegram_controller.iniciar_bot(detener_bot)
    try:
        yield
    finally:
        # Al apagar el servidor frenamos el bot, cerramos la pool y cancelamos la tarea del worker
        detener_bot.set()
        pool.close()
        worker_task.cancel()
        await asyncio.gather(worker_task, return_exceptions=True)

app = FastAPI(lifespan=lifespan)

# CORS: orígenes del frontend separados por coma; si no está en el .env se usa el servidor de desarrollo de Vite
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origen.strip() for origen in CORS_ORIGINS],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(procesos_router.router, prefix="/procesos", tags=["Procesos"])
app.include_router(auth_router.router, prefix="/auth", tags=["Autenticación"])
app.include_router(alertas_router.router, prefix="/alertas", tags=["Alertas"])
app.include_router(usuarios_router.router, prefix="/usuarios", tags=["Usuarios"])