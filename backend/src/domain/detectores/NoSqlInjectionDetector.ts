import type { File as BabelFile } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

const METODOS_CONSULTA_MONGO = new Set([
  'find',
  'findOne',
  'update',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
]);

/** True for `req.body`, `req.query` or `req.params` (the whole object, unfiltered). */
function esObjetoDeSolicitudSinFiltrar(nodo: t.Node): boolean {
  return (
    t.isMemberExpression(nodo) &&
    t.isIdentifier(nodo.object) &&
    nodo.object.name === 'req' &&
    t.isIdentifier(nodo.property) &&
    ['body', 'query', 'params'].includes(nodo.property.name)
  );
}

/**
 * NoSqlInjectionDetector
 *
 * Flags calls like `Usuario.find(req.body)` — passing a whole request
 * object straight into a MongoDB-style query method. Because MongoDB
 * filters are plain objects, an attacker can inject operators such as
 * `{ "$gt": "" }` or `{ "$where": "..." }` through any field, bypassing
 * authentication or extracting unintended data.
 */
export class NoSqlInjectionDetector implements DetectorVulnerabilidad {
  readonly tipo = 'NOSQL_INJECTION' as const;
  readonly nombre = 'Inyección NoSQL';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) return;
        if (!METODOS_CONSULTA_MONGO.has(callee.property.name)) return;

        const argumentoSospechoso = args.find((a) => esObjetoDeSolicitudSinFiltrar(a as t.Node));
        if (argumentoSospechoso) {
          const linea = obtenerLinea(path.node);
          hallazgos.push(
            new Hallazgo({
              tipo: 'NOSQL_INJECTION',
              severidad: 'CRITICA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion:
                'Se pasa un objeto de la solicitud (req.body/req.query/req.params) directamente como filtro de una consulta a la base de datos. Como los filtros de MongoDB son objetos, un atacante puede inyectar operadores como "$gt", "$ne" o "$where" en cualquier campo para alterar la lógica de la consulta.',
              recomendacion:
                'Construye el filtro de forma explícita leyendo solo los campos esperados (por ejemplo `{ email: req.body.email }`) y valida sus tipos (con Zod, Joi, etc.) antes de usarlos en la consulta.',
            }),
          );
        }
      },
    });

    return hallazgos;
  }
}
