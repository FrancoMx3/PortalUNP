// Funciones puras (sin dependencias externas)

const RL = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

function cap(t) {
  return t
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function sinTildes(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Misma regla que usaba el frontend: inicial + primer apellido + últimos 4 del DNI
function generarEmail(nombres, apellidos, dni) {
  const n = sinTildes(nombres.toLowerCase().trim());
  const a = sinTildes(apellidos.toLowerCase().trim().split(/\s+/)[0]);
  return (n[0] + a + dni.slice(-4) + '@alumnos.unp.edu.pe').replace(/\s/g, '');
}

// Detecta el tipo real del archivo por sus primeros bytes (no confía en la extensión)
function detectarTipo(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };

module.exports = { RL, cap, generarEmail, detectarTipo, MIME };
