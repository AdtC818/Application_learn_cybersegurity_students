import LabSecretos from '../LabSecretos';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'HARDCODED_SECRETS',
  flujo: [
    {
      glifo: 'llave',
      titulo: 'La clave se escribe en el código',
      texto: 'Es cómodo: funciona a la primera. La clave queda dentro de app.js.',
    },
    {
      glifo: 'repo',
      titulo: 'Git guarda todas las versiones',
      texto: 'Aunque la borres después, cada commit conserva el archivo tal como estaba.',
    },
    {
      glifo: 'atacante',
      titulo: 'Cualquiera que clone el repo la lee',
      texto: 'Basta con revisar el historial. Los bots buscan claves así todo el día.',
    },
  ],
  codigoVulnerable: `const crearPasarela = require('./pasarela');

const apiKey = 'sk_live_51Hf8aKq2Zp0Xw93dL';

const pagos = crearPasarela(apiKey);
module.exports = pagos;`,
  lineasVulnerables: [3],
  notasVulnerable: {
    3: 'El secreto está escrito en el archivo: viaja con cada commit, cada clon y cada copia de seguridad.',
    5: 'Quien tenga la clave puede hacer cobros como si fuera tu aplicación.',
  },
  codigoSeguro: `// .env (no se sube a Git: está en .gitignore)
// API_KEY=la-clave-real

const crearPasarela = require('./pasarela');

const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('Falta la variable API_KEY');

const pagos = crearPasarela(apiKey);
module.exports = pagos;`,
  lineasSeguras: [6, 7],
  notasSeguro: {
    1: 'El archivo .env guarda los valores reales. Se lista en .gitignore para que Git nunca lo suba.',
    6: 'El código solo dice de dónde leer la clave, no cuál es.',
    7: 'Si falta, la aplicación se detiene en vez de funcionar a medias.',
  },
  regla: 'Los secretos viven en variables de entorno, nunca en el código. Si una clave ya se subió a Git, revócala y crea otra.',
  reto: {
    pregunta: 'Subiste una clave a GitHub por error y ya la quitaste del archivo. ¿Qué haces ahora?',
    opciones: [
      {
        codigo: 'Revocar la clave en el proveedor y crear una nueva',
        comentario:
          'Correcto. Una clave que estuvo en un repositorio hay que darla por conocida: lo único seguro es invalidarla.',
      },
      {
        codigo: 'Nada: el archivo de hoy ya no la tiene',
        comentario: 'El historial de Git conserva las versiones anteriores. La clave sigue ahí.',
      },
      {
        codigo: 'Cambiar el nombre de la variable de apiKey a clave',
        comentario: 'Cambiar el nombre no esconde el valor, que sigue escrito en el historial.',
      },
    ],
    correcta: 0,
  },
  Laboratorio: LabSecretos,
};

export default contenido;
