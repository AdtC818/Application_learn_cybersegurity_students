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
} from './utilidadesAst';

/** `fetch(url)`, `axios.get(url)`, `http.get(url)`, `request(url)`, etc. */
const LLAMADAS_HTTP_VIGILADAS = new Set(['fetch', 'get', 'post', 'put', 'delete', 'request']);

/** True for `req.body`, `req.query`, `req.params`, or any property under them. */
function referenciaEntradaDeUsuario(nodo: Node): boolean {
  if (t.isMemberExpression(nodo)) {
    if (t.isIdentifier(nodo.object) && nodo.object.name === 'req') return true;
    return referenciaEntradaDeUsuario(nodo.object);
  }
  return false;
}

function esUrlInsegura(nodo: Node): boolean {
  if (referenciaEntradaDeUsuario(nodo)) return true;
  if (t.isTemplateLiteral(nodo)) return nodo.expressions.some((e) => referenciaEntradaDeUsuario(e as Node));
  if (t.isBinaryExpression(nodo) && contieneInterpolacionDinamica(nodo)) {
    return referenciaEntradaDeUsuario(nodo.left) || referenciaEntradaDeUsuario(nodo.right);
  }
  return false;
}

/**
 * SsrfDetector (Server-Side Request Forgery)
 *
 * Flags outgoing HTTP calls (fetch, axios, a generic `request()`) whose
 * target URL is built directly from request input, with no visible
 * allowlist check. An attacker could point the server at internal
 * services (e.g. `http://169.254.169.254/...` cloud metadata, or an
 * internal admin panel) that are not meant to be reachable from outside.
 */
export class SsrfDetector implements DetectorVulnerabilidad {
  readonly tipo = 'SSRF' as const;
  readonly nombre = 'Server-Side Request Forgery (SSRF)';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;

        let nombreLlamada: string | undefined;
        if (t.isIdentifier(callee)) {
          nombreLlamada = callee.name;
        } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          nombreLlamada = callee.property.name;
        }
        if (!nombreLlamada || !LLAMADAS_HTTP_VIGILADAS.has(nombreLlamada)) return;

        const primerArgumento = args[0] as Node | undefined;
        if (primerArgumento && esUrlInsegura(primerArgumento)) {
          const linea = obtenerLinea(path.node);
          hallazgos.push(
            new Hallazgo({
              tipo: 'SSRF',
              severidad: 'ALTA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion:
                'La URL de esta petición saliente se construye a partir de datos de la solicitud del cliente, sin validarla contra una lista de dominios permitidos. Un atacante podría hacer que el servidor contacte direcciones internas (metadatos de la nube, red interna) que no deberían ser alcanzables desde afuera.',
              recomendacion:
                'Valida la URL contra una lista explícita de hosts/dominios permitidos antes de hacer la petición, y bloquea rangos de IP privados/internos.',
            }),
          );
        }
      },
    });

    return hallazgos;
  }
}
