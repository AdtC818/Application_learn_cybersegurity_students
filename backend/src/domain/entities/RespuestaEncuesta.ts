/**
 * RespuestaEncuesta (Survey Response)
 *
 * Captures one student/participant's answers to the perception/acceptance
 * survey described in the thesis's specific objectives (not a learning-
 * improvement measurement — only perceived usefulness and clarity).
 */
export interface RespuestaEncuestaProps {
  id?: string;
  utilidadPercibida: number; // e.g. 1-5 Likert scale
  claridadExplicaciones: number; // e.g. 1-5 Likert scale
  facilidadUso: number; // e.g. 1-5 Likert scale
  comentarios?: string;
  creadoEn?: Date;
}

export class RespuestaEncuesta {
  readonly id?: string;
  readonly utilidadPercibida: number;
  readonly claridadExplicaciones: number;
  readonly facilidadUso: number;
  readonly comentarios?: string;
  readonly creadoEn: Date;

  constructor(props: RespuestaEncuestaProps) {
    this.id = props.id;
    this.utilidadPercibida = props.utilidadPercibida;
    this.claridadExplicaciones = props.claridadExplicaciones;
    this.facilidadUso = props.facilidadUso;
    this.comentarios = props.comentarios;
    this.creadoEn = props.creadoEn ?? new Date();
  }

  toJSON() {
    return {
      id: this.id,
      utilidadPercibida: this.utilidadPercibida,
      claridadExplicaciones: this.claridadExplicaciones,
      facilidadUso: this.facilidadUso,
      comentarios: this.comentarios,
      creadoEn: this.creadoEn,
    };
  }
}
