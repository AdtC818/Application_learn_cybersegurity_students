import type { TipoVuln } from '../contenido/catalogo';
import type { ContenidoLab } from './tipos';
import sql from './contenidos/sql';
import xss from './contenidos/xss';
import secretos from './contenidos/secretos';
import cripto from './contenidos/cripto';
import nosql from './contenidos/nosql';
import rutas from './contenidos/rutas';
import prototipos from './contenidos/prototipos';
import cors from './contenidos/cors';
import cookies from './contenidos/cookies';
import ssrf from './contenidos/ssrf';
import ejecucion from './contenidos/ejecucion';
import logs from './contenidos/logs';

/** Todos los laboratorios, por categoría de vulnerabilidad. */
export const LABS: Partial<Record<TipoVuln, ContenidoLab>> = {
  SQL_INJECTION: sql,
  XSS: xss,
  HARDCODED_SECRETS: secretos,
  WEAK_CRYPTO: cripto,
  NOSQL_INJECTION: nosql,
  PATH_TRAVERSAL: rutas,
  PROTOTYPE_POLLUTION: prototipos,
  CORS_MISCONFIGURATION: cors,
  INSECURE_SESSION_COOKIES: cookies,
  SSRF: ssrf,
  DANGEROUS_FUNCTIONS: ejecucion,
  SENSITIVE_DATA_LOGGING: logs,
};

export function contenidoDe(tipo: string): ContenidoLab | undefined {
  return LABS[tipo as TipoVuln];
}
