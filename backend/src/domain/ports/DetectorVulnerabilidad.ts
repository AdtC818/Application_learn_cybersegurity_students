import type { File as BabelFile } from '@babel/types';
import { Hallazgo, TipoVulnerabilidad } from '../entities/Hallazgo';

/**
 * DetectorVulnerabilidad (Strategy port)
 *
 * Every one of the 12 vulnerability checks implements this single
 * interface. The application layer never knows *how* a detector finds its
 * issues (regex over source text, AST pattern matching, etc.) — it just
 * calls `detectar(ast, codigoFuente)` on every registered strategy and
 * concatenates the results. This is what lets new vulnerability categories
 * be added without touching the use case or any other detector.
 */
export interface DetectorVulnerabilidad {
  /** Stable identifier, matches one value of TipoVulnerabilidad. */
  readonly tipo: TipoVulnerabilidad;

  /** Short, human-readable name shown in the UI (e.g. "Inyección SQL"). */
  readonly nombre: string;

  /**
   * Runs this detector's logic against the parsed AST.
   * `codigoFuente` is also passed through because some detectors need the
   * original source text to extract the offending line/fragment verbatim.
   */
  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[];
}
