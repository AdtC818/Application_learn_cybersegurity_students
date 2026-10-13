/**
 * Mini motor de filtros estilo MongoDB para el laboratorio de inyección NoSQL.
 * Solo evalúa filtros sobre unos documentos de juguete; no hay base de datos.
 */

export interface Documento {
  _id: number;
  usuario: string;
  clave: string;
  rol: string;
}

export const DOCUMENTOS: Documento[] = [
  { _id: 1, usuario: 'admin', clave: 'Sup3r-S3creta!', rol: 'admin' },
  { _id: 2, usuario: 'ana', clave: 'mango2024', rol: 'usuario' },
  { _id: 3, usuario: 'luis', clave: 'tunja1539', rol: 'usuario' },
];

export class ErrorMongo extends Error {}

type Valor = unknown;

function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function aplicarOperador(op: string, esperado: Valor, actual: Valor): boolean {
  switch (op) {
    case '$eq':
      return actual === esperado;
    case '$ne':
      return actual !== esperado;
    case '$gt':
      return typeof actual === typeof esperado && (actual as string) > (esperado as string);
    case '$gte':
      return typeof actual === typeof esperado && (actual as string) >= (esperado as string);
    case '$lt':
      return typeof actual === typeof esperado && (actual as string) < (esperado as string);
    case '$lte':
      return typeof actual === typeof esperado && (actual as string) <= (esperado as string);
    case '$in':
      return Array.isArray(esperado) && esperado.includes(actual);
    case '$nin':
      return Array.isArray(esperado) && !esperado.includes(actual);
    case '$exists':
      return (actual !== undefined) === Boolean(esperado);
    case '$regex': {
      if (typeof esperado !== 'string') throw new ErrorMongo('$regex necesita un texto');
      let re: RegExp;
      try {
        re = new RegExp(esperado);
      } catch {
        throw new ErrorMongo('expresión regular inválida');
      }
      return typeof actual === 'string' && re.test(actual);
    }
    default:
      throw new ErrorMongo(`operador desconocido: ${op}`);
  }
}

/** ¿Este documento cumple el filtro? */
export function coincide(doc: Documento, filtro: Record<string, Valor>): boolean {
  return Object.entries(filtro).every(([campo, condicion]) => {
    const actual = (doc as unknown as Record<string, Valor>)[campo];
    if (esObjetoPlano(condicion)) {
      const claves = Object.keys(condicion);
      if (claves.length > 0 && claves.every((k) => k.startsWith('$'))) {
        return claves.every((k) => aplicarOperador(k, condicion[k], actual));
      }
      return false; // comparar con un objeto literal: nunca es igual a un texto
    }
    return actual === condicion;
  });
}

export function buscarUno(filtro: Record<string, Valor>, docs: Documento[] = DOCUMENTOS): Documento | null {
  return docs.find((d) => coincide(d, filtro)) ?? null;
}

export function buscarTodos(filtro: Record<string, Valor>, docs: Documento[] = DOCUMENTOS): Documento[] {
  return docs.filter((d) => coincide(d, filtro));
}

export type ResultadoLogin =
  | { tipo: 'json-invalido'; mensaje: string }
  | { tipo: 'rechazado'; motivo: string; filtro?: Record<string, Valor> }
  | { tipo: 'error'; mensaje: string; filtro: Record<string, Valor> }
  | { tipo: 'sin-coincidencia'; filtro: Record<string, Valor> }
  | { tipo: 'entro'; filtro: Record<string, Valor>; documento: Documento; legitimo: boolean };

/** Lo que hace el servidor al recibir el cuerpo JSON de la petición de login. */
export function iniciarSesion(cuerpoJson: string, modo: 'vulnerable' | 'seguro'): ResultadoLogin {
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(cuerpoJson);
  } catch {
    return { tipo: 'json-invalido', mensaje: 'El cuerpo no es JSON válido (el servidor respondería 400).' };
  }
  if (!esObjetoPlano(cuerpo)) {
    return { tipo: 'json-invalido', mensaje: 'Se esperaba un objeto JSON con usuario y clave.' };
  }

  if (modo === 'seguro') {
    if (typeof cuerpo.usuario !== 'string' || typeof cuerpo.clave !== 'string') {
      return {
        tipo: 'rechazado',
        motivo: 'usuario y clave deben ser texto. Un objeto como { "$ne": null } se descarta antes de llegar a la base.',
      };
    }
  }

  // Vulnerable: Usuarios.findOne(req.body) usa el cuerpo ENTERO como filtro.
  // Seguro: se arma el filtro con los dos campos, ya validados como texto.
  const filtro: Record<string, Valor> =
    modo === 'vulnerable' ? cuerpo : { usuario: cuerpo.usuario, clave: cuerpo.clave };
  try {
    const documento = buscarUno(filtro);
    if (!documento) return { tipo: 'sin-coincidencia', filtro };
    const legitimo = cuerpo.usuario === documento.usuario && cuerpo.clave === documento.clave;
    return { tipo: 'entro', filtro, documento, legitimo };
  } catch (e) {
    if (e instanceof ErrorMongo) return { tipo: 'error', mensaje: e.message, filtro };
    throw e;
  }
}
