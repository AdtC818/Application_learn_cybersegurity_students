import { BabelParserAdapter } from '../src/infrastructure/parsers/BabelParserAdapter';

const parser = new BabelParserAdapter();

/** Parses a code snippet the same way the real app does, for use in detector tests. */
export function parsearFragmento(codigo: string) {
  return parser.parsear(codigo);
}
