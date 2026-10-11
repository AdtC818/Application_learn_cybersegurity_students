import type { File as BabelFile, Node } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

function reportar(
  hallazgos: Hallazgo[],
  codigoFuente: string,
  nodo: Node,
  detalle: string,
) {
  const linea = (nodo.loc?.start.line as number) ?? 0;
  hallazgos.push(
    new Hallazgo({
      tipo: 'CORS_MISCONFIGURATION',
      severidad: 'MEDIA',
      linea,
      columna: nodo.loc?.start.column,
      codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
      explicacion: detalle,
      recomendacion:
        'Define una lista explícita de orígenes permitidos (whitelist) en vez de "*", y solo activa "credentials: true" junto con un origen específico, nunca junto con el comodín.',
    }),
  );
}

/**
 * CorsMisconfigurationDetector
 *
 * Flags two common CORS misconfigurations:
 *  - `res.setHeader('Access-Control-Allow-Origin', '*')` set manually.
 *  - The `cors()` middleware configured with `origin: '*'` (or `origin: true`).
 */
export class CorsMisconfigurationDetector implements DetectorVulnerabilidad {
  readonly tipo = 'CORS_MISCONFIGURATION' as const;
  readonly nombre = 'Configuración insegura de CORS';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;

        // res.setHeader('Access-Control-Allow-Origin', '*')
        if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          if (['setHeader', 'set', 'header'].includes(callee.property.name)) {
            const [cabecera, valor] = args;
            if (
              t.isStringLiteral(cabecera) &&
              cabecera.value.toLowerCase() === 'access-control-allow-origin' &&
              t.isStringLiteral(valor) &&
              valor.value === '*'
            ) {
              reportar(
                hallazgos,
                codigoFuente,
                path.node,
                'Se establece manualmente "Access-Control-Allow-Origin: *", permitiendo que cualquier sitio web haga peticiones a esta API y lea su respuesta.',
              );
              return;
            }
          }
        }

        // cors({ origin: '*' }) or cors({ origin: true })
        if (
          (t.isIdentifier(callee) && callee.name === 'cors') ||
          (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === 'cors')
        ) {
          const opciones = args[0];
          if (t.isObjectExpression(opciones)) {
            const propiedadOrigin = opciones.properties.find(
              (p): p is t.ObjectProperty =>
                t.isObjectProperty(p) && t.isIdentifier(p.key) && p.key.name === 'origin',
            );
            if (
              propiedadOrigin &&
              ((t.isStringLiteral(propiedadOrigin.value) && propiedadOrigin.value.value === '*') ||
                (t.isBooleanLiteral(propiedadOrigin.value) && propiedadOrigin.value.value === true))
            ) {
              reportar(
                hallazgos,
                codigoFuente,
                path.node,
                'El middleware cors() se configura con "origin" abierto a cualquier sitio (comodín "*" o "true"), lo que anula la protección que CORS debería ofrecer.',
              );
            }
          }
        }
      },
    });

    return hallazgos;
  }
}
