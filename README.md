# PortalUNP

Portal de admisión con Node.js, Express y MySQL. La interfaz se sirve desde `server/views/`.

## Puesta en marcha

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` como `.env` y configura `DB_USER`, `DB_PASSWORD` y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
3. Inicia MySQL.
4. Crea la base y sus tablas con `npm run db:init`.
5. Inicia el servidor con `npm start` o en modo de desarrollo con `npm run dev`.
6. Abre `http://localhost:3000`.

En PowerShell de Windows se puede usar `npm.cmd` en lugar de `npm` si la política de ejecución bloquea `npm.ps1`.

Para ejecutar las pruebas de servicio, usa `npm test`. Estas no necesitan una conexión a MySQL.

## Arquitectura

```text
server/
  app.js
  server.js
  container.js
  controllers/
  dao/
  db/
  infrastructure/
  middleware/
  models/
  routes/
  security/
  services/
  views/
tests/
uploads/
```

Las vistas presentan el portal. Las rutas conectan los endpoints con los controladores; los controladores traducen HTTP a llamadas de servicio. Los servicios coordinan los casos de uso y reglas del registro. Los DAO encapsulan las consultas SQL. Los modelos contienen validación y reglas del dominio. `container.js` conecta servicios, DAO e infraestructura mediante dependencias explícitas.

## Flujo de registro

| Paso | Endpoint | Resultado |
| --- | --- | --- |
| Datos básicos | `POST /api/registro/basico` | Crea o retoma un borrador y confirma P01. |
| Pago simulado | `POST /api/registro/pago` | Registra el pago y valida P02. |
| Verificación | `POST /api/registro/completar` | Valida DNI, teléfono, contraseña y archivos; completa P03 y crea la sesión. |

El navegador usa una cookie temporal de registro por 24 horas y una cookie de sesión por 2 horas.

## API de sesión y perfil

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/api/login` | Inicia sesión. |
| `POST` | `/api/logout` | Cierra la sesión y elimina las cookies. |
| `GET` | `/api/me` | Devuelve el perfil, las etapas y el pago. |
| `GET` | `/api/me/foto` | Devuelve la foto del postulante autenticado. |

Los archivos cargados se guardan en `uploads/` y no se sirven como contenido público.
