export type Severidad = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface Hallazgo {
  tipo: string;
  severidad: Severidad;
  linea: number;
  columna?: number;
  codigoFragmento: string;
  explicacion: string;
  recomendacion: string;
}

export interface ResultadoAnalisis {
  id?: string;
  nombreArchivo?: string;
  codigoFuente: string;
  lenguaje: string;
  hallazgos: Hallazgo[];
  totalHallazgos: number;
  creadoEn: string;
}
