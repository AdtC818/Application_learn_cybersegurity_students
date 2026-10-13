/**
 * Resolución de rutas estilo POSIX para el laboratorio de Path Traversal.
 * Imita path.join / path.resolve de Node sobre un sistema de archivos de juguete.
 */

export const BASE = '/app/uploads';

export interface ArchivoJuguete {
  ruta: string;
  contenido: string;
  secreto?: boolean;
}

export const ARCHIVOS: ArchivoJuguete[] = [
  { ruta: '/app/uploads/foto.png', contenido: '[imagen PNG: 14 KB]' },
  { ruta: '/app/uploads/informe.pdf', contenido: '[documento PDF: 82 KB]' },
  {
    ruta: '/app/config/secretos.env',
    contenido: 'DB_URL=postgres://admin:clave-de-ejemplo@db/prod\nJWT_SECRET=secreto-de-ejemplo',
    secreto: true,
  },
  {
    ruta: '/etc/passwd',
    contenido: 'root:x:0:0:root:/root:/bin/bash\nwww-data:x:33:33::/var/www:/usr/sbin/nologin',
    secreto: true,
  },
];

/** Normaliza una ruta: resuelve «.» y «..» (sin pasar de la raíz). */
export function normalizar(ruta: string): string {
  const salida: string[] = [];
  for (const parte of ruta.split('/')) {
    if (parte === '' || parte === '.') continue;
    if (parte === '..') salida.pop();
    else salida.push(parte);
  }
  return '/' + salida.join('/');
}

/** path.join(base, relativa): une y normaliza (una ruta absoluta NO reemplaza a la base). */
export function unir(base: string, relativa: string): string {
  return normalizar(`${base}/${relativa}`);
}

/** path.resolve(base, relativa): una ruta absoluta sí reemplaza a la base. */
export function resolver(base: string, relativa: string): string {
  return relativa.startsWith('/') ? normalizar(relativa) : normalizar(`${base}/${relativa}`);
}

/** Cada carpeta por la que «pasa» la ruta mientras se interpreta, para animar el recorrido. */
export function recorrido(base: string, relativa: string): string[] {
  const pasos: string[] = [normalizar(base)];
  let actual = normalizar(base);
  for (const parte of relativa.split('/')) {
    if (parte === '' || parte === '.') continue;
    actual = parte === '..' ? normalizar(`${actual}/..`) : normalizar(`${actual}/${parte}`);
    pasos.push(actual);
  }
  return pasos;
}

export function estaDentro(base: string, ruta: string): boolean {
  return ruta === base || ruta.startsWith(base + '/');
}

export type RespuestaArchivo =
  | { tipo: 'ok'; ruta: string; contenido: string; fueraDeBase: boolean; secreto: boolean }
  | { tipo: 'no-existe'; ruta: string }
  | { tipo: 'prohibido'; ruta: string };

/** Lo que hace el servidor al pedirle un archivo por nombre. */
export function servirArchivo(nombre: string, modo: 'vulnerable' | 'seguro'): RespuestaArchivo {
  if (modo === 'vulnerable') {
    const ruta = unir(BASE, nombre);
    return buscar(ruta);
  }
  const ruta = resolver(BASE, nombre);
  if (!estaDentro(BASE, ruta)) return { tipo: 'prohibido', ruta };
  return buscar(ruta);
}

function buscar(ruta: string): RespuestaArchivo {
  const archivo = ARCHIVOS.find((a) => a.ruta === ruta);
  if (!archivo) return { tipo: 'no-existe', ruta };
  return {
    tipo: 'ok',
    ruta,
    contenido: archivo.contenido,
    fueraDeBase: !estaDentro(BASE, ruta),
    secreto: Boolean(archivo.secreto),
  };
}
