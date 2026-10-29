import os
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from pathlib import Path

# Carga .env buscando en la carpeta backend o en la raíz
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# Se crea un pool de máximo 5 conexiones
pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=5,
    kwargs={"row_factory": dict_row},  # las filas vuelven como dict en vez de tupla
    open=False,                        # Se tiene que abrir el pool explícitamente con pool.open() antes de usarlo
)