import { Hallazgo } from './Hallazgo';

/**
 * Analisis (Analysis)
 *
 * One completed run of the static-analysis engine over a snippet of code.
 * This is what gets persisted so a student can come back later and see
 * their analysis history.
 */
export interface AnalisisProps {
  id?: string;
  nombreArchivo?: string;
  codigoFuente: string;
  lenguaje: 'javascript' | 'typescript';
  hallazgos: Hallazgo[];
  creadoEn?: Date;
}

export class Analisis {
  readonly id?: string;
  readonly nombreArchivo?: string;
  readonly codigoFuente: string;
  readonly lenguaje: 'javascript' | 'typescript';
  readonly hallazgos: Hallazgo[];
  readonly creadoEn: Date;

  constructor(props: AnalisisProps) {
    this.id = props.id;
    this.nombreArchivo = props.nombreArchivo;
    this.codigoFuente = props.codigoFuente;
    this.lenguaje = props.lenguaje;
    this.hallazgos = props.hallazgos;
    this.creadoEn = props.creadoEn ?? new Date();
  }

  get totalHallazgos(): number {
    return this.hallazgos.length;
  }

  toJSON() {
    return {
      id: this.id,
      nombreArchivo: this.nombreArchivo,
      codigoFuente: this.codigoFuente,
      lenguaje: this.lenguaje,
      hallazgos: this.hallazgos.map((h) => h.toJSON()),
      totalHallazgos: this.totalHallazgos,
      creadoEn: this.creadoEn,
    };
  }
}
