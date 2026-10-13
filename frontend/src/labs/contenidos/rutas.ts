import LabRutas from '../LabRutas';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'PATH_TRAVERSAL',
  flujo: [
    {
      glifo: 'persona',
      titulo: 'La dirección trae un nombre de archivo',
      texto: '/descargar?archivo=foto.png. Pero ese nombre lo escribe quien quiera.',
    },
    {
      glifo: 'carpeta',
      titulo: 'El servidor lo pega a una carpeta',
      texto: 'Con «../» la ruta sube un nivel cada vez y sale de la carpeta pública.',
    },
    {
      glifo: 'archivo',
      titulo: 'Se entrega un archivo privado',
      texto: 'Claves, configuración, archivos del sistema: lo que el servidor pueda leer.',
    },
  ],
  codigoVulnerable: `app.get('/descargar', (req, res) => {
  fs.readFile('/app/uploads/' + req.query.archivo, (err, datos) => {
    if (err) return res.status(404).end();
    res.send(datos);
  });
});`,
  lineasVulnerables: [2],
  notasVulnerable: {
    2: 'El nombre se pega a la carpeta. Si trae «../», el sistema operativo sube de nivel y sale de /app/uploads.',
    4: 'Se envía lo que haya en esa ruta, sea público o no.',
  },
  codigoSeguro: `const BASE = '/app/uploads';

app.get('/descargar', (req, res) => {
  const ruta = path.resolve(BASE, req.query.archivo);
  if (!ruta.startsWith(BASE + path.sep)) return res.status(403).end();
  res.sendFile(ruta);
});`,
  lineasSeguras: [4, 5],
  notasSeguro: {
    4: 'path.resolve calcula la ruta real, ya con todos los «../» aplicados.',
    5: 'Se comprueba el resultado, no el texto: si no queda dentro de BASE, se rechaza.',
  },
  regla: 'Resuelve la ruta final y comprueba que siga dentro de la carpeta permitida. No intentes quitar «../» a mano.',
  reto: {
    pregunta: '¿Cuál de estas defensas detiene un ataque de path traversal?',
    opciones: [
      {
        codigo: "archivo.replace('../', '')",
        comentario: 'Con «....//» el reemplazo deja «../» y el ataque pasa. Filtrar texto a mano siempre se olvida de algo.',
      },
      {
        codigo: 'path.resolve(BASE, archivo).startsWith(BASE + path.sep)',
        comentario: 'Se comprueba la ruta ya resuelta, que es la que de verdad se abriría. No hay truco de escritura que lo evite.',
      },
      {
        codigo: "archivo.endsWith('.png')",
        comentario: 'Una extensión no limita la carpeta: «../../secreto.png» sigue saliendo de /app/uploads.',
      },
    ],
    correcta: 1,
  },
  Laboratorio: LabRutas,
};

export default contenido;
