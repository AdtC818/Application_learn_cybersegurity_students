import { ParserCodigo } from '../../domain/ports/ParserCodigo';
import { RepositorioAnalisis } from '../../domain/ports/RepositorioAnalisis';
import { DetectorVulnerabilidad } from '../../domain/ports/DetectorVulnerabilidad';
import { Analisis } from '../../domain/entities/Analisis';
import { Hallazgo } from '../../domain/entities/Hallazgo';

export interface AnalizarCodigoEntrada {
  codigoFuente: string;
  nombreArchivo?: string;
  lenguaje?: 'javascript' | 'typescript';
  guardarEnHistorial?: boolean;
}

/**
 * AnalizarCodigo (use case)
 *
 * Orchestrates a single analysis run: parse the source into an AST (via
 * the ParserCodigo port), run every registered DetectorVulnerabilidad
 * strategy against it, collect the findings into an Analisis entity and,
 * optionally, persist it (via the RepositorioAnalisis port).
 *
 * This class only depends on ports/entities — never on @babel/* or Prisma
 * directly — which is what keeps it trivially unit-testable with fakes.
 */
export class AnalizarCodigo {
  constructor(
    private readonly parser: ParserCodigo,
    private readonly detectores: DetectorVulnerabilidad[],
    private readonly repositorioAnalisis: RepositorioAnalisis,
  ) {}

  async ejecutar(entrada: AnalizarCodigoEntrada): Promise<Analisis> {
    // Puede lanzar ErrorParseo si el código tiene un error de sintaxis;
    // se deja propagar para que la capa HTTP la traduzca a un 400.
    const ast = this.parser.parsear(entrada.codigoFuente);

    const hallazgos: Hallazgo[] = [];
    for (const detector of this.detectores) {
      hallazgos.push(...detector.detectar(ast, entrada.codigoFuente));
    }
    hallazgos.sort((a, b) => a.linea - b.linea);

    const analisis = new Analisis({
      nombreArchivo: entrada.nombreArchivo,
      codigoFuente: entrada.codigoFuente,
      lenguaje: entrada.lenguaje ?? 'javascript',
      hallazgos,
    });

    if (entrada.guardarEnHistorial) {
      return this.repositorioAnalisis.guardar(analisis);
    }

    return analisis;
  }
}
