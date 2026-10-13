import LabSql from '../LabSql';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'SQL_INJECTION',
  flujo: [
    { glifo: 'persona', titulo: 'Lo que escribe la persona', texto: 'El formulario recibe un usuario y una clave.' },
    { glifo: 'servidor', titulo: 'El código lo pega en el SQL', texto: 'La consulta se arma uniendo textos con +.' },
    { glifo: 'base', titulo: 'La base obedece', texto: 'Si el texto trae SQL, se ejecuta como parte de la consulta.' },
  ],
  codigoVulnerable: `app.post('/login', async (req, res) => {
  const { usuario, clave } = req.body;
  const filas = await db.query(
    "SELECT * FROM usuarios WHERE usuario = '" + usuario + "' AND clave = '" + clave + "'"
  );
  res.json({ ok: filas.length > 0 });
});`,
  lineasVulnerables: [3, 4],
  notasVulnerable: {
    2: 'Entrada: lo escribe la persona, así que no es de fiar.',
    4: 'El texto se pega dentro del SQL. Una comilla basta para salirse del dato y escribir SQL propio.',
    5: 'La base ya ejecutó lo que llegó, sea lo que sea.',
  },
  codigoSeguro: `app.post('/login', async (req, res) => {
  const { usuario, clave } = req.body;
  const filas = await db.query(
    'SELECT * FROM usuarios WHERE usuario = $1 AND clave = $2',
    [usuario, clave]
  );
  res.json({ ok: filas.length > 0 });
});`,
  lineasSeguras: [4, 5],
  notasSeguro: {
    4: 'La estructura es fija: solo hay marcadores ($1, $2).',
    5: 'Los valores viajan aparte y la base nunca los lee como SQL. (Además, guarda hashes de las claves: mira el laboratorio de criptografía.)',
  },
  regla: 'Nunca armes SQL pegando texto: usa consultas parametrizadas.',
  reto: {
    pregunta: '¿Cuál de estas consultas NO es vulnerable a inyección SQL?',
    opciones: [
      {
        codigo: 'db.query(`SELECT * FROM usuarios WHERE id = ${req.params.id}`)',
        comentario: 'Las plantillas de texto también pegan el valor dentro del SQL. Es lo mismo que sumar cadenas.',
      },
      {
        codigo: "db.query('SELECT * FROM usuarios WHERE id = $1', [req.params.id])",
        comentario: 'El valor va aparte, como parámetro: la base lo trata siempre como dato.',
      },
      {
        codigo: `db.query("SELECT * FROM usuarios WHERE nombre = '" + nombre.replace("'", "") + "'")`,
        comentario:
          'Quitar comillas a mano es un parche: se olvida de comentarios, barras invertidas y otros motores. Parametriza.',
      },
    ],
    correcta: 1,
  },
  Laboratorio: LabSql,
};

export default contenido;
