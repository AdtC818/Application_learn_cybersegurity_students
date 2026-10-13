import LabSsrf from '../LabSsrf';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'SSRF',
  flujo: [
    {
      glifo: 'atacante',
      titulo: 'Se pide una URL a tu servidor',
      texto: 'Una vista previa, una imagen de perfil, un webhook: el servidor va a buscar lo que le digan.',
    },
    {
      glifo: 'servidor',
      titulo: 'Tu servidor llama a esa dirección',
      texto: 'Pero desde dentro de tu red: puede llegar a lugares que desde internet están cerrados.',
    },
    {
      glifo: 'diana',
      titulo: 'El atacante recibe lo que había adentro',
      texto: 'Paneles de administración, copias de seguridad, llaves de la nube.',
    },
  ],
  codigoVulnerable: `app.get('/vista-previa', async (req, res) => {
  const respuesta = await fetch(req.query.url);
  res.send(await respuesta.text());
});`,
  lineasVulnerables: [2],
  notasVulnerable: {
    2: 'La URL la escribe el usuario. El servidor la visita con los accesos que tiene dentro de la red.',
    3: 'Y devuelve el contenido: el atacante lo lee como si lo hubiera visitado él.',
  },
  codigoSeguro: `const PERMITIDOS = ['api.clima.example', 'imagenes.example'];

app.get('/vista-previa', async (req, res) => {
  const destino = new URL(req.query.url);
  if (destino.protocol !== 'https:' || !PERMITIDOS.includes(destino.hostname)) {
    return res.status(400).end();
  }
  const respuesta = await fetch(destino);
  res.send(await respuesta.text());
});`,
  lineasSeguras: [1, 5],
  notasSeguro: {
    1: 'Una lista cerrada de destinos conocidos. Se acepta lo que está en la lista, no se intenta adivinar lo malo.',
    5: 'Solo https y solo hosts permitidos. En producción conviene además comprobar la IP a la que resuelve el nombre.',
  },
  regla: 'Si tu servidor visita URLs que da el usuario, acepta solo una lista de destinos permitidos.',
  reto: {
    pregunta: 'Un usuario envía url=http://169.254.169.254/latest/meta-data/. ¿Qué defensa funciona de verdad?',
    opciones: [
      {
        codigo: "if (url.includes('localhost')) return res.status(400).end()",
        comentario:
          'Hay muchas formas de escribir lo mismo: 127.0.0.1, 2130706433, dominios que apuntan a 127.0.0.1… Una lista negra siempre se queda corta.',
      },
      {
        codigo: "if (!url.startsWith('http://')) return res.status(400).end()",
        comentario: 'La dirección del ataque sí empieza por http://, así que pasa sin problema.',
      },
      {
        codigo: 'if (!PERMITIDOS.includes(new URL(url).hostname)) return res.status(400).end()',
        comentario: 'Una lista de destinos permitidos bloquea todo lo que no hayas aprobado de antemano.',
      },
    ],
    correcta: 2,
  },
  Laboratorio: LabSsrf,
};

export default contenido;
