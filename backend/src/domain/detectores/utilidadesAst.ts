import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { Node } from '@babel/types';

/**
 * @babel/traverse's CommonJS/ESM interop is inconsistent across bundlers
 * and runtimes (sometimes the function is the module itself, sometimes it's
 * under `.default`). This normalizes it once so every detector can just
 * `import { traverse } from './utilidadesAst'` and not worry about it.
 */
export const traverse: typeof _traverse =
  typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

/** Returns the trimmed source line for a given 1-based line number. */
export function obtenerFragmentoLinea(codigoFuente: string, numeroLinea: number): string {
  const lineas = codigoFuente.split('\n');
  return (lineas[numeroLinea - 1] ?? '').trim();
}

export function obtenerLinea(node: Node): number {
  return node.loc?.start.line ?? 0;
}

export function obtenerColumna(node: Node): number | undefined {
  return node.loc?.start.column;
}

/** True if the node is a string literal, or a "+" concatenation of only string literals. */
export function esLiteralPuro(nodo: Node): boolean {
  if (t.isStringLiteral(nodo)) return true;
  if (t.isBinaryExpression(nodo) && nodo.operator === '+') {
    return esLiteralPuro(nodo.left) && esLiteralPuro(nodo.right);
  }
  return false;
}

/**
 * True if the node builds a string using a non-literal value: either a
 * template literal with interpolated expressions, or a "+" concatenation
 * where at least one operand is not a plain string literal.
 */
export function contieneInterpolacionDinamica(nodo: Node): boolean {
  if (t.isTemplateLiteral(nodo)) {
    return nodo.expressions.length > 0;
  }
  if (t.isBinaryExpression(nodo) && nodo.operator === '+') {
    return !esLiteralPuro(nodo);
  }
  return false;
}
