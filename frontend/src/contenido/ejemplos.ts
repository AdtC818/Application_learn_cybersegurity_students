import type { TipoVuln } from './catalogo';

export interface Ejemplo {
  id: string;
  etiqueta: string;
  /** Categoría que este ejemplo debería provocar (para comprobarlo en las pruebas). */
  tipo?: TipoVuln;
  codigo: string;
}

/** Fragmentos para cargar en el editor con un clic. Cada uno dispara su detector. */
export const EJEMPLOS: Ejemplo[] = [
  {
    id: 'mezcla',
    etiqueta: 'Un poco de todo',
    codigo: `const crypto = require('crypto');
const apiKey = 'sk_live_51Hf8aKq2Zp0Xw93dL';

app.use(cors({ origin: '*' }));

app.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  console.log('Intento de login:', usuario, password);
  const hash = crypto.createHash('md5').update(password).digest('hex');
  const filas = await db.query("SELECT * FROM usuarios WHERE usuario = '" + usuario + "' AND hash = '" + hash + "'");
  res.json({ ok: filas.length > 0 });
});

app.get('/calcular', (req, res) => {
  res.send(String(eval(req.query.formula)));
});`,
  },
  {
    id: 'sql',
    etiqueta: 'Inyección SQL',
    tipo: 'SQL_INJECTION',
    codigo: `app.get('/usuarios/:id', async (req, res) => {
  const id = req.params.id;
  const filas = await db.query('SELECT * FROM usuarios WHERE id = ' + id);
  res.json(filas);
});`,
  },
  {
    id: 'xss',
    etiqueta: 'XSS',
    tipo: 'XSS',
    codigo: `const lista = document.getElementById('comentarios');

function mostrarComentario(texto) {
  const item = document.createElement('li');
  item.innerHTML = texto;
  lista.appendChild(item);
}`,
  },
  {
    id: 'secretos',
    etiqueta: 'Credenciales',
    tipo: 'HARDCODED_SECRETS',
    codigo: `const apiKey = 'sk_live_51Hf8aKq2Zp0Xw93dL';
const dbPassword = 'Tunja2024-Produccion';

fetch('https://api.pagos.example/cobrar', {
  headers: { Authorization: 'Bearer ' + apiKey },
});`,
  },
  {
    id: 'cripto',
    etiqueta: 'Cripto débil',
    tipo: 'WEAK_CRYPTO',
    codigo: `const crypto = require('crypto');

function guardarClave(clave) {
  return crypto.createHash('md5').update(clave).digest('hex');
}`,
  },
  {
    id: 'nosql',
    etiqueta: 'NoSQL',
    tipo: 'NOSQL_INJECTION',
    codigo: `app.post('/login', async (req, res) => {
  const usuario = await Usuarios.findOne(req.body);
  res.json({ ok: Boolean(usuario) });
});`,
  },
  {
    id: 'rutas',
    etiqueta: 'Path traversal',
    tipo: 'PATH_TRAVERSAL',
    codigo: `app.get('/descargar/:nombre', (req, res) => {
  fs.readFile(\`./uploads/\${req.params.nombre}\`, (err, datos) => {
    res.send(datos);
  });
});`,
  },
  {
    id: 'prototipos',
    etiqueta: 'Prototype pollution',
    tipo: 'PROTOTYPE_POLLUTION',
    codigo: `const config = { tema: 'claro', idioma: 'es' };

app.post('/ajustes', (req, res) => {
  merge(config, req.body);
  res.json(config);
});`,
  },
  {
    id: 'cors',
    etiqueta: 'CORS',
    tipo: 'CORS_MISCONFIGURATION',
    codigo: `const cors = require('cors');

app.use(cors({ origin: true, credentials: true }));`,
  },
  {
    id: 'cookies',
    etiqueta: 'Cookies',
    tipo: 'INSECURE_SESSION_COOKIES',
    codigo: `app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: { httpOnly: false, secure: false },
}));`,
  },
  {
    id: 'ssrf',
    etiqueta: 'SSRF',
    tipo: 'SSRF',
    codigo: `app.get('/vista-previa', async (req, res) => {
  const respuesta = await fetch(req.query.url);
  res.send(await respuesta.text());
});`,
  },
  {
    id: 'ejecucion',
    etiqueta: 'eval y exec',
    tipo: 'DANGEROUS_FUNCTIONS',
    codigo: `const child_process = require('child_process');

app.get('/ping', (req, res) => {
  child_process.exec('ping -c 1 ' + req.query.host, (err, salida) => {
    res.send(salida);
  });
});`,
  },
  {
    id: 'logs',
    etiqueta: 'Logs',
    tipo: 'SENSITIVE_DATA_LOGGING',
    codigo: `app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login recibido:', email, password);
  res.sendStatus(200);
});`,
  },
];

export const CODIGO_INICIAL = EJEMPLOS[1].codigo;
