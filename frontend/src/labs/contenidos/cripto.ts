import LabCripto from '../LabCripto';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'WEAK_CRYPTO',
  flujo: [
    {
      glifo: 'candado',
      titulo: 'Se guarda un hash, no la clave',
      texto: 'Es lo correcto: la base guarda una «huella» de la contraseña. Pero cuenta cuál huella.',
    },
    {
      glifo: 'base',
      titulo: 'La base de datos se filtra',
      texto: 'Pasa más de lo que parece: una copia de seguridad perdida, un fallo, un empleado.',
    },
    {
      glifo: 'atacante',
      titulo: 'Se prueban millones de claves por segundo',
      texto: 'Con MD5 cada intento es casi gratis: se prueban palabras hasta que el hash coincide.',
    },
  ],
  codigoVulnerable: `const crypto = require('crypto');

function guardarClave(clave) {
  const hash = crypto.createHash('md5').update(clave).digest('hex');
  return db.query('INSERT INTO usuarios (hash) VALUES ($1)', [hash]);
}`,
  lineasVulnerables: [4],
  notasVulnerable: {
    3: 'Entrada: la contraseña de una persona.',
    4: 'MD5 es rápido y no usa sal: la misma clave siempre da el mismo hash, y se puede probar a toda velocidad.',
    5: 'Si esta tabla se filtra, el atacante empieza a probar claves sin límite.',
  },
  codigoSeguro: `const bcrypt = require('bcrypt');

async function guardarClave(clave) {
  const hash = await bcrypt.hash(clave, 12);
  return db.query('INSERT INTO usuarios (hash) VALUES ($1)', [hash]);
}`,
  lineasSeguras: [4],
  notasSeguro: {
    4: 'bcrypt añade una sal distinta a cada hash y es lento a propósito (el 12 es su costo). En el laboratorio usamos PBKDF2, que el navegador trae incluido: la idea es la misma.',
    5: 'Se guarda solo el hash. Para comprobar un login se usa bcrypt.compare(clave, hash).',
  },
  regla: 'Para contraseñas usa un hash lento y con sal (bcrypt, scrypt o Argon2). MD5 y SHA-1 no son para eso.',
  reto: {
    pregunta: '¿Cuál es la forma adecuada de guardar la contraseña de una persona?',
    opciones: [
      {
        codigo: "crypto.createHash('sha256').update(clave).digest('hex')",
        comentario:
          'SHA-256 es más fuerte que MD5, pero igual de rápido y sin sal: sirve para comprobar integridad, no para contraseñas.',
      },
      {
        codigo: "crypto.createHash('md5').update(clave + 'sal-fija').digest('hex')",
        comentario:
          'Una sal igual para todos no impide el ataque, y MD5 sigue siendo rápido. La sal debe ser distinta en cada hash.',
      },
      {
        codigo: 'await bcrypt.hash(clave, 12)',
        comentario: 'Es lento a propósito y cada hash lleva su propia sal. Cada intento del atacante cuesta mucho más.',
      },
    ],
    correcta: 2,
  },
  Laboratorio: LabCripto,
};

export default contenido;
