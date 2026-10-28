const test = require('node:test');
const assert = require('node:assert/strict');
const crearApp = require('../server/app');

test('la vista, las rutas y las cookies conservan el flujo HTTP del portal', async (context) => {
  const llamadas = {};
  const app = crearApp({
    authService: {
      iniciarSesion: async (email, password) => {
        llamadas.login = { email, password };
        return { id: 5, perfil: { postulante: { id: 5 }, etapas: [], pago: null } };
      }
    },
    registroService: {
      registrarBasico: async (body, idRegistro) => {
        llamadas.basico = { body, idRegistro };
        return { id: 9, status: 201, pagado: false };
      },
      registrarPago: async (id) => {
        llamadas.pago = id;
        return { referencia: 'TXN-1', monto: 400, estado: 'Validado' };
      },
      completarRegistro: async ({ id }) => ({ id, perfil: { postulante: { id }, etapas: [], pago: null } })
    },
    perfilService: {
      obtenerPerfil: async (id) => ({ postulante: { id }, etapas: [], pago: null }),
      obtenerFoto: async () => null
    }
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const base = `http://127.0.0.1:${server.address().port}`;
  const vista = await fetch(base);
  assert.equal(vista.status, 200);
  assert.match(await vista.text(), /Portal Académico/);
  for (const ruta of ['/app.js', '/styles.css', '/img/EscudoUNP.png']) {
    const recurso = await fetch(`${base}${ruta}`);
    assert.equal(recurso.status, 200);
  }

  const basico = await fetch(`${base}/api/registro/basico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombres: 'Ana', apellidos: 'Pérez', emailPersonal: 'ana@example.com' })
  });
  assert.equal(basico.status, 201);
  assert.deepEqual(await basico.json(), { pagado: false });
  assert.equal(llamadas.basico.idRegistro, null);
  const cookieRegistro = basico.headers.get('set-cookie').split(';')[0];

  const pago = await fetch(`${base}/api/registro/pago`, { method: 'POST', headers: { Cookie: cookieRegistro } });
  assert.equal(pago.status, 200);
  assert.equal(llamadas.pago, 9);

  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@example.com', password: 'secreto' })
  });
  assert.equal(login.status, 200);
  assert.deepEqual(llamadas.login, { email: 'a@example.com', password: 'secreto' });
  const cookieSesion = login.headers.get('set-cookie').split(';')[0];

  const perfil = await fetch(`${base}/api/me`, { headers: { Cookie: cookieSesion } });
  assert.equal(perfil.status, 200);
  assert.deepEqual(await perfil.json(), { postulante: { id: 5 }, etapas: [], pago: null });

  const sinSesion = await fetch(`${base}/api/me`);
  assert.equal(sinSesion.status, 401);

  const desconocida = await fetch(`${base}/api/no-existe`);
  assert.equal(desconocida.status, 404);
  assert.deepEqual(await desconocida.json(), { error: 'Ruta no encontrada.' });
});
