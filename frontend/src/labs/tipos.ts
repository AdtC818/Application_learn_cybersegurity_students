import type { ComponentType } from 'react';
import type { NombreGlifo, TipoVuln } from '../contenido/catalogo';

export type Modo = 'vulnerable' | 'seguro';

export interface PropsLab {
  modo: Modo;
}

export interface PasoFlujo {
  glifo: NombreGlifo;
  titulo: string;
  texto: string;
}

export interface OpcionReto {
  /** Fragmento de código corto. */
  codigo: string;
  /** Por qué esta opción es (o no es) la correcta. */
  comentario: string;
}

export interface Reto {
  pregunta: string;
  opciones: OpcionReto[];
  /** Índice de la opción segura. */
  correcta: number;
}

export interface ContenidoLab {
  tipo: TipoVuln;
  /** Entrada -> fallo -> consecuencia: la historia en tres pasos. */
  flujo: [PasoFlujo, PasoFlujo, PasoFlujo];
  codigoVulnerable: string;
  /** Líneas (desde 1) que hay que marcar como peligrosas. */
  lineasVulnerables: number[];
  /** Notas que explican el recorrido del dato, por línea. */
  notasVulnerable: Record<number, string>;
  codigoSeguro: string;
  lineasSeguras: number[];
  notasSeguro: Record<number, string>;
  /** La regla que hay que llevarse. */
  regla: string;
  reto: Reto;
  Laboratorio: ComponentType<PropsLab>;
}
