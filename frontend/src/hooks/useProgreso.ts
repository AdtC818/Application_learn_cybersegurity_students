import { useSyncExternalStore } from 'react';
import type { TipoVuln } from '../contenido/catalogo';

/**
 * Qué laboratorios ya completó la persona. Se guarda solo en su navegador
 * (localStorage); no se envía a ningún servidor. Si el almacenamiento no está
 * disponible, el progreso vive solo mientras la pestaña esté abierta.
 */

const CLAVE = 'laboratorio-seguridad.progreso.v1';

function leerGuardado(): Set<TipoVuln> {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return new Set();
    const lista: unknown = JSON.parse(crudo);
    return new Set(Array.isArray(lista) ? (lista.filter((x) => typeof x === 'string') as TipoVuln[]) : []);
  } catch {
    return new Set();
  }
}

function guardar(conjunto: Set<TipoVuln>) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify([...conjunto]));
  } catch {
    /* sin almacenamiento: se sigue en memoria */
  }
}

let completados: ReadonlySet<TipoVuln> = leerGuardado();
const oyentes = new Set<() => void>();

function emitir() {
  oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function marcarCompletado(tipo: TipoVuln) {
  if (completados.has(tipo)) return;
  const nuevo = new Set(completados);
  nuevo.add(tipo);
  completados = nuevo;
  guardar(nuevo);
  emitir();
}

export function reiniciarProgreso() {
  completados = new Set();
  guardar(new Set());
  emitir();
}

export function useProgreso() {
  const actual = useSyncExternalStore(suscribir, () => completados, () => completados);
  return { completados: actual, marcarCompletado, reiniciarProgreso };
}
