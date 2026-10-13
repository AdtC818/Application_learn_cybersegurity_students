/**
 * Reglas de CORS tal como las aplica el navegador, para el laboratorio de CORS.
 */

export type ConfigCors = 'asterisco' | 'asterisco-credenciales' | 'refleja' | 'fijo';

export const ORIGEN_LEGITIMO = 'https://app.banco.example';
export const ORIGEN_ATACANTE = 'https://sitio-malicioso.example';

export interface OpcionCors {
  id: ConfigCors;
  codigo: string;
  descripcion: string;
}

export const OPCIONES_CORS: OpcionCors[] = [
  { id: 'asterisco', codigo: "cors({ origin: '*' })", descripcion: 'Cualquier sitio, sin cookies' },
  {
    id: 'asterisco-credenciales',
    codigo: "cors({ origin: '*', credentials: true })",
    descripcion: 'Cualquier sitio, con cookies',
  },
  {
    id: 'refleja',
    codigo: 'cors({ origin: true, credentials: true })',
    descripcion: 'Repite el origen que le pida cualquiera',
  },
  {
    id: 'fijo',
    codigo: `cors({ origin: '${ORIGEN_LEGITIMO}', credentials: true })`,
    descripcion: 'Solo tu propio sitio',
  },
];

export interface ResultadoCors {
  acao: string;
  acac: boolean;
  /** El navegador deja que el JavaScript de esa página lea la respuesta. */
  permiteLeer: boolean;
  /** Lo que lee incluye datos de la sesión de la víctima. */
  datosPrivados: boolean;
  motivo: string;
}

export function evaluarCors(config: ConfigCors, origenPagina: string, conCredenciales: boolean): ResultadoCors {
  const acao =
    config === 'asterisco' || config === 'asterisco-credenciales'
      ? '*'
      : config === 'refleja'
        ? origenPagina
        : ORIGEN_LEGITIMO;
  const acac = config !== 'asterisco';

  let permiteLeer: boolean;
  let motivo: string;

  if (conCredenciales) {
    if (acao === '*') {
      permiteLeer = false;
      motivo =
        'Con cookies, el navegador no acepta Access-Control-Allow-Origin: *. Bloquea la lectura (pero esta config también rompe tu propia app).';
    } else if (acao !== origenPagina) {
      permiteLeer = false;
      motivo = 'El origen de la página no coincide con el permitido: el navegador bloquea la lectura.';
    } else if (!acac) {
      permiteLeer = false;
      motivo = 'Falta Access-Control-Allow-Credentials: true.';
    } else {
      permiteLeer = true;
      motivo = 'Origen permitido y credenciales aceptadas: el navegador entrega la respuesta a la página.';
    }
  } else if (acao === '*' || acao === origenPagina) {
    permiteLeer = true;
    motivo = 'Sin cookies la lectura se permite, pero el servidor responde como si fuera un visitante anónimo.';
  } else {
    permiteLeer = false;
    motivo = 'El origen de la página no coincide con el permitido: el navegador bloquea la lectura.';
  }

  return { acao, acac, permiteLeer, datosPrivados: permiteLeer && conCredenciales, motivo };
}
