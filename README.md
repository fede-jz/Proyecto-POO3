# MERGE: develop + feature/bot-y-alertas
Esta rama es la fusión entre las ramas: develop y feature/bot-y-alertas.
Hay revisiones que hacer en los archivos del backend:

## auth_controller.py
En `auth_controller.py` quedaron mezcladas dos versiones del controlador. No todas sus funciones se duplican exactamente, pero sí hay responsabilidades repetidas y, en algunos casos, comportamientos incompatibles.

### Lo que corregiría primero

1. **`registrar_usuario` guarda al usuario dos veces.**  
   En `registrar_usuario`, el primer bloque crea el usuario y también las alertas predeterminadas; luego, otro bloque abre una conexión y vuelve a insertar el mismo correo. Lo segundo sobra: probablemente provoca un error por correo duplicado. Conservá el primer bloque y eliminá el segundo; devolvé `nuevo_usuario` al final.

2. **Hay dos maneras de crear y validar JWT, con configuraciones distintas.**  
   `crear_token_acceso`/`verificar_token` usan una clave fija (`SECRET_KEY`), mientras que `crear_token`/`obtener_usuario_actual` usan otra (`JWT_SECRET_KEY`). Un token creado con una pareja no necesariamente será aceptado por la otra.  
   **Quedate con una sola clave y un solo flujo.** Recomiendo configurar la clave desde el entorno y usar el mismo método de creación para registro y login, y el mismo método de validación para las rutas protegidas. Después, eliminá los métodos duplicados y adaptá sus llamadas.

3. **La respuesta de login no coincide con los contratos que aparecen en las rutas y los esquemas.**  
   `iniciar_sesion` ya devuelve `access_token`, `token_type` y `usuario`; la versión alternativa de la ruta espera que devuelva solo el usuario y genera otro token. Además, `auth_router.py` y `usuario_schema.py` todavía tienen marcadores de conflicto. Hay que resolverlos y elegir **un único formato de respuesta** antes de decidir cuáles métodos eliminar.

4. **`iniciar_sesion` normaliza el correo dos veces.**  
   También tiene una asignación antes del docstring; en esa posición, el texto ya no cuenta como docstring de la función. Dejá el docstring primero y una única normalización.

5. **`escapar_caracteres` no es una protección apropiada para estos datos.**  
   Las consultas del repositorio usan parámetros SQL; escapar HTML aquí no es lo que evita inyección SQL y puede guardar nombres transformados (`&` convertido en `&amp;`). Normalizá el correo y validá los campos en el esquema; escapá HTML al presentar texto en una página, si corresponde. No modifiques la contraseña con `strip` o escape HTML.

6. **SHA-256 no es adecuado para guardar contraseñas.**  
   `hash_contrasenia` calcula un hash rápido y sin sal; conviene migrar a un algoritmo específico para contraseñas, como Argon2id o bcrypt. Esto requiere una dependencia adecuada y contemplar los hashes ya almacenados antes de reemplazarlo.

### Cambios concretos en este archivo

Para el registro, la estructura debería quedar conceptualmente así: **una sola transacción que cree usuario, relación y alertas, y luego devuelva el usuario creado**.

```python
@classmethod
def registrar_usuario(cls, data: UsuarioCreate) -> dict:
    email = data.email.strip().lower()
    nombre = data.nombre.strip()
    contrasenia_hasheada = cls.hash_contrasenia(data.contrasenia)

    # La comprobación previa puede dar un error amigable,
    # pero la base también debe tener una restricción UNIQUE para email.
    if cls.verificar_usuario_existe(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario registrado con ese correo.",
        )

    with pool.connection() as conn:
        nuevo_usuario = usuarios_repositorio.crear(
            conn=conn,
            email=email,
            contrasenia_hash=contrasenia_hasheada,
            nombre=nombre,
        )

        # Mantener aquí, dentro de la misma transacción,
        # la creación del proceso, la relación y las alertas por defecto.

    return nuevo_usuario
```

En particular, eliminá el bloque final que vuelve a llamar a `usuarios_repositorio.crear(...)`. Si conservás la comprobación previa de correo, tené en cuenta que no evita por sí sola carreras entre dos registros simultáneos: debe existir también una restricción única en la base de datos.

Para el login, dejá una sola normalización y colocá el docstring al comienzo:

```python
@classmethod
def iniciar_sesion(cls, data: UsuarioLogin) -> dict:
    """Valida las credenciales y devuelve la respuesta de autenticación acordada."""
    email = data.email.strip().lower()
    usuario = cls.obtener_usuario_por_email(email)

    if not usuario or not cls.verificar_contrasenia(
        data.contrasenia,
        usuario["contrasenia_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El correo electrónico o la contraseña son incorrectos.",
        )

    usuario_seguro = {
        clave: valor
        for clave, valor in usuario.items()
        if clave != "contrasenia_hash"
    }

    # Generar el token y devolver aquí el formato acordado con el router y el esquema.
```

**Qué funciones conservar o quitar:**

- **Conservar:** `registrar_usuario`, `iniciar_sesion`, `obtener_usuario_por_email`, `obtener_usuario_por_id`, `generar_codigo_telegram` y una sola función de creación/validación JWT.
- **Quitar o unificar:** `crear_token_acceso` y `crear_token`; `verificar_token` y la validación dentro de `obtener_usuario_actual`. No elimines una hasta adaptar las rutas que la llaman.
- **Probablemente quitar:** `_asegurar_pool_abierto`, que inspecciona el atributo privado `pool._opened`. Si el ciclo de vida de FastAPI ya abre el pool al iniciar la app, el controlador no debería abrirlo por su cuenta.
- **Quitar tras revisar sus usos:** `get_current_user_dependency` y su `HTTPBearer` local si el router ya resuelve la autenticación directamente; también el alias `AuthController` si ningún consumidor lo utiliza.

No eliminé nada porque el formato definitivo de registro/login depende de resolver también las rutas y los esquemas; mantener ambos contratos en paralelo dejaría la autenticación inconsistente.


## usuario_schema.py
Relacionado al archivo auth_controller.py
Hay que definir con cuales clases nos quedamos y cuales descartamos o si las unificamos.
```python
#=============REVISAR QUE SE QUEDA Y QUE SE VA=============================
# NUEVO: Esquema para devolver el token junto al perfil validado de UsuarioOut
class LoginRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioLoginResponse(BaseModel):
    token: str
    usuario: UsuarioOut
```

## procesos_router.py

```python
#REVISAR CUAL LISTAR PROCESOS SE QUEDA
@router.get("/sistema")
def listar_procesos_sistema():
    # Obtiene la lista de procesos agrupados como siempre
    lista_procesos = procesos_controller._agrupar_procesos_por_nombre(
        procesos_controller.listar_procesos_sistema()
    )

    # Devuelve tanto la lista para la tabla como los totales unificados
    return {
        "procesos": lista_procesos,
        "cpuTotal": METRICAS_ACTUALES["cpu"],
        "ramTotal": METRICAS_ACTUALES["ram"]
    }

def listar_procesos_sistema(request: Request, current_user: dict = Depends(auth_controller.get_current_user_dependency)):
    return request.app.state.procesos_cache
```

## procesos_controller.py
```python
#===============REVISAR SI SE QUEDA O SE VA===============================       
        proceso = procesos_repositorio.buscar_por_id(conn, proceso_id)
    if not proceso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El proceso no existe."
        )
    return proceso
```

## alertas_repositorio.py
```python
#====================ESTO DEBERÍA ESTAR ACÁ?==============================

def obtener_o_crear_usuario_proceso(conn, usuario_id, proceso_id):
    # El DO UPDATE no cambia nada, pero hace que RETURNING devuelva el id también cuando la relación ya existe
    return conn.execute(
        """
        INSERT INTO usuarios_procesos (usuario_id, proceso_id)
        VALUES (%s, %s)
        ON CONFLICT (usuario_id, proceso_id) DO UPDATE SET usuario_id = EXCLUDED.usuario_id
        RETURNING *
        """,
        (usuario_id, proceso_id)
    ).fetchone()

def crear(conn, usuario_proceso_id, tipo, valor_limite = None):
    return conn.execute(
        """
        INSERT INTO alertas (usuario_proceso_id, tipo, valor_limite)
        VALUES (%s, %s, %s)
        RETURNING *
        """,
        (usuario_proceso_id, tipo, valor_limite)
    ).fetchone()
```
# MERGE: fusion-backend + feature/bot-y-alertas

## auth_router.py
## Conversación con Copilot

#### Pregunta 1/2:
CUAL DEBERÍA QUEDARSE? SI ELIMINO router.get con return usuario sería un problema?
```python
@router.get("/me", response_model=usuario_schema.UsuarioOut)
def obtener_perfil_actual(usuario: dict = Depends(obtener_usuario_autenticado)):
    return usuario

@router.get("/me", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return auth_controller.obtener_usuario_actual(credentials.credentials)
```

#### Respuesta 1/2:
Dejá **un solo `GET /me`**. Te recomiendo conservar el primero:

```python
@router.get("/me", response_model=usuario_schema.UsuarioOut)
def obtener_perfil_actual(usuario: dict = Depends(obtener_usuario_autenticado)):
    return usuario
```

y eliminar el segundo bloque que también registra `GET /me`. Al estar duplicadas la ruta y el método, FastAPI puede atender la primera y dejar la segunda inaccesible; además, la duplicación puede causar confusión en la documentación de la API.

**No elimines `obtener_usuario_autenticado`**: aunque borres el endpoint que devuelve `usuario`, esa dependencia sigue protegiendo otras rutas. El cambio sería quitar solamente el segundo `@router.get("/me", ...)` y su función en `auth_router.py`.

#### Pregunta 2/2:

no termino de comprender ¿estás diciendo que el router.get con return usuario es más usado que el router.get con return return auth_controller.obtener_usuario_actual(credentials.credentials) y por eso debo conservar el primero a pesar de que parezca más seguro dejar el segundo?

#### Respuesta 2/2:
No. **No quise decir que el primero esté “más usado”**, y mi recomendación anterior fue demasiado rápida. La seguridad no depende de si la función devuelve `usuario` directamente o llama al controlador: depende de cómo se valida el token.

Al revisar el proyecto, sí hay una diferencia importante: el primer endpoint usa `obtener_usuario_autenticado`, que valida el token con `verificar_token`. El inicio de sesión actual genera tokens con esa misma configuración. En cambio, el segundo endpoint los valida con `JWT_SECRET_KEY` y `JWT_ALGORITHM`, que pueden ser distintos; con los valores predeterminados del código, son distintos. Por eso, **conservar solo el segundo podría hacer que `/me` rechace los tokens actuales**.

Así que, tal como está hoy el proyecto, conservaría el primero y eliminaría el segundo bloque `GET /me` de `auth_router.py`. No porque se use más, sino porque su validación coincide con la generación actual de tokens. La otra opción sería unificar la generación y validación de tokens antes de cambiar al segundo.

#### Resolución:
Dejé todo lo "duplicado" o lo que genera conflicto debajo. Estos endpoint son los que generó Agus (si no mal recuerdo), el tema es que para utilizarlos habría que modificar el código que ya armó Cami para la parte de registro e inicio de sesión que ya está completo. 

A menos que haya alguna justificación como "es más seguro esta práctica" o "lo necesitamos para la implementación de otras funcionalidades o el correcto funcionamiento de la aplicación", me parece que habría que borrar todo este bloque de código y realizar cambios en donde sea necesario para que únicamente se usen los endpoints que creamos previamente y ya están en uso (ya están implementados).

> [!IMPORTANT]
> **Importante:** POR EL MOMENTO TODO ESTE CÓDIGO PERMANECE DESACTIVADO PARA NO CAUSAR INCONVENIENTES

```python
#==================REVISAR QUE SE QUEDA Y QUE SE QUITA========================
#-- ESTÁ VINCULADO CON USUARIO_SCHEMA.PY, USUARIO_REPOSITORIO.PY Y AUTH_CONTROLLER.PY


@router.post("/registro", response_model=usuario_schema.UsuarioLoginResponse, status_code=status.HTTP_201_CREATED)
def registrar_usuario(data: usuario_schema.UsuarioCreate):
    usuario = auth_controller.registrar_usuario(data)
    token = auth_controller.crear_token(usuario)
    return {
        "token": token,
        "usuario": usuario,
    }


@router.post("/login", response_model=usuario_schema.UsuarioLoginResponse, status_code=status.HTTP_200_OK)
def iniciar_sesion(data: usuario_schema.UsuarioLogin):
    usuario = auth_controller.iniciar_sesion(data)
    token = auth_controller.crear_token(usuario)
    return {
        "token": token,
        "usuario": usuario,
    }


@router.get("/me", response_model=usuario_schema.UsuarioOut, status_code=status.HTTP_200_OK)
def obtener_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return auth_controller.obtener_usuario_actual(credentials.credentials)
```

## alertas_repositorio.py

En `alertas_repositorio.py` **no veo funciones duplicadas que convenga eliminar sin más**. Varias operan sobre alertas o eventos, pero resuelven tareas distintas. Además, todas las funciones implementadas tienen al menos un uso identificado en un router o controlador.

### Funciones que parecen solaparse, pero cumplen roles distintos

- `actualizar_limite` y `actualizar_umbrales_usuario` actualizan límites, pero no son duplicados: una cambia **una alerta por ID**; la otra cambia los valores de **CPU y RAM de un usuario**. Los endpoints correspondientes están en `alertas_router.py`.
- `eliminar_evento` elimina un evento; `marcar_evento_reconocido` lo conserva y marca como notificado. Son acciones diferentes.
- `obtener_o_crear_usuario_proceso` y `crear` participan juntas en el alta, pero crean registros distintos: la relación usuario-proceso y luego la alerta. Las usa `crear_alerta_db`.

### Problemas que requieren revisión, no eliminación

1. **Falta `eliminar` en el repositorio.** El router invoca `alertas_repositorio.eliminar(conn, alerta_id)` en `alertas_router.py`, pero esa función no está definida en el archivo. Al ejecutar ese endpoint, probablemente se producirá un `AttributeError` y una respuesta 500. No eliminaría el endpoint: hay que implementar la operación o corregir la referencia según el comportamiento deseado.

2. **Las consultas de listados parecen globales.** `listar_alertas` y `listar_eventos` no filtran por usuario. El endpoint que las usa permite el acceso a cualquier usuario autenticado, según su definición en `alertas_router.py`. Si los datos deben ser privados por usuario, habría que agregar ese filtro; no quitar las funciones.

3. **La actualización de umbrales no crea registros faltantes.** `obtener_umbrales_usuario` devuelve 80 como valor predeterminado si no hay filas, pero `actualizar_umbrales_usuario` solo hace `UPDATE`. Si esas filas no existen, la consulta no cambia nada aunque el endpoint devuelva los valores solicitados. Hay que decidir si se deben crear los registros faltantes.

4. **El repositorio hace `commit` dentro de `actualizar_umbrales_usuario`.** El router también hace `commit` después de llamarla (`alertas_router.py`). Conviene definir una sola capa como responsable de confirmar la transacción para mantener un límite transaccional claro.

