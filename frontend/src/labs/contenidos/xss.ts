import LabXss from '../LabXss';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'XSS',
  flujo: [
    {
      glifo: 'atacante',
      titulo: 'Alguien publica HTML',
      texto: 'En vez de una opinión, escribe una etiqueta con código escondido.',
    },
    {
      glifo: 'navegador',
      titulo: 'Tu página lo inserta como HTML',
      texto: 'Con innerHTML, el navegador no ve texto: ve etiquetas y las interpreta.',
    },
    {
      glifo: 'galleta',
      titulo: 'Corre en el navegador de cada visitante',
      texto: 'Con los permisos de tu sitio: puede leer la sesión y actuar como la víctima.',
    },
  ],
  codigoVulnerable: `const lista = document.querySelector('#comentarios');

function mostrarComentario(autor, texto) {
  const item = document.createElement('li');
  item.innerHTML = '<b>' + autor + '</b>: ' + texto;
  lista.appendChild(item);
}`,
  lineasVulnerables: [5],
  notasVulnerable: {
    3: 'Entrada: «texto» lo escribió otra persona.',
    5: 'innerHTML convierte el texto en HTML de la página. Si trae <img onerror=…>, el navegador ejecuta ese código.',
    6: 'Desde aquí lo ve cada visitante de la página.',
  },
  codigoSeguro: `const lista = document.querySelector('#comentarios');

function mostrarComentario(autor, texto) {
  const item = document.createElement('li');
  const negrita = document.createElement('b');
  negrita.textContent = autor;
  item.append(negrita, ': ', texto);
  lista.appendChild(item);
}`,
  lineasSeguras: [6, 7],
  notasSeguro: {
    6: 'textContent escribe texto: los símbolos < y > son solo letras.',
    7: 'append con un string crea un nodo de texto, nunca etiquetas.',
  },
  regla: 'Trata lo que escribe la gente como texto, nunca como HTML: usa textContent (o un framework que escape).',
  reto: {
    pregunta: '¿Cuál de estas formas de mostrar un comentario es segura?',
    opciones: [
      {
        codigo: "item.innerHTML = texto.replace('<script>', '')",
        comentario: 'Quitar una etiqueta a mano no basta: <img onerror=…> ni siquiera lleva <script>.',
      },
      {
        codigo: "item.outerHTML = '<li>' + texto + '</li>'",
        comentario: 'outerHTML también interpreta el texto como HTML. Es la misma puerta con otro nombre.',
      },
      {
        codigo: 'item.textContent = texto',
        comentario: 'El navegador lo muestra siempre como texto, sea cual sea su contenido.',
      },
    ],
    correcta: 2,
  },
  Laboratorio: LabXss,
};

export default contenido;
