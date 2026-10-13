import LabCookies from '../LabCookies';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'INSECURE_SESSION_COOKIES',
  flujo: [
    {
      glifo: 'galleta',
      titulo: 'La sesión vive en una cookie',
      texto: 'Mientras la cookie exista, el servidor cree que eres tú. Quien la tenga, es tú.',
    },
    {
      glifo: 'atacante',
      titulo: 'Hay tres formas de conseguirla',
      texto: 'Leerla con un script (XSS), espiar la red sin cifrar, o aprovecharla desde otro sitio (CSRF).',
    },
    {
      glifo: 'candado',
      titulo: 'Cada bandera cierra una puerta',
      texto: 'HttpOnly, Secure y SameSite se declaran en una línea. Si faltan, las puertas siguen abiertas.',
    },
  ],
  codigoVulnerable: `app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: false, secure: false },
}));`,
  lineasVulnerables: [3],
  notasVulnerable: {
    3: 'httpOnly: false deja que un script lea la cookie; secure: false deja que viaje sin cifrar. Y no hay SameSite.',
  },
  codigoSeguro: `app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax' },
}));`,
  lineasSeguras: [3],
  notasSeguro: {
    3: 'httpOnly oculta la cookie a los scripts, secure exige https y sameSite evita que se mande desde otros sitios.',
  },
  regla: 'Cookie de sesión: HttpOnly, Secure y SameSite=Lax (o Strict). Las tres, siempre.',
  reto: {
    pregunta: '¿Cuál es la configuración más segura para la cookie de sesión?',
    opciones: [
      {
        codigo: "cookie: { httpOnly: true, secure: true, sameSite: 'lax' }",
        comentario: 'Cierra las tres puertas: lectura por scripts, tráfico sin cifrar y envío desde otros sitios.',
      },
      {
        codigo: 'cookie: { httpOnly: true }',
        comentario: 'Detiene el robo con scripts, pero la cookie sigue viajando sin cifrar y desde otros sitios.',
      },
      {
        codigo: "cookie: { secure: true, sameSite: 'none' }",
        comentario: 'Sin httpOnly un XSS la lee, y SameSite=None la manda desde cualquier sitio. Es casi lo contrario de lo que quieres.',
      },
    ],
    correcta: 0,
  },
  Laboratorio: LabCookies,
};

export default contenido;
