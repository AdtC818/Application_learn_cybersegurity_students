import { parse } from '@babel/parser';
import type { File as BabelFile } from '@babel/types';
import { ParserCodigo, ErrorParseo } from '../../domain/ports/ParserCodigo';

/**
 * BabelParserAdapter
 *
 * The only file in the codebase allowed to `import` from @babel/parser.
 * Implements the ParserCodigo port so the rest of the application never
 * has to know which parsing library is behind it (Adapter pattern).
 *
 * IMPORTANT (explicit design decision): this tool only performs STATIC
 * analysis. It parses source text into an AST and never executes it
 * (no eval, no vm.Script, no sandboxing) — submitted code is untrusted
 * input and must never run on the server.
 */
export class BabelParserAdapter implements ParserCodigo {
  parsear(codigoFuente: string): BabelFile {
    try {
      return parse(codigoFuente, {
        sourceType: 'unambiguous',
        // Accept both plain JS and TS/JSX syntax so the tool doesn't choke
        // on files using either — detectors just see a standard AST.
        plugins: ['typescript', 'jsx'],
        errorRecovery: false,
      });
    } catch (error) {
      throw new ErrorParseo(
        'No se pudo analizar el código: contiene un error de sintaxis.',
        error,
      );
    }
  }
}
