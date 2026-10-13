/**
 * Simulación de inyección de comandos (exec) y de eval, sin ejecutar nada.
 * Solo se "descompone" el texto para mostrar qué órdenes verían el shell o el motor.
 */

export interface ComandoShell {
  texto: string;
  /** El comando que el programador quería ejecutar (el primero) frente a los que se colaron. */
  colado: boolean;
  salida: string;
  peligroso: boolean;
}

/**
 * Parte una línea de shell en los comandos que ejecutaría:
 * separa por ; && || | & y saltos de línea (fuera de comillas) y extrae
 * las sustituciones `...` y $(...).
 */
export function descomponerShell(linea: string): string[] {
  const comandos: string[] = [];
  const sustituciones: string[] = [];

  // Sustituciones de comandos: `cmd` y $(cmd). Se ejecutan aparte, primero.
  let sinSustituciones = '';
  let comilla: string | null = null;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (comilla) {
      if (c === comilla) comilla = null;
      sinSustituciones += c;
      continue;
    }
    if (c === "'" || c === '"') {
      comilla = c;
      sinSustituciones += c;
      continue;
    }
    if (c === '`') {
      const fin = linea.indexOf('`', i + 1);
      if (fin !== -1) {
        sustituciones.push(linea.slice(i + 1, fin).trim());
        i = fin;
        continue;
      }
    }
    if (c === '$' && linea[i + 1] === '(') {
      const fin = linea.indexOf(')', i + 2);
      if (fin !== -1) {
        sustituciones.push(linea.slice(i + 2, fin).trim());
        i = fin;
        continue;
      }
    }
    sinSustituciones += c;
  }

  // Separadores fuera de comillas
  let actual = '';
  comilla = null;
  const cortar = () => {
    if (actual.trim()) comandos.push(actual.trim());
    actual = '';
  };
  for (let i = 0; i < sinSustituciones.length; i++) {
    const c = sinSustituciones[i];
    if (comilla) {
      if (c === comilla) comilla = null;
      actual += c;
      continue;
    }
    if (c === "'" || c === '"') {
      comilla = c;
      actual += c;
      continue;
    }
    if (c === ';' || c === '\n' || c === '|' || c === '&') {
      if ((c === '|' || c === '&') && sinSustituciones[i + 1] === c) i++;
      cortar();
      continue;
    }
    actual += c;
  }
  cortar();

  return [...sustituciones.filter(Boolean), ...comandos];
}

function simularSalida(comando: string): { salida: string; peligroso: boolean } {
  const [programa, ...args] = comando.split(/\s+/);
  switch (programa) {
    case 'ping':
      return { salida: `64 bytes de ${args.filter((a) => !a.startsWith('-') && a !== '1').pop() ?? 'host'}: tiempo=12 ms`, peligroso: false };
    case 'whoami':
      return { salida: 'www-data', peligroso: true };
    case 'id':
      return { salida: 'uid=33(www-data) gid=33(www-data)', peligroso: true };
    case 'ls':
      return { salida: 'app.js  package.json  .env  node_modules', peligroso: true };
    case 'cat':
      if (args.join(' ').includes('/etc/passwd'))
        return { salida: 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33::/var/www:/usr/sbin/nologin', peligroso: true };
      if (args.join(' ').includes('.env'))
        return { salida: 'DB_URL=postgres://admin:clave-de-ejemplo@db/prod', peligroso: true };
      return { salida: '(mostraría el contenido del archivo)', peligroso: true };
    case 'rm':
      return { salida: '(borraría archivos del servidor)', peligroso: true };
    case 'curl':
    case 'wget':
      return { salida: '(descargaría un archivo del atacante, quizá para ejecutarlo)', peligroso: true };
    case 'nc':
    case 'bash':
    case 'sh':
      return { salida: '(abriría una consola remota para el atacante)', peligroso: true };
    default:
      return { salida: '(se ejecutaría con los permisos del servidor)', peligroso: true };
  }
}

export type ResultadoExec =
  | { tipo: 'rechazado'; motivo: string }
  | { tipo: 'ejecutado'; linea: string; comandos: ComandoShell[]; argumentos?: string[] };

const HOST_VALIDO = /^[A-Za-z0-9.-]{1,253}$/;

/** `exec('ping -c 1 ' + host)` frente a `execFile('ping', ['-c', '1', host])` con validación. */
export function hacerPing(host: string, modo: 'vulnerable' | 'seguro'): ResultadoExec {
  if (modo === 'seguro') {
    if (!HOST_VALIDO.test(host)) {
      return { tipo: 'rechazado', motivo: 'Host inválido: solo se aceptan letras, números, puntos y guiones.' };
    }
    const salida = simularSalida(`ping -c 1 ${host}`);
    return {
      tipo: 'ejecutado',
      linea: `ping -c 1 ${host}`,
      argumentos: ['-c', '1', host],
      comandos: [{ texto: `ping -c 1 ${host}`, colado: false, salida: salida.salida, peligroso: false }],
    };
  }

  const linea = `ping -c 1 ${host}`;
  const partes = descomponerShell(linea);
  // Las sustituciones aparecen primero en la lista; el ping previsto es el que empieza por «ping -c 1».
  const comandos: ComandoShell[] = partes.map((texto, i) => {
    const previsto = i === partes.findIndex((p) => p.startsWith('ping -c 1')) && texto.startsWith('ping -c 1');
    const s = simularSalida(texto);
    return { texto, colado: !previsto, salida: s.salida, peligroso: !previsto && s.peligroso };
  });
  return { tipo: 'ejecutado', linea, comandos };
}

/* ---------- eval ---------- */

const PATRONES_PELIGROSOS: Array<[RegExp, string]> = [
  [/\brequire\s*\(|\bimport\s*\(/, 'carga módulos de Node (fs, child_process…)'],
  [/\bprocess\b/, 'accede al proceso del servidor (variables de entorno, process.exit)'],
  [/\bchild_process\b|\bexec(Sync)?\s*\(|\bspawn\s*\(/, 'ejecuta comandos del sistema'],
  [/\bfs\b|\breadFile/, 'lee o escribe archivos'],
  [/\bfetch\s*\(|\bXMLHttpRequest\b/, 'hace peticiones de red'],
  [/\beval\s*\(|\bFunction\s*\(|\bconstructor\b/, 'ejecuta más código dinámico'],
  [/\bwhile\s*\(|\bfor\s*\(/, 'puede dejar el servidor en un bucle infinito'],
  [/\bglobalThis\b|\bglobal\b/, 'toca el objeto global'],
];

export function hallazgosDeExpresion(expr: string): string[] {
  return PATRONES_PELIGROSOS.filter(([re]) => re.test(expr)).map(([, texto]) => texto);
}

/** Calculadora segura: solo números, + - * / % y paréntesis. Sin eval ni Function. */
export function calcular(expr: string): number | null {
  const tokens = expr.match(/\d+(?:\.\d+)?|[()+\-*/%]|\S/g);
  if (!tokens) return null;
  let pos = 0;
  let fallo = false;

  const primario = (): number => {
    const t = tokens[pos++];
    if (t === undefined) {
      fallo = true;
      return 0;
    }
    if (t === '-') return -primario();
    if (t === '+') return primario();
    if (t === '(') {
      const v = suma();
      if (tokens[pos++] !== ')') fallo = true;
      return v;
    }
    if (/^\d/.test(t)) return Number(t);
    fallo = true;
    return 0;
  };
  const producto = (): number => {
    let v = primario();
    while (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%') {
      const op = tokens[pos++];
      const d = primario();
      v = op === '*' ? v * d : op === '/' ? v / d : v % d;
    }
    return v;
  };
  const suma = (): number => {
    let v = producto();
    while (tokens[pos] === '+' || tokens[pos] === '-') {
      const op = tokens[pos++];
      const d = producto();
      v = op === '+' ? v + d : v - d;
    }
    return v;
  };

  const resultado = suma();
  if (fallo || pos !== tokens.length || !Number.isFinite(resultado)) return null;
  return resultado;
}

export type ResultadoEval =
  | { tipo: 'numero'; valor: number }
  | { tipo: 'codigo'; hallazgos: string[] }
  | { tipo: 'rechazado'; motivo: string };

/**
 * Vulnerable: `eval(expresion)` ejecutaría lo que sea. Aquí NO se evalúa nada:
 * se clasifica el texto para mostrar qué pasaría.
 * Seguro: solo se acepta la gramática de la calculadora.
 */
export function evaluarExpresion(expr: string, modo: 'vulnerable' | 'seguro'): ResultadoEval {
  const valor = calcular(expr);
  if (valor !== null) return { tipo: 'numero', valor };
  if (modo === 'seguro') {
    return { tipo: 'rechazado', motivo: 'La expresión no es una operación aritmética válida (400).' };
  }
  const hallazgos = hallazgosDeExpresion(expr);
  return {
    tipo: 'codigo',
    hallazgos: hallazgos.length ? hallazgos : ['ejecuta código JavaScript arbitrario con los permisos del servidor'],
  };
}
