# PortalUNP
Grupo Curso Integrador I: Sistemas Software

Portal de admisión con **Node.js + Express + MySQL**. El frontend (HTML/CSS/JS) está en `public/`.

## Puesta en marcha

1. `npm install`
2. Copia `.env.example` como `.env` (Windows: `copy .env.example .env`) y completa:
   - `DB_USER` / `DB_PASSWORD`: tu usuario de MySQL.
   - `JWT_SECRET`: genera uno con
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. `npm run db:init` crea la base de datos y las tablas.
   (Si ya tenías la base de la versión anterior: `npm run db:reset`, que la **borra** y la recrea.)
4. `npm start` (o `npm run dev` para reinicio automático)
5. Abre **http://localhost:3000** — ya no se abre `index.html` con doble clic.

## Flujo de registro (3 pasos)

| Paso | Pantalla | Endpoint | Qué guarda |
|------|----------|----------|-----------|
| 1 | Datos básicos | `POST /api/registro/basico` | Nombres, apellidos, correo personal (borrador) · P01 Confirmado |
| 2 | Pasarela de pago | `POST /api/registro/pago` | Pago simulado (referencia y monto los fija el servidor) · P02 Validado |
| 3 | Verificación | `POST /api/registro/completar` | DNI, teléfono, contraseña (bcrypt), foto, DNI frente y reverso · P03 Confirmado · crea el correo institucional e inicia sesión |

Entre los pasos 1 y 3 el navegador lleva una cookie temporal `registro` (24 h). Si el postulante
recarga la página, vuelve a enviar el paso 1 con el mismo correo y retoma donde iba (si ya pagó,
salta directo al paso 3).

## Otros endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/login | Inicia sesión (cookie `token` httpOnly, 2 h) |
| POST | /api/logout | Cierra sesión |
| GET | /api/me | Datos, etapas y pago del postulante |
| GET | /api/me/foto | Foto del postulante autenticado |

## Estructura

```
public/            Frontend del equipo (index.html, app.js, styles.css, img/)
server/
  server.js        Arranque de Express
  config.js        Lectura del .env y monto de inscripción
  db/              pool, schema.sql, init.js
  routes/          auth.js (login/logout) · registro.js (3 pasos) · perfil.js
  middleware/      auth.js (sesión y registro en curso)
  lib/             utils, session (JWT), limiters, perfil
uploads/           Fotos y DNI subidos (no se versiona ni es público)
```

## Verificar un DNI manualmente (hasta tener panel de administración)

```sql
USE portal_unp;
-- Ver postulantes con registro completo y sus archivos
SELECT id, nombres, apellidos, dni, email FROM postulantes WHERE registro_completo = 1;
-- Marcar la identidad como verificada (P03 -> Validado)
UPDATE postulante_etapas SET estado='Validado', fecha=CURDATE()
 WHERE postulante_id=1 AND etapa_codigo='P03';
```

## Pendiente / siguientes pasos

- **Pasarela de pago real** (Culqi, Niubiz, Izipay...): hoy el pago es simulado. Con una pasarela real,
  el navegador envía la tarjeta a la pasarela (nunca a este servidor) y el pago se confirma por el
  *webhook* de la pasarela.
- Panel de administración para verificar DNI (comparar nombres con las fotos) y ver pagos.
- Verificar el correo personal con un código (evita retomar registros ajenos y permite recuperar contraseña).
- Selección de área y turno con cupo, y ticket PDF con QR (etapa P04).
- HTTPS y `NODE_ENV=production` al desplegar.
