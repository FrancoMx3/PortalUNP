const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

function crearAlmacenamientoArchivos(directorio) {
  return {
    async guardar(buffer, tipo) {
      const nombre = `${crypto.randomBytes(16).toString('hex')}.${tipo}`;
      await fs.writeFile(path.join(directorio, nombre), buffer, { flag: 'wx' });
      return nombre;
    },

    async eliminar(nombre) {
      await fs.unlink(path.join(directorio, nombre));
    }
  };
}

module.exports = crearAlmacenamientoArchivos;
