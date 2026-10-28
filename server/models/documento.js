const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['jpg', 'png', 'webp'];
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function detectarTipo(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

module.exports = { MAX_BYTES, TIPOS_PERMITIDOS, MIME, detectarTipo };
