/**
 * Modelo de la cadena de prototipos de JavaScript para el laboratorio de
 * Prototype Pollution.
 *
 * IMPORTANTE: no se toca el Object.prototype real de la página. Todo ocurre
 * sobre objetos "de modelo" (simples registros), así que la simulación no
 * puede contaminar nada de verdad.
 */

export interface ObjModelo {
  id: string;
  etiqueta: string;
  propias: Record<string, unknown>;
  proto: ObjModelo | null;
}

export interface Mundo {
  objectPrototype: ObjModelo;
  /** La función Object: su propiedad `prototype` apunta a Object.prototype. */
  funcionObject: ObjModelo;
  config: ObjModelo;
}

export function crearMundo(): Mundo {
  const objectPrototype: ObjModelo = {
    id: 'Object.prototype',
    etiqueta: 'Object.prototype',
    propias: {},
    proto: null,
  };
  const funcionObject: ObjModelo = {
    id: 'Object',
    etiqueta: 'Object (función)',
    propias: {},
    proto: null,
  };
  funcionObject.propias.prototype = objectPrototype;
  const config: ObjModelo = {
    id: 'config',
    etiqueta: 'config',
    propias: { tema: 'claro', idioma: 'es' },
    proto: objectPrototype,
  };
  return { objectPrototype, funcionObject, config };
}

export function nuevoObjeto(mundo: Mundo, id: string, propias: Record<string, unknown> = {}): ObjModelo {
  return { id, etiqueta: id, propias: { ...propias }, proto: mundo.objectPrototype };
}

/** Lee una propiedad como lo hace JavaScript: primero las propias, luego sube por la cadena. */
export function leerPropiedad(obj: ObjModelo, clave: string): unknown {
  let actual: ObjModelo | null = obj;
  while (actual) {
    if (Object.prototype.hasOwnProperty.call(actual.propias, clave)) return actual.propias[clave];
    actual = actual.proto;
  }
  return undefined;
}

export interface PasoMerge {
  ruta: string;
  accion: 'copiar' | 'contaminar' | 'bloquear';
  detalle: string;
}

function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const CLAVES_PELIGROSAS = ['__proto__', 'constructor', 'prototype'];

/** Lo que significa `destino[clave]` para un objeto del modelo. */
function accederHijo(mundo: Mundo, destino: ObjModelo, clave: string): ObjModelo | undefined {
  if (clave === '__proto__') return destino.proto ?? undefined;
  if (clave === 'constructor') return mundo.funcionObject; // todos los objetos planos heredan Object
  const propio = destino.propias[clave];
  if (propio && typeof propio === 'object' && 'propias' in (propio as object)) return propio as ObjModelo;
  return undefined;
}

/**
 * merge recursivo (como muchas utilidades "deepMerge" caseras).
 * En modo seguro ignora las claves que permiten llegar a los prototipos.
 */
export function fusionar(
  mundo: Mundo,
  destino: ObjModelo,
  origen: Record<string, unknown>,
  seguro: boolean,
  ruta = '',
  pasos: PasoMerge[] = [],
): PasoMerge[] {
  for (const clave of Object.keys(origen)) {
    const rutaClave = ruta ? `${ruta}.${clave}` : clave;
    if (seguro && CLAVES_PELIGROSAS.includes(clave)) {
      pasos.push({
        ruta: rutaClave,
        accion: 'bloquear',
        detalle: `Se ignora «${clave}»: no se permite recorrer los prototipos.`,
      });
      continue;
    }

    const valor = origen[clave];
    if (esObjetoPlano(valor)) {
      let hijo = accederHijo(mundo, destino, clave);
      if (!hijo) {
        hijo = nuevoObjeto(mundo, clave);
        destino.propias[clave] = hijo;
      }
      fusionar(mundo, hijo, valor, seguro, rutaClave, pasos);
    } else {
      destino.propias[clave] = valor;
      const contamina = destino === mundo.objectPrototype;
      pasos.push({
        ruta: rutaClave,
        accion: contamina ? 'contaminar' : 'copiar',
        detalle: contamina
          ? `Se escribió «${clave}» en Object.prototype: ahora TODOS los objetos lo heredan.`
          : `Se copió «${clave}» en ${destino.etiqueta}.`,
      });
    }
  }
  return pasos;
}

/** Interpreta el texto como JSON (JSON.parse crea «__proto__» como una clave normal, sin efectos). */
export function leerCarga(texto: string): { ok: true; valor: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const valor: unknown = JSON.parse(texto);
    if (!esObjetoPlano(valor)) return { ok: false, error: 'Se esperaba un objeto JSON, por ejemplo { "tema": "oscuro" }.' };
    return { ok: true, valor };
  } catch {
    return { ok: false, error: 'JSON inválido: revisa comillas y llaves.' };
  }
}

/** Propiedades visibles en un objeto: las propias y las heredadas (marcadas). */
export function propiedadesVisibles(obj: ObjModelo): Array<{ clave: string; valor: unknown; heredada: boolean }> {
  const salida: Array<{ clave: string; valor: unknown; heredada: boolean }> = [];
  const vistas = new Set<string>();
  let actual: ObjModelo | null = obj;
  let primero = true;
  while (actual) {
    for (const [clave, valor] of Object.entries(actual.propias)) {
      if (vistas.has(clave)) continue;
      if (valor && typeof valor === 'object' && 'propias' in (valor as object) && clave !== 'prototype') {
        // objetos anidados del modelo: se muestran como [objeto]
        salida.push({ clave, valor: '[objeto]', heredada: !primero });
      } else if (clave === 'prototype') {
        continue;
      } else {
        salida.push({ clave, valor, heredada: !primero });
      }
      vistas.add(clave);
    }
    actual = actual.proto;
    primero = false;
  }
  return salida;
}
