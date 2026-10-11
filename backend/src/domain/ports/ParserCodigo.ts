import type { File as BabelFile } from '@babel/types';

/**
 * ParserCodigo (Adapter port)
 *
 * The domain and all 12 detectors depend only on this interface, never on
 * @babel/parser directly. @babel/types' `File` node is used here as the
 * shared AST "exchange format" — a conscious, pragmatic simplification:
 * a true hexagonal design would define its own neutral AST shape, but that
 * would force every detector to reimplement tree traversal instead of using
 * @babel/traverse. The trade-off we accept is that swapping the underlying
 * parser later (e.g. to acorn/esprima) requires the new adapter to still
 * produce a Babel-compatible AST — which is realistic, since most
 * JS/TS parsers are ESTree-compatible and can be converted.
 *
 * The concrete implementation (BabelParserAdapter) lives in
 * infrastructure/parsers and is the only place @babel/parser is imported.
 */
export interface ParserCodigo {
  /**
   * Parses raw source code into an AST.
   * @throws ErrorParseo if the code is not syntactically valid.
   */
  parsear(codigoFuente: string): BabelFile;
}

/**
 * Thrown by a ParserCodigo implementation when the submitted code cannot be
 * parsed (e.g. a syntax error). Kept in the domain so use cases can catch
 * it without depending on any parsing-library-specific error type.
 */
export class ErrorParseo extends Error {
  constructor(mensaje: string, readonly causaOriginal?: unknown) {
    super(mensaje);
    this.name = 'ErrorParseo';
  }
}
