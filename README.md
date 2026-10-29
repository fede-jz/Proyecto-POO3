# SysMonitor — Monitoreo de procesos del servidor

Proyecto de Programación Orientada a Objetos III.

SysMonitor es una aplicación web que monitorea en tiempo real los procesos y el consumo de recursos (CPU y RAM) de la máquina donde corre el backend, y avisa cuando se superan umbrales configurados o cuando se cae un proceso, tanto en la web como por Telegram.

---

## Funcionalidades

- **Registro e inicio de sesión** con JWT.
- **Procesos del sistema:** lista de procesos agrupados por nombre con su consumo de CPU y RAM, uso total del servidor y gráfico de consumo. Se actualiza cada 5 segundos. Incluye buscador y etiquetas.
- **Alertas** (solo las crea/modifica un Administrador, las ven todos):
  - **Globales del servidor:** CPU o RAM total por encima de un porcentaje. Se configuran en *Ajustes → General*.
  - **Por proceso:** CPU o RAM de un proceso por encima de un porcentaje, o **caída** del proceso (deja de estar corriendo).
- **Eventos:** cada vez que una alerta se dispara se registra un evento. Se ven en la sección *Alertas*, se pueden **reconocer** (marcar que alguien se está ocupando) y un Administrador los puede eliminar.
- **Notificaciones por Telegram:** cada usuario puede vincular su Telegram desde *Ajustes → Perfil* y recibe los eventos en su celular.
- **Gestión de miembros y roles** en *Ajustes → Roles*.

### Roles

| Acción | Administrador | Operador de Guardia | Visualizador |
|---|:---:|:---:|:---:|
| Ver procesos, alertas y eventos | ✅ | ✅ | ✅ |
| Reconocer eventos | ✅ | ✅ | ✅ |
| Vincular su Telegram y recibir alertas | ✅ | ✅ | ✅ |
| Crear, editar y borrar alertas / umbrales globales | ✅ | ❌ | ❌ |
| Eliminar eventos | ✅ | ❌ | ❌ |
| Cambiar el rol de otros miembros | ✅ | ❌ | ❌ |

Todo usuario nuevo se registra como **Visualizador**. Los administradores se asignan a mano en la base de datos (ver [Crear un administrador](#4-crear-un-administrador)).

---

## Tecnologías

- **Backend:** Python, FastAPI, psycopg (PostgreSQL), psutil, PyJWT.
- **Frontend:** React + Vite.
- **Base de datos:** PostgreSQL **15 o superior**.
- **Notificaciones:** API de bots de Telegram.

### Estructura del repositorio

```
backend/
├── main.py              # App FastAPI: CORS, routers y tareas de fondo (worker de procesos y bot de Telegram)
├── db.py                # Pool de conexiones a PostgreSQL (lee DATABASE_URL del .env)
├── seed.sql             # Script que crea las tablas
├── routers/             # Endpoints HTTP
├── controllers/         # Lógica de negocio (monitor de alertas, Telegram, autenticación, ...)
├── repositories/        # Consultas SQL
└── schemas/             # Modelos de entrada/salida (Pydantic)
frontend/
└── src/
    ├── vistas/          # Login, Registro y Dashboard
    ├── componentes/     # Tablas, gráficos y menú de ajustes
    └── services/        # Llamadas al backend
```

---

## Requisitos previos

- **Python 3.12 o superior** (probado con 3.13).
- **Node.js 20.19 o superior** (probado con 24) y npm.
- **PostgreSQL 15 o superior** (local o en la nube). Es obligatorio que sea 15+: el esquema usa `UNIQUE NULLS NOT DISTINCT`.
- Opcional: **Telegram** (en el celular o Telegram Desktop) para probar las notificaciones.

---

## ⚠️ Variables de entorno (`.env`)

El backend lee su configuración de un archivo **`backend/.env`**. Ese archivo **no está en el repositorio** porque contiene contraseñas y tokens: **pedile las variables a cualquier integrante del grupo** y armá el archivo vos. En `backend/.env.example` está la plantilla con todas las variables.

| Variable | Obligatoria | Para qué sirve |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Conexión a PostgreSQL, por ejemplo `postgresql://usuario:contraseña@localhost:5432/monitoreo`. Si usás tu propia base local, armala con tus datos. |
| `CORS_ORIGINS` | ❌ | Orígenes del frontend que pueden llamar a la API, separados por coma. Si no se define, se usa `http://localhost:5173`. |
| `TELEGRAM_BOT_TOKEN` | ❌ | Token del bot de Telegram. **Si queda vacío, Telegram se desactiva** y todo lo demás funciona igual. |
| `TELEGRAM_BOT_USUARIO` | ❌ | Usuario del bot **sin la @ y terminado en `bot`** (ej: `mi_monitor_bot`). No es el nombre visible del bot. |

Cosas a tener en cuenta:

- **No subas el `.env` al repositorio ni lo compartas en lugares públicos.** Ya está incluido en el `.gitignore`.
- El `.env` se lee **solo al arrancar el backend**: si lo cambiás, reiniciá el backend.
- El token de un bot de Telegram solo puede estar en uso por **un backend a la vez**. Si dos personas levantan el backend con el mismo token, se van a "robar" los mensajes de vinculación. Para probar en paralelo, cada uno puede crear su propio bot con [@BotFather](https://t.me/BotFather) (`/newbot`).

---

## Puesta en marcha

Los comandos están escritos para **Windows (PowerShell)**; en Linux/macOS se indica la variante.

### 1. Base de datos

Si te pasaron un `DATABASE_URL` de una base ya preparada (por ejemplo, la compartida del grupo), salteá este paso.

Para usar una base propia, creá una base vacía y ejecutá `backend/seed.sql` sobre ella:

```bash
psql -U postgres -c "CREATE DATABASE monitoreo;"
psql -U postgres -d monitoreo -f backend/seed.sql
```

(También se puede ejecutar `seed.sql` desde pgAdmin, DBeaver o la extensión de PostgreSQL de VS Code.)

### 2. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1          # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
# Crear backend/.env (ver la sección de variables de entorno)
uvicorn main:app --reload
```

El backend queda en **http://localhost:8000**. Al arrancar, en la consola se ve `Worker iniciado` y, si Telegram está configurado, `Bot de Telegram iniciado` (si no, `Telegram desactivado: ...`).

La documentación interactiva de la API está en **http://localhost:8000/docs** (Swagger). Para probar endpoints protegidos: hacé login con `POST /auth/login`, copiá el `access_token` y pegalo en el botón **Authorize**.

> El frontend tiene la URL `http://localhost:8000` fija en el código, así que el backend tiene que correr en el puerto **8000**.

### 3. Frontend

En otra terminal:

```powershell
cd frontend
npm install
npm run dev
```

El frontend queda en **http://localhost:5173**.

### 4. Crear un administrador

1. Registrate desde la web (*Crear cuenta*). Vas a quedar como **Visualizador**.
2. Ejecutá en la base de datos, con tu email:

   ```sql
   UPDATE usuarios SET rol = 'Administrador' WHERE email = 'tu@email.com';
   ```

3. Cerrá sesión y volvé a entrar (o abrí *Ajustes*, que vuelve a leer tu perfil).

Desde ese usuario podés cambiar el rol de los demás en *Ajustes → Roles*.

### 5. (Opcional) Vincular Telegram

1. Con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_BOT_USUARIO` configurados, entrá a *Ajustes → Perfil → Vincular con Telegram*.
2. Tocá **"Abrir Telegram"** y en el chat del bot tocá **Iniciar**.
   - El link abre la app de Telegram. Si en la computadora no tenés Telegram Desktop, el botón de la página de Telegram no hace nada: abrí el link en el celular, o buscá al bot en cualquier Telegram y mandale el comando `/vincular CÓDIGO` que aparece en la pantalla.
3. El bot responde *"✅ Listo, ... Tu cuenta quedó vinculada"*. Volvé a la web y tocá **Comprobar estado**.

El código de vinculación vence a los 10 minutos.

---

## Cómo funciona el monitoreo

- El backend **mide la máquina donde corre él**, no la del navegador. Si el frontend se abre desde otra computadora, se ven los procesos del servidor.
- Cada **5 segundos** un proceso de fondo lee los procesos del sistema, calcula el uso total y **evalúa todas las alertas activas**.
- **CPU / RAM:** se genera **un evento cuando el valor empieza a superar el límite**. Mientras siga por encima no se repite (es el mismo incidente); cuando vuelve por debajo, la alerta queda lista para el próximo. Si se edita la alerta con `PUT /alertas/{id}` (cambiar el límite o desactivarla), se vuelve a evaluar desde cero; cambiar los umbrales globales desde *Ajustes → General* solo actualiza el límite.
- **Caída de proceso:** el estado de cada proceso con alerta pasa de `desconocido` a `activo` (corriendo) o `inactivo` (caído). Se genera un evento cuando pasa a `inactivo`. Si se crea una alerta de caída sobre un proceso nuevo que no está corriendo, el evento se genera en el siguiente ciclo.
- No se avisa cuando una alerta se normaliza: solo cuando empieza un problema.
- Cada evento se envía por Telegram a **todos los usuarios vinculados**. El detalle del evento en la web indica si se envió.

---

## Endpoints principales

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/auth/registro` | público | Crear cuenta |
| POST | `/auth/login` | público | Iniciar sesión (devuelve `access_token` y el usuario) |
| GET | `/auth/me` | logueado | Usuario actual |
| POST | `/auth/telegram/codigo` | logueado | Código para vincular Telegram |
| GET | `/procesos/sistema` | logueado | Procesos en ejecución y uso total de CPU/RAM |
| GET | `/usuarios/` | logueado | Lista de miembros |
| PUT | `/usuarios/{id}/rol` | admin | Cambiar el rol de un miembro |
| GET | `/alertas/` | logueado | Lista de alertas |
| POST | `/alertas/` | admin | Crear alerta (sin `nombre_proceso` = global del servidor) |
| GET / PUT / DELETE | `/alertas/{id}` | logueado / admin / admin | Ver, editar (límite o activa) y borrar una alerta |
| GET / PUT | `/alertas/globales` | logueado / admin | Umbrales globales de CPU y RAM |
| GET | `/alertas/eventos` | logueado | Últimos eventos |
| PUT | `/alertas/eventos/{id}/reconocer` | logueado | Reconocer un evento |
| DELETE | `/alertas/eventos/{id}` | admin | Eliminar un evento |

> Las alertas **por proceso** todavía no tienen pantalla en el frontend: para probarlas, crealas desde Swagger (`/docs`) con `POST /alertas/`, por ejemplo `{"nombre_proceso": "chrome", "tipo": "ram", "valor_limite": 10}` o `{"nombre_proceso": "notepad", "tipo": "caida"}`. El nombre se completa con `.exe` si no lo tiene.

---

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| El backend no arranca: `KeyError: 'DATABASE_URL'` | Falta `backend/.env` o no tiene `DATABASE_URL`. |
| El backend no arranca: error de conexión a la base | La base no está levantada o el `DATABASE_URL` es incorrecto. |
| Login o registro dan error 500 | La base tiene un esquema viejo: recreala con el `seed.sql` actual. |
| En el navegador aparece *"blocked by CORS policy"* | El frontend no corre en `http://localhost:5173`: agregá su origen a `CORS_ORIGINS`. |
| La web dice *"Servidor: OFFLINE"* | El backend no está corriendo en el puerto 8000, o la sesión venció (volvé a iniciar sesión). |
| "Vincular con Telegram" da *"Telegram no está configurado"* | Faltan `TELEGRAM_BOT_TOKEN` o `TELEGRAM_BOT_USUARIO` en el `.env` (y reiniciar el backend). |
| El link de Telegram abre una cuenta que no es el bot | `TELEGRAM_BOT_USUARIO` tiene el nombre visible del bot en vez de su usuario (el que termina en `bot`). |
| No llegan eventos aunque se supere un umbral | La alerta ya estaba disparada (mismo incidente). Bajá el consumo por debajo del límite, o editá la alerta con `PUT /alertas/{id}` (desde `/docs`) para que se reevalúe. |
| Un cambio en el código del frontend no se refleja | Recargá con Ctrl+F5 o reiniciá `npm run dev`. |
