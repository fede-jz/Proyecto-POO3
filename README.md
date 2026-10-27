# Proyecto-POO3
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
