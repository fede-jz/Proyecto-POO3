-- Active: 1791870109213@@127.0.0.1@5432@monitoreo
CREATE TABLE usuarios (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) NOT NULL UNIQUE,
    contrasenia_hash        VARCHAR(255) NOT NULL,
    nombre                  VARCHAR(100) NOT NULL,
    rol                     VARCHAR(20)  NOT NULL DEFAULT 'Visualizador',
    telegram_chat_id        BIGINT UNIQUE,
    telegram_cod            VARCHAR(20),
    telegram_cod_expira_en  TIMESTAMPTZ,
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuarios_rol CHECK (rol IN ('Administrador', 'Operador de Guardia', 'Visualizador'))
);

CREATE TABLE procesos (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre  VARCHAR(255) NOT NULL UNIQUE,
    estado  VARCHAR(20)  NOT NULL DEFAULT 'desconocido'
);

CREATE TABLE alertas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proceso_id          UUID REFERENCES procesos(id) ON DELETE CASCADE,     -- NULL = alerta global del servidor
    creado_por          UUID REFERENCES usuarios(id) ON DELETE SET NULL,    -- Administrador que creó la alerta
    tipo                VARCHAR(10) NOT NULL CHECK (tipo IN ('caida', 'cpu', 'ram')),
    valor_limite        REAL,                        -- porcentaje; NULL para 'caida'
    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_alerta_en    TIMESTAMPTZ,
    CONSTRAINT ck_alertas_valor_limite CHECK ( -- Chequea si es caída => no hay límite; si es cpu o ram => límite entre 0 y 100
        (tipo = 'caida' AND valor_limite IS NULL)
        OR (tipo IN ('cpu', 'ram') AND valor_limite BETWEEN 0 AND 100)
    ),
    CONSTRAINT ck_alertas_global_sin_caida CHECK (proceso_id IS NOT NULL OR tipo <> 'caida'),  -- el servidor no tiene 'caida'
    CONSTRAINT uq_alerta_tipo UNIQUE NULLS NOT DISTINCT (proceso_id, tipo)  -- una regla por tipo por proceso, y una global por tipo
);

CREATE TABLE eventos (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alerta_id        UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
    tipo_evento      VARCHAR(20) NOT NULL,
    valor_detectado  REAL,
    notificado       BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE historial (
    proceso_id      UUID        NOT NULL REFERENCES procesos(id) ON DELETE CASCADE,
    registrado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ram_porcentaje  REAL        NOT NULL,
    cpu_porcentaje  REAL        NOT NULL,
    PRIMARY KEY (proceso_id, registrado_en)
);