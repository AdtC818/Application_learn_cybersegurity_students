/**
 * Hallazgo (Finding)
 *
 * Represents a single security issue detected in a piece of source code.
 * This is the central entity of the domain: every detector produces zero or
 * more Hallazgo instances, and the rest of the system (HTTP layer,
 * persistence, frontend) only ever deals with this shape.
 */

export type Severidad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

/**
 * The 12 vulnerability categories this tool is scoped to detect.
 * Keeping this as a union (instead of a free string) means the registry,
 * the detectors and the persistence layer all stay in sync at compile time.
 */
export type TipoVulnerabilidad =
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

export interface HallazgoProps {
  tipo: TipoVulnerabilidad;
  severidad: Severidad;
  linea: number;
  columna?: number;
  codigoFragmento: string;
  explicacion: string;
  recomendacion: string;
}

/**
 * Immutable value object. Detectors build these; nothing downstream
 * mutates them.
 */
export class Hallazgo {
  readonly tipo: TipoVulnerabilidad;
  readonly severidad: Severidad;
  readonly linea: number;
  readonly columna?: number;
  readonly codigoFragmento: string;
  readonly explicacion: string;
  readonly recomendacion: string;

  constructor(props: HallazgoProps) {
    this.tipo = props.tipo;
    this.severidad = props.severidad;
    this.linea = props.linea;
    this.columna = props.columna;
    this.codigoFragmento = props.codigoFragmento;
    this.explicacion = props.explicacion;
    this.recomendacion = props.recomendacion;
  }

  toJSON() {
    return {
      tipo: this.tipo,
      severidad: this.severidad,
      linea: this.linea,
      columna: this.columna,
      codigoFragmento: this.codigoFragmento,
      explicacion: this.explicacion,
      recomendacion: this.recomendacion,
    };
  }
}
