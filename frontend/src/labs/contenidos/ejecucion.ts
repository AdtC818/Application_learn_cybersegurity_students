import LabEjecucion from '../LabEjecucion';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'DANGEROUS_FUNCTIONS',
  flujo: [
    {
      glifo: 'persona',
      titulo: 'Se pide una función cómoda',
      texto: 'Hacer un ping, calcular una fórmula: el texto del usuario se usa como parte de la orden.',
    },
    {
      glifo: 'terminal',
      titulo: 'El servidor lo ejecuta tal cual',
      texto: 'exec le pasa una línea al shell, eval le pasa un programa al motor de JavaScript.',
    },
    {
      glifo: 'atacante',
      titulo: 'Quien escribe manda en tu servidor',
      texto: 'Puede leer archivos, ver variables de entorno o borrar cosas, con los permisos de tu aplicación.',
    },
  ],
  codigoVulnerable: `const child_process = require('child_process');

app.get('/ping', (req, res) => {
  child_process.exec('ping -c 1 ' + req.query.host, (err, salida) => res.send(salida));
});

app.get('/calcular', (req, res) => {
  res.send(String(eval(req.query.formula)));
});`,
  lineasVulnerables: [4, 8],
  notasVulnerable: {
    4: 'exec arma una línea de shell con el texto del usuario. Un «;» o un «&&» y empieza otro comando.',
    8: 'eval ejecuta como código cualquier texto: no solo cuentas, también require(...) y process.',
  },
  codigoSeguro: `const { execFile } = require('child_process');

app.get('/ping', (req, res) => {
  const host = String(req.query.host);
  if (!/^[A-Za-z0-9.-]{1,253}$/.test(host)) return res.status(400).end();
  execFile('ping', ['-c', '1', host], (err, salida) => res.send(salida));
});

app.get('/calcular', (req, res) => {
  res.send(String(calcular(req.query.formula)));
});`,
  lineasSeguras: [5, 6, 10],
  notasSeguro: {
    5: 'Se valida con una lista de caracteres permitidos antes de usar el valor.',
    6: 'execFile no usa shell: el programa y cada argumento van por separado, así que «;» no significa nada.',
    10: 'Una función propia que solo entiende números y operadores. No hay eval.',
  },
  regla: 'No ejecutes texto del usuario. Pasa argumentos separados (execFile) y escribe la lógica como código normal, no como eval.',
  reto: {
    pregunta: 'Necesitas ejecutar ping con un host que escribe el usuario. ¿Qué es lo más seguro?',
    opciones: [
      {
        codigo: "exec('ping -c 1 ' + host)",
        comentario: 'Es el caso vulnerable: el host se pega a una línea de shell y se interpreta entero.',
      },
      {
        codigo: "execFile('ping', ['-c', '1', host])",
        comentario: 'No hay shell: el host llega como un único argumento. Mejor aún si antes validas su formato.',
      },
      {
        codigo: 'exec(`ping -c 1 "${host}"`)',
        comentario: 'Las comillas no protegen: un host que traiga otra comilla las cierra y vuelve a abrir la puerta.',
      },
    ],
    correcta: 1,
  },
  Laboratorio: LabEjecucion,
};

export default contenido;
