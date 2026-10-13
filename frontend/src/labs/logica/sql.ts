/**
 * Mini motor SQL de juguete para el laboratorio de inyección SQL.
 *
 * No ejecuta nada real: entiende solo lo justo (WHERE con AND/OR/NOT y
 * comparaciones, comentarios, UNION SELECT y sentencias apiladas) para que
 * se vea con exactitud cómo un texto escrito por el usuario cambia la
 * estructura de la consulta.
 */

export type Valor = string | number | boolean | null;

export interface FilaUsuario {
  id: number;
  usuario: string;
  clave: string;
  rol: string;
}

export type FilaResultado = { id: Valor; usuario: Valor; clave: Valor; rol: Valor };

/** Tabla de juguete (las claves en texto plano son otro error, aquí solo es una demo). */
export const USUARIOS: FilaUsuario[] = [
  { id: 1, usuario: 'admin', clave: 'Sup3r-S3creta!', rol: 'admin' },
  { id: 2, usuario: 'ana', clave: 'mango2024', rol: 'usuario' },
  { id: 3, usuario: 'luis', clave: 'tunja1539', rol: 'usuario' },
];

export class ErrorSql extends Error {}

/* ---------- Construcción de la consulta ---------- */

export interface Segmento {
  texto: string;
  origen: 'codigo' | 'entrada';
}

/** La consulta vulnerable: se pega el texto del usuario dentro del SQL. */
export function consultaVulnerable(usuario: string, clave: string): Segmento[] {
  return [
    { texto: "SELECT * FROM usuarios WHERE usuario = '", origen: 'codigo' },
    { texto: usuario, origen: 'entrada' },
    { texto: "' AND clave = '", origen: 'codigo' },
    { texto: clave, origen: 'entrada' },
    { texto: "'", origen: 'codigo' },
  ];
}

export function textoDe(segmentos: Segmento[]): string {
  return segmentos.map((s) => s.texto).join('');
}

/* ---------- Tokenizador ---------- */

type TipoToken = 'cad' | 'num' | 'id' | 'op' | 'abre' | 'cierra' | 'coma' | 'pcoma' | 'estrella' | 'com';

interface TokenSql {
  tipo: TipoToken;
  valor: string;
  inicio: number;
  fin: number;
}

function cerca(texto: string): string {
  return `«${texto}»`;
}

export function tokenizar(sql: string): TokenSql[] {
  const tokens: TokenSql[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (c === '-' && sql[i + 1] === '-') {
      let j = i;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push({ tipo: 'com', valor: sql.slice(i, j), inicio: i, fin: j });
      i = j;
      continue;
    }

    if (c === '/' && sql[i + 1] === '*') {
      const fin = sql.indexOf('*/', i + 2);
      const j = fin === -1 ? sql.length : fin + 2;
      tokens.push({ tipo: 'com', valor: sql.slice(i, j), inicio: i, fin: j });
      i = j;
      continue;
    }

    if (c === "'") {
      let j = i + 1;
      let valor = '';
      let cerrada = false;
      while (j < sql.length) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            valor += "'";
            j += 2;
            continue;
          }
          cerrada = true;
          j++;
          break;
        }
        valor += sql[j];
        j++;
      }
      if (!cerrada) {
        throw new ErrorSql(`cadena entre comillas sin terminar en o cerca de ${cerca(sql.slice(i, i + 12))}`);
      }
      tokens.push({ tipo: 'cad', valor, inicio: i, fin: j });
      i = j;
      continue;
    }

    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < sql.length && /[0-9.]/.test(sql[j])) j++;
      tokens.push({ tipo: 'num', valor: sql.slice(i, j), inicio: i, fin: j });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      tokens.push({ tipo: 'id', valor: sql.slice(i, j), inicio: i, fin: j });
      i = j;
      continue;
    }

    const dos = sql.slice(i, i + 2);
    if (dos === '<>' || dos === '!=' || dos === '<=' || dos === '>=') {
      tokens.push({ tipo: 'op', valor: dos === '!=' ? '<>' : dos, inicio: i, fin: i + 2 });
      i += 2;
      continue;
    }
    if (c === '=' || c === '<' || c === '>') {
      tokens.push({ tipo: 'op', valor: c, inicio: i, fin: i + 1 });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ tipo: 'abre', valor: c, inicio: i, fin: i + 1 });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ tipo: 'cierra', valor: c, inicio: i, fin: i + 1 });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ tipo: 'coma', valor: c, inicio: i, fin: i + 1 });
      i++;
      continue;
    }
    if (c === ';') {
      tokens.push({ tipo: 'pcoma', valor: c, inicio: i, fin: i + 1 });
      i++;
      continue;
    }
    if (c === '*') {
      tokens.push({ tipo: 'estrella', valor: c, inicio: i, fin: i + 1 });
      i++;
      continue;
    }

    throw new ErrorSql(`error de sintaxis en o cerca de ${cerca(c)}`);
  }
  return tokens;
}

/* ---------- Análisis y evaluación ---------- */

type Nodo =
  | { t: 'lit'; v: Valor }
  | { t: 'col'; nombre: keyof FilaUsuario }
  | { t: 'cmp'; op: string; a: Nodo; b: Nodo }
  | { t: 'y' | 'o'; a: Nodo; b: Nodo }
  | { t: 'no'; a: Nodo };

const COLUMNAS: ReadonlyArray<keyof FilaUsuario> = ['id', 'usuario', 'clave', 'rol'];

function esPalabra(t: TokenSql | undefined, palabra: string): boolean {
  return t?.tipo === 'id' && t.valor.toUpperCase() === palabra;
}

class Analizador {
  private pos = 0;
  constructor(private readonly tokens: TokenSql[]) {}

  get posicion(): number {
    return this.pos;
  }

  mirar(): TokenSql | undefined {
    return this.tokens[this.pos];
  }

  avanzar(): TokenSql | undefined {
    return this.tokens[this.pos++];
  }

  errorEn(t: TokenSql | undefined): ErrorSql {
    return new ErrorSql(
      t ? `error de sintaxis en o cerca de ${cerca(t.valor)}` : 'error de sintaxis al final de la entrada',
    );
  }

  expresion(): Nodo {
    let izq = this.conjuncion();
    while (esPalabra(this.mirar(), 'OR')) {
      this.avanzar();
      izq = { t: 'o', a: izq, b: this.conjuncion() };
    }
    return izq;
  }

  private conjuncion(): Nodo {
    let izq = this.negacion();
    while (esPalabra(this.mirar(), 'AND')) {
      this.avanzar();
      izq = { t: 'y', a: izq, b: this.negacion() };
    }
    return izq;
  }

  private negacion(): Nodo {
    if (esPalabra(this.mirar(), 'NOT')) {
      this.avanzar();
      return { t: 'no', a: this.negacion() };
    }
    return this.comparacion();
  }

  private comparacion(): Nodo {
    const izq = this.primario();
    const t = this.mirar();
    if (t?.tipo === 'op') {
      this.avanzar();
      return { t: 'cmp', op: t.valor, a: izq, b: this.primario() };
    }
    return izq;
  }

  primario(): Nodo {
    const t = this.avanzar();
    if (!t) throw this.errorEn(undefined);
    if (t.tipo === 'cad') return { t: 'lit', v: t.valor };
    if (t.tipo === 'num') return { t: 'lit', v: Number(t.valor) };
    if (t.tipo === 'abre') {
      const dentro = this.expresion();
      const cierre = this.avanzar();
      if (cierre?.tipo !== 'cierra') throw this.errorEn(cierre);
      return dentro;
    }
    if (t.tipo === 'id') {
      const mayus = t.valor.toUpperCase();
      if (mayus === 'TRUE') return { t: 'lit', v: true };
      if (mayus === 'FALSE') return { t: 'lit', v: false };
      if (mayus === 'NULL') return { t: 'lit', v: null };
      const columna = COLUMNAS.find((c) => c === t.valor.toLowerCase());
      if (!columna) {
        if (['SELECT', 'FROM', 'WHERE', 'UNION', 'AND', 'OR', 'NOT'].includes(mayus)) throw this.errorEn(t);
        throw new ErrorSql(`la columna «${t.valor}» no existe`);
      }
      return { t: 'col', nombre: columna };
    }
    throw this.errorEn(t);
  }
}

function aBooleano(v: Valor, operador: string): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null) return false;
  throw new ErrorSql(`el argumento de ${operador} debe ser de tipo boolean, no de tipo text`);
}

function evaluar(n: Nodo, fila: FilaUsuario): Valor {
  switch (n.t) {
    case 'lit':
      return n.v;
    case 'col':
      return fila[n.nombre];
    case 'no':
      return !aBooleano(evaluar(n.a, fila), 'NOT');
    case 'y': {
      const a = aBooleano(evaluar(n.a, fila), 'AND');
      const b = aBooleano(evaluar(n.b, fila), 'AND');
      return a && b;
    }
    case 'o': {
      const a = aBooleano(evaluar(n.a, fila), 'OR');
      const b = aBooleano(evaluar(n.b, fila), 'OR');
      return a || b;
    }
    case 'cmp': {
      const a = evaluar(n.a, fila);
      const b = evaluar(n.b, fila);
      if (a === null || b === null) return false;
      if (typeof a === 'number' && typeof b === 'number') {
        return compararOrden(n.op, a - b);
      }
      const sa = String(a);
      const sb = String(b);
      return compararOrden(n.op, sa === sb ? 0 : sa < sb ? -1 : 1);
    }
  }
}

function compararOrden(op: string, diff: number): boolean {
  switch (op) {
    case '=':
      return diff === 0;
    case '<>':
      return diff !== 0;
    case '<':
      return diff < 0;
    case '>':
      return diff > 0;
    case '<=':
      return diff <= 0;
    case '>=':
      return diff >= 0;
    default:
      return false;
  }
}

export type ResultadoConsulta =
  | { tipo: 'filas'; filas: FilaResultado[]; extras: string[] }
  | { tipo: 'error'; mensaje: string };

const PREFIJO = /^\s*SELECT\s+\*\s+FROM\s+usuarios\s+WHERE\s+/i;

/** Ejecuta la consulta (vulnerable) contra la tabla de juguete. */
export function ejecutarConsulta(sql: string, tabla: FilaUsuario[] = USUARIOS): ResultadoConsulta {
  try {
    const coincide = PREFIJO.exec(sql);
    if (!coincide) throw new ErrorSql('error de sintaxis al inicio de la consulta');
    const resto = sql.slice(coincide[0].length);
    const tokens = tokenizar(resto).filter((t) => t.tipo !== 'com');

    const an = new Analizador(tokens);
    const condicion = an.expresion();

    let filas: FilaResultado[] = tabla.filter((f) => aBooleano(evaluar(condicion, f), 'WHERE')).map((f) => ({ ...f }));
    const extras: string[] = [];

    // UNION SELECT ...
    while (esPalabra(an.mirar(), 'UNION')) {
      an.avanzar();
      if (esPalabra(an.mirar(), 'ALL')) an.avanzar();
      if (!esPalabra(an.avanzar(), 'SELECT')) throw an.errorEn(tokens[an.posicion - 1]);
      filas = filas.concat(unionSelect(an, tabla));
    }

    // Sentencias apiladas: ...; DROP TABLE usuarios;
    if (an.mirar()?.tipo === 'pcoma') {
      let actual: string[] = [];
      while (an.mirar()) {
        const t = an.avanzar()!;
        if (t.tipo === 'pcoma') {
          if (actual.length) extras.push(actual.join(' '));
          actual = [];
        } else {
          actual.push(t.tipo === 'cad' ? `'${t.valor}'` : t.valor);
        }
      }
      if (actual.length) extras.push(actual.join(' '));
    } else if (an.mirar()) {
      throw an.errorEn(an.mirar());
    }

    return { tipo: 'filas', filas, extras };
  } catch (e) {
    if (e instanceof ErrorSql) return { tipo: 'error', mensaje: e.message };
    throw e;
  }
}

function unionSelect(an: Analizador, tabla: FilaUsuario[]): FilaResultado[] {
  // Lista de columnas: * o expresiones simples separadas por comas
  const lista: Nodo[] = [];
  let todas = false;
  if (an.mirar()?.tipo === 'estrella') {
    an.avanzar();
    todas = true;
  } else {
    lista.push(an.primario());
    while (an.mirar()?.tipo === 'coma') {
      an.avanzar();
      lista.push(an.primario());
    }
  }

  const conTabla = esPalabra(an.mirar(), 'FROM');
  if (conTabla) {
    an.avanzar();
    const nombre = an.avanzar();
    if (!esPalabra(nombre, 'USUARIOS')) {
      throw new ErrorSql(`la relación «${nombre?.valor ?? ''}» no existe`);
    }
  }

  const columnas = todas ? 4 : lista.length;
  if (columnas !== 4) {
    throw new ErrorSql('cada consulta UNION debe tener el mismo número de columnas');
  }
  if (!conTabla && todas) throw new ErrorSql('SELECT * necesita una tabla (FROM)');
  if (!conTabla && lista.some((n) => n.t === 'col')) {
    throw new ErrorSql('la columna no existe: no hay ninguna tabla en este SELECT');
  }

  const proyectar = (fila: FilaUsuario): FilaResultado => {
    if (todas) return { ...fila };
    const [id, usuario, clave, rol] = lista.map((n) => evaluar(n, fila));
    return { id, usuario, clave, rol };
  };

  return conTabla ? tabla.map(proyectar) : [proyectar({ id: 0, usuario: '', clave: '', rol: '' })];
}

/** La consulta segura (parametrizada): los valores nunca se leen como SQL. */
export function consultaSegura(usuario: string, clave: string, tabla: FilaUsuario[] = USUARIOS): FilaUsuario[] {
  return tabla.filter((f) => f.usuario === usuario && f.clave === clave);
}

/* ---------- Marcado visual: ¿qué parte del texto del usuario se volvió SQL? ---------- */

export interface Pieza {
  texto: string;
  /** Vino de lo que escribió la persona. */
  entrada: boolean;
  /** Es estructura SQL (operador, palabra, comentario) nacida de la entrada: ahí está la inyección. */
  inyectado: boolean;
}

export function marcarConsulta(segmentos: Segmento[]): Pieza[] {
  const sql = textoDe(segmentos);
  const esEntrada = new Array<boolean>(sql.length).fill(false);
  let cursor = 0;
  for (const s of segmentos) {
    if (s.origen === 'entrada') for (let k = 0; k < s.texto.length; k++) esEntrada[cursor + k] = true;
    cursor += s.texto.length;
  }

  const esInyectado = new Array<boolean>(sql.length).fill(false);
  try {
    for (const t of tokenizar(sql)) {
      if (t.tipo === 'cad') continue;
      for (let k = t.inicio; k < t.fin; k++) if (esEntrada[k]) esInyectado[k] = true;
    }
  } catch {
    // Consulta con error de sintaxis: se marca como entrada, sin estructura.
  }

  const piezas: Pieza[] = [];
  for (let k = 0; k < sql.length; k++) {
    const ultima = piezas[piezas.length - 1];
    if (ultima && ultima.entrada === esEntrada[k] && ultima.inyectado === esInyectado[k]) {
      ultima.texto += sql[k];
    } else {
      piezas.push({ texto: sql[k], entrada: esEntrada[k], inyectado: esInyectado[k] });
    }
  }
  return piezas;
}

/** ¿Alguna parte de la entrada pasó a ser estructura SQL? */
export function hayInyeccion(segmentos: Segmento[]): boolean {
  return marcarConsulta(segmentos).some((p) => p.inyectado);
}
