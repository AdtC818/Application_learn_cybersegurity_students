import LabCors from '../LabCors';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'CORS_MISCONFIGURATION',
  flujo: [
    {
      glifo: 'navegador',
      titulo: 'La víctima abre un sitio malicioso',
      texto: 'Mientras tanto, su sesión del banco sigue abierta en otra pestaña.',
    },
    {
      glifo: 'muro',
      titulo: 'Esa página llama a tu API',
      texto: 'El navegador adjunta las cookies y pregunta a tu API si el origen está permitido.',
    },
    {
      glifo: 'ojo',
      titulo: 'Tu API responde «sí» a cualquiera',
      texto: 'Con un CORS demasiado abierto, el navegador entrega la respuesta al sitio ajeno.',
    },
  ],
  codigoVulnerable: `const cors = require('cors');

app.use(cors({ origin: true, credentials: true }));

app.get('/mi-cuenta', requiereSesion, (req, res) => {
  res.json({ titular: req.usuario.nombre, saldo: req.usuario.saldo });
});`,
  lineasVulnerables: [3],
  notasVulnerable: {
    3: 'origin: true repite el origen que pida cualquiera, y credentials: true permite mandar cookies: cualquier sitio puede leer datos con la sesión de la víctima.',
    5: 'Esta ruta devuelve datos privados a quien llegue con una sesión válida.',
  },
  codigoSeguro: `const cors = require('cors');

app.use(cors({
  origin: 'https://app.banco.example',
  credentials: true,
}));

app.get('/mi-cuenta', requiereSesion, (req, res) => {
  res.json({ titular: req.usuario.nombre, saldo: req.usuario.saldo });
});`,
  lineasSeguras: [4],
  notasSeguro: {
    4: 'Una lista explícita de orígenes. Los demás sitios no pueden leer la respuesta.',
    5: 'Las cookies solo se aceptan junto a un origen concreto, nunca con el comodín.',
  },
  regla: 'Permite solo los orígenes que conoces. Nunca uses «*» ni repitas el origen recibido cuando hay cookies.',
  reto: {
    pregunta: 'Tu aplicación vive en app.banco.example y necesita leer la API con cookies. ¿Qué configuración eliges?',
    opciones: [
      {
        codigo: "cors({ origin: '*', credentials: true })",
        comentario:
          'Los navegadores rechazan esta combinación: ni siquiera tu propia aplicación podría leer la API con cookies.',
      },
      {
        codigo: "cors({ origin: 'https://app.banco.example', credentials: true })",
        comentario: 'Un origen concreto con credenciales: solo tu aplicación puede leer las respuestas con la sesión.',
      },
      {
        codigo: 'cors({ origin: true, credentials: true })',
        comentario: 'Repite el origen de quien pregunte: es dejar entrar a cualquier sitio con la sesión de la víctima.',
      },
    ],
    correcta: 1,
  },
  Laboratorio: LabCors,
};

export default contenido;
