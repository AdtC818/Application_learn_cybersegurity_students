import LabNosql from '../LabNosql';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'NOSQL_INJECTION',
  flujo: [
    {
      glifo: 'persona',
      titulo: 'Se envía JSON, no solo texto',
      texto: 'Un campo puede ser un texto… o un objeto con operadores como $ne.',
    },
    {
      glifo: 'servidor',
      titulo: 'El servidor usa el cuerpo como filtro',
      texto: 'findOne(req.body) le entrega a la base lo que llegó, tal cual.',
    },
    {
      glifo: 'llaves',
      titulo: 'La base obedece a los operadores',
      texto: '«Clave distinta de null» siempre se cumple: se entra sin conocer la clave.',
    },
  ],
  codigoVulnerable: `app.post('/login', async (req, res) => {
  const usuario = await Usuarios.findOne(req.body);
  if (!usuario) return res.status(401).end();
  res.json({ ok: true, rol: usuario.rol });
});`,
  lineasVulnerables: [2],
  notasVulnerable: {
    1: 'req.body lo controla quien envía la petición.',
    2: 'Todo el objeto pasa a ser el filtro. Si la clave es { "$ne": null }, la condición siempre es verdadera.',
    4: 'Se responde como si hubiera iniciado sesión con la clave correcta.',
  },
  codigoSeguro: `app.post('/login', async (req, res) => {
  const { usuario, clave } = req.body;
  if (typeof usuario !== 'string' || typeof clave !== 'string') {
    return res.status(400).end();
  }
  const encontrado = await Usuarios.findOne({ usuario });
  if (!encontrado || !(await bcrypt.compare(clave, encontrado.hash))) {
    return res.status(401).end();
  }
  res.json({ ok: true, rol: encontrado.rol });
});`,
  lineasSeguras: [3, 6],
  notasSeguro: {
    2: 'Se leen solo los campos esperados, no el objeto entero.',
    3: 'Si no son textos (por ejemplo un objeto con $ne), se rechaza antes de tocar la base.',
    6: 'El filtro lo arma el servidor con un texto: nunca contiene operadores.',
    7: 'La clave se compara con su hash; no viaja dentro de ninguna consulta.',
  },
  regla: 'Nunca uses req.body como filtro: lee los campos que esperas y comprueba que sean del tipo correcto.',
  reto: {
    pregunta: '¿Cuál de estas consultas resiste un cuerpo con { "$ne": null }?',
    opciones: [
      {
        codigo: 'Usuarios.findOne({ usuario: req.body.usuario, clave: req.body.clave })',
        comentario:
          'Mejor, pero cada campo sigue pudiendo ser un objeto con operadores: req.body.clave puede ser { "$ne": null }.',
      },
      {
        codigo: 'Usuarios.findOne(req.body)',
        comentario: 'Es justo el caso vulnerable: el cuerpo entero se vuelve el filtro.',
      },
      {
        codigo: "Usuarios.findOne({ usuario: String(req.body.usuario) })",
        comentario:
          'String() convierte cualquier cosa en texto, así que un objeto nunca llega como operador. Mejor aún si además validas el tipo.',
      },
    ],
    correcta: 2,
  },
  Laboratorio: LabNosql,
};

export default contenido;
