import LabPrototipos from '../LabPrototipos';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'PROTOTYPE_POLLUTION',
  flujo: [
    {
      glifo: 'persona',
      titulo: 'Se envía un JSON con una clave especial',
      texto: '«__proto__» parece un dato más, pero en JavaScript es la puerta al prototipo.',
    },
    {
      glifo: 'cadena',
      titulo: 'La fusión copia sin mirar',
      texto: 'Una función de merge recursiva sigue la clave y termina escribiendo en Object.prototype.',
    },
    {
      glifo: 'servidor',
      titulo: 'Todos los objetos heredan el cambio',
      texto: 'Hasta los que se crean después: una propiedad aparece donde nadie la puso.',
    },
  ],
  codigoVulnerable: `const _ = require('lodash'); // una versión antigua
const config = { tema: 'claro', idioma: 'es' };

app.post('/preferencias', (req, res) => {
  _.merge(config, req.body);
  res.json(config);
});`,
  lineasVulnerables: [5],
  notasVulnerable: {
    5: 'merge recorre el JSON entero. Con { "__proto__": { … } } deja de escribir en config y escribe en Object.prototype.',
    6: 'Desde este momento, cualquier objeto de la aplicación hereda lo que se escribió.',
  },
  codigoSeguro: `const PERMITIDAS = ['tema', 'idioma'];
const config = { tema: 'claro', idioma: 'es' };

app.post('/preferencias', (req, res) => {
  for (const clave of PERMITIDAS) {
    if (typeof req.body[clave] === 'string') config[clave] = req.body[clave];
  }
  res.json(config);
});`,
  lineasSeguras: [5, 6],
  notasSeguro: {
    1: 'Una lista cerrada de las claves que sí se aceptan.',
    5: 'Solo se recorren las claves permitidas: «__proto__» o «constructor» ni se miran.',
    6: 'Además se comprueba el tipo del valor antes de guardarlo.',
  },
  regla: 'No fusiones objetos de la solicitud a ciegas: copia solo las claves que esperas.',
  reto: {
    pregunta: '¿Cuál es la forma más segura de guardar las preferencias que llegan del usuario?',
    opciones: [
      {
        codigo: 'Object.assign(config, req.body)',
        comentario:
          'No contamina el prototipo global, pero copia cualquier clave que llegue: el usuario decide qué propiedades de config cambia.',
      },
      {
        codigo: '_.merge(config, JSON.parse(texto))',
        comentario: 'Una fusión recursiva sin filtro es justo lo que permite escribir en Object.prototype.',
      },
      {
        codigo: 'for (const k of PERMITIDAS) config[k] = req.body[k]',
        comentario: 'Solo se tocan las claves de una lista cerrada. Lo que no esperabas, no entra.',
      },
    ],
    correcta: 2,
  },
  Laboratorio: LabPrototipos,
};

export default contenido;
