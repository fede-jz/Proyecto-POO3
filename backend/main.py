from contextlib import asynccontextmanager
from db import pool
from controllers import procesos_controller
from routers import procesos_router, auth_router
from fastapi import FastAPI

#-----------API----------------
# Ciclo de vida (Lifespan) de FastAPI, inicializa y cierra el pool de conexiones al iniciar y apagar la aplicación
@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open(wait=True)
    try:
        yield
    finally: 
        pool.close()

app = FastAPI(lifespan=lifespan)

app.include_router(procesos_router.router, prefix="/procesos", tags=["Procesos"])
app.include_router(auth_router.router, prefix="/auth", tags=["Autenticación"])
