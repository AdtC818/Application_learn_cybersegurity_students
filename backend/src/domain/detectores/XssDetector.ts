import type { File as BabelFile, Node } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import {
  traverse,
  obtenerFragmentoLinea,
  obtenerLinea,
  obtenerColumna,
  contieneInterpolacionDinamica,
  esLiteralPuro,
} from './utilidadesAst';

const PROPIEDADES_PELIGROSAS = new Set(['innerHTML', 'outerHTML']);

/** True for anything that is not a plain string literal — i.e. a value we cannot prove is safe/static. */
function esValorDinamico(nodo: Node): boolean {
  return !esLiteralPuro(nodo) && (contieneInterpolacionDinamica(nodo) || !t.isStringLiteral(nodo));
}

/**
 * XssDetector
 *
 * Flags two classic DOM-based XSS sinks:
 *  - `element.innerHTML = <dynamic value>` / `.outerHTML = ...`
 *  - `document.write(<dynamic value>)`
 *
 * "Dynamic" here means anything other than a literal/constant string:
 * a bare identifier, a member access, a function call, a template literal
 * with interpolation, or a concatenation involving a non-literal.
 */
export class XssDetector implements DetectorVulnerabilidad {
  readonly tipo = 'XSS' as const;
  readonly nombre = 'Cross-Site Scripting (XSS)';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    const reportar = (nodo: Node, sink: string) => {
      const linea = obtenerLinea(nodo);
      hallazgos.push(
        new Hallazgo({
          tipo: 'XSS',
          severidad: 'ALTA',
          linea,
          columna: obtenerColumna(nodo),
          codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
          explicacion: `Se está escribiendo un valor que no es un texto fijo directamente en "${sink}". Si ese valor incluye entrada de un usuario sin "escapar" (sin convertir "<", ">", etc. a su forma segura), un atacante puede inyectar HTML/JavaScript que se ejecutará en el navegador de otras personas.`,
          recomendacion:
            sink === 'document.write'
              ? 'Evita document.write con contenido dinámico; usa manipulación segura del DOM (textContent, o una librería que escape el contenido) o un framework de UI que escape por defecto (React, etc.).'
              : 'Usa "textContent" en vez de "innerHTML" cuando solo necesitas texto, o sanitiza el HTML con una librería confiable (por ejemplo DOMPurify) antes de asignarlo.',
        }),
      );
    };

    traverse(ast, {
      AssignmentExpression(path) {
        const { left, right } = path.node;
        if (
          t.isMemberExpression(left) &&
          t.isIdentifier(left.property) &&
          PROPIEDADES_PELIGROSAS.has(left.property.name) &&
          esValorDinamico(right)
        ) {
          reportar(path.node, `.${left.property.name}`);
        }
      },
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object) &&
          callee.object.name === 'document' &&
          t.isIdentifier(callee.property) &&
          callee.property.name === 'write'
        ) {
          const primerArgumento = args[0];
          if (primerArgumento && esValorDinamico(primerArgumento)) {
            reportar(path.node, 'document.write');
          }
        }
      },
    });

    return hallazgos;
  }
}
