-- Tablas del Portal UNP v2 (la base de datos la crea "npm run db:init")
-- Flujo: 1) datos básicos  2) pago  3) registro completo (DNI, fotos, contraseña)

CREATE TABLE IF NOT EXISTS postulantes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- Paso 1
  nombres VARCHAR(80) NOT NULL,
  apellidos VARCHAR(80) NOT NULL,
  email_personal VARCHAR(120) NOT NULL,
  -- Paso 3 (NULL hasta que el postulante completa su registro)
  dni CHAR(8) NULL,
  telefono CHAR(9) NULL,
  email VARCHAR(120) NULL,              -- correo institucional
  password_hash VARCHAR(100) NULL,
  foto_archivo VARCHAR(100) NULL,
  dni_frente_archivo VARCHAR(100) NULL,
  dni_reverso_archivo VARCHAR(100) NULL,
  registro_completo TINYINT(1) NOT NULL DEFAULT 0,
  convocatoria VARCHAR(40) NOT NULL DEFAULT 'Admisión 2027-I',
  area VARCHAR(60) NOT NULL DEFAULT 'Por elegir',
  turno VARCHAR(40) NOT NULL DEFAULT 'Por elegir',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completado_en DATETIME NULL,
  UNIQUE KEY uq_postulantes_email_personal (email_personal),
  UNIQUE KEY uq_postulantes_dni (dni),
  UNIQUE KEY uq_postulantes_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pagos (nunca se guardan datos de tarjeta)
CREATE TABLE IF NOT EXISTS pagos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  postulante_id INT UNSIGNED NOT NULL,
  referencia VARCHAR(30) NOT NULL,
  monto DECIMAL(8,2) NOT NULL,
  estado ENUM('Pendiente','Validado') NOT NULL DEFAULT 'Pendiente',
  metodo VARCHAR(20) NOT NULL DEFAULT 'simulado',
  pagado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pagos_referencia (referencia),
  UNIQUE KEY uq_pagos_postulante (postulante_id),
  CONSTRAINT fk_pagos_postulante FOREIGN KEY (postulante_id)
    REFERENCES postulantes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo de etapas del proceso (P01..P04)
CREATE TABLE IF NOT EXISTS etapas (
  codigo CHAR(3) PRIMARY KEY,
  orden TINYINT UNSIGNED NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(160) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estado de cada etapa para cada postulante
CREATE TABLE IF NOT EXISTS postulante_etapas (
  postulante_id INT UNSIGNED NOT NULL,
  etapa_codigo CHAR(3) NOT NULL,
  estado ENUM('Pendiente','Confirmado','Validado') NOT NULL DEFAULT 'Pendiente',
  fecha DATE NULL,
  PRIMARY KEY (postulante_id, etapa_codigo),
  CONSTRAINT fk_pe_postulante FOREIGN KEY (postulante_id)
    REFERENCES postulantes (id) ON DELETE CASCADE,
  CONSTRAINT fk_pe_etapa FOREIGN KEY (etapa_codigo)
    REFERENCES etapas (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO etapas (codigo, orden, nombre, descripcion) VALUES
  ('P01', 1, 'Registro básico',                  'Nombres, apellidos y correo personal'),
  ('P02', 2, 'Pago de inscripción',              'Tasa procesada por pasarela segura'),
  ('P03', 3, 'Registro completo y verificación', 'DNI, foto y datos de identidad'),
  ('P04', 4, 'Confirmación y ticket digital',    'QR, aula, pabellón y puerta de ingreso');
