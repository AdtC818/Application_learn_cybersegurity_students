import type { Severidad } from '../tipos';

export type TipoVuln =
  | 'SQL_INJECTION'
  | 'XSS'
  | 'HARDCODED_SECRETS'
  | 'WEAK_CRYPTO'
  | 'NOSQL_INJECTION'
  | 'PATH_TRAVERSAL'
  | 'PROTOTYPE_POLLUTION'
  | 'CORS_MISCONFIGURATION'
  | 'INSECURE_SESSION_COOKIES'
  | 'SSRF'
  | 'DANGEROUS_FUNCTIONS'
  | 'SENSITIVE_DATA_LOGGING';

export type NombreGlifo =
  | 'persona'
  | 'atacante'
  | 'servidor'
  | 'base'
  | 'navegador'
  | 'archivo'
  | 'carpeta'
  | 'nube'
  | 'llave'
  | 'candado'
  | 'terminal'
  | 'galleta'
  | 'repo'
  | 'ojo'
  | 'escudo'
  | 'bot'
  | 'llaves'
  | 'cadena'
  | 'muro'
  | 'diana'
  | 'registro';

export interface InfoCategoria {
  tipo: TipoVuln;
  /** Identificador corto para la URL (#/labs/sql). */
  slug: string;
  nombre: string;
  /** Severidad con la que el detector suele reportarla. */
  severidad: Severidad;
  /** Una frase: qué sale mal. */
  gancho: string;
  glifo: NombreGlifo;
}

/** Orden en el que se muestran los laboratorios. */
export const CATALOGO: InfoCategoria[] = [
  {
    tipo: 'SQL_INJECTION',
    slug: 'sql',
    nombre: 'Inyección SQL',
    severidad: 'CRITICA',
    gancho: 'Lo que escribe el usuario se convierte en parte de tu consulta.',
    glifo: 'base',
  },
  {
    tipo: 'XSS',
    slug: 'xss',
    nombre: 'Cross-Site Scripting (XSS)',
    severidad: 'ALTA',
    gancho: 'Tu página ejecuta el JavaScript de un desconocido.',
    glifo: 'navegador',
  },
  {
    tipo: 'HARDCODED_SECRETS',
    slug: 'secretos',
    nombre: 'Credenciales en el código',
    severidad: 'ALTA',
    gancho: 'Una clave escrita en el código viaja con el repositorio.',
    glifo: 'llave',
  },
  {
    tipo: 'WEAK_CRYPTO',
    slug: 'cripto',
    nombre: 'Criptografía débil',
    severidad: 'MEDIA',
    gancho: 'Un hash rápido se rompe probando contraseñas a toda velocidad.',
    glifo: 'candado',
  },
  {
    tipo: 'NOSQL_INJECTION',
    slug: 'nosql',
    nombre: 'Inyección NoSQL',
    severidad: 'CRITICA',
    gancho: 'Un objeto en lugar de un texto abre la puerta.',
    glifo: 'llaves',
  },
  {
    tipo: 'PATH_TRAVERSAL',
    slug: 'rutas',
    nombre: 'Path Traversal',
    severidad: 'ALTA',
    gancho: 'Con ../ sales de la carpeta y lees lo que no debías.',
    glifo: 'carpeta',
  },
  {
    tipo: 'PROTOTYPE_POLLUTION',
    slug: 'prototipos',
    nombre: 'Prototype Pollution',
    severidad: 'ALTA',
    gancho: 'Un dato contamina a todos los objetos de la aplicación.',
    glifo: 'cadena',
  },
  {
    tipo: 'CORS_MISCONFIGURATION',
    slug: 'cors',
    nombre: 'CORS mal configurado',
    severidad: 'MEDIA',
    gancho: 'Un sitio ajeno puede leer las respuestas de tu API.',
    glifo: 'muro',
  },
  {
    tipo: 'INSECURE_SESSION_COOKIES',
    slug: 'cookies',
    nombre: 'Cookies de sesión inseguras',
    severidad: 'ALTA',
    gancho: 'La sesión se roba porque la cookie quedó sin protección.',
    glifo: 'galleta',
  },
  {
    tipo: 'SSRF',
    slug: 'ssrf',
    nombre: 'SSRF',
    severidad: 'ALTA',
    gancho: 'Tu servidor hace de mensajero hacia tu red interna.',
    glifo: 'diana',
  },
  {
    tipo: 'DANGEROUS_FUNCTIONS',
    slug: 'ejecucion',
    nombre: 'Funciones peligrosas (eval y exec)',
    severidad: 'CRITICA',
    gancho: 'El texto del usuario se convierte en órdenes de tu servidor.',
    glifo: 'terminal',
  },
  {
    tipo: 'SENSITIVE_DATA_LOGGING',
    slug: 'logs',
    nombre: 'Datos sensibles en los logs',
    severidad: 'MEDIA',
    gancho: 'Las contraseñas terminan escritas en los registros.',
    glifo: 'registro',
  },
];

const POR_TIPO = new Map<string, InfoCategoria>(CATALOGO.map((c) => [c.tipo, c]));
const POR_SLUG = new Map<string, InfoCategoria>(CATALOGO.map((c) => [c.slug, c]));

export function infoDeTipo(tipo: string): InfoCategoria | undefined {
  return POR_TIPO.get(tipo);
}

export function infoDeSlug(slug: string): InfoCategoria | undefined {
  return POR_SLUG.get(slug);
}

export const NOMBRE_SEVERIDAD: Record<Severidad, string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
};

export const ORDEN_SEVERIDAD: Severidad[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA'];

/** Ordena los hallazgos del más grave al menos grave y, a igual gravedad, por línea. */
export function ordenarPorGravedad<T extends { severidad: Severidad; linea: number }>(lista: readonly T[]): T[] {
  return [...lista].sort(
    (a, b) => ORDEN_SEVERIDAD.indexOf(a.severidad) - ORDEN_SEVERIDAD.indexOf(b.severidad) || a.linea - b.linea,
  );
}
