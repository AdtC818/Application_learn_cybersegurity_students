import type { File as BabelFile, Node } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

const FUNCIONES_DE_FUSION = new Set(['merge', 'extend', 'defaultsDeep', 'assign']);

/** True for `req.body`, `req.query` or `req.params`. */
function esObjetoDeSolicitud(nodo: Node): boolean {
  return (
    t.isMemberExpression(nodo) &&
    t.isIdentifier(nodo.object) &&
    nodo.object.name === 'req' &&
    t.isIdentifier(nodo.property) &&
    ['body', 'query', 'params'].includes(nodo.property.name)
  );
}

/**
 * PrototypePollutionDetector
 *
 * Flags "deep merge" style calls (lodash's `_.merge`, `Object.assign`,
 * `extend`, `defaultsDeep`, etc.) where a request object is merged into an
 * existing object without filtering keys first. If the request body
 * contains a key like `"__proto__"` or `"constructor"`, these functions can
 * let an attacker pollute `Object.prototype`, affecting the whole
 * application.
 */
export class PrototypePollutionDetector implements DetectorVulnerabilidad {
  readonly tipo = 'PROTOTYPE_POLLUTION' as const;
  readonly nombre = 'Prototype Pollution (contaminación de prototipos)';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;

        let nombreFuncion: string | undefined;
        if (t.isIdentifier(callee)) {
          nombreFuncion = callee.name;
        } else if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          nombreFuncion = callee.property.name;
        }
        if (!nombreFuncion || !FUNCIONES_DE_FUSION.has(nombreFuncion)) return;

        const argumentoSospechoso = args.find((a) => esObjetoDeSolicitud(a as Node));
        if (argumentoSospechoso) {
          const linea = obtenerLinea(path.node);
          hallazgos.push(
            new Hallazgo({
              tipo: 'PROTOTYPE_POLLUTION',
              severidad: 'ALTA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion: `"${nombreFuncion}()" fusiona un objeto de la solicitud (req.body/query/params) dentro de otro objeto. Si el atacante incluye una clave como "__proto__" o "constructor.prototype", puede modificar Object.prototype y afectar el comportamiento de toda la aplicación.`,
              recomendacion:
                'Evita fusionar objetos de la solicitud directamente; copia solo los campos esperados, o usa una librería que bloquee explícitamente las claves "__proto__" y "constructor" (o una versión reciente de lodash con esa protección).',
            }),
          );
        }
      },
    });

    return hallazgos;
  }
}
