import type { File as BabelFile } from '@babel/types';
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

/** Method names commonly used by SQL drivers/ORMs (mysql2, pg, sqlite3, knex...) to run raw queries. */
const METODOS_CONSULTA = new Set(['query', 'execute', 'raw']);

/**
 * SqlInjectionDetector
 *
 * Flags calls like `db.query('SELECT * FROM users WHERE id = ' + id)` or
 * `` db.query(`SELECT * FROM users WHERE id = ${id}`) `` — i.e. a query
 * method whose first argument builds a string by concatenating or
 * interpolating a non-literal value, instead of using a parameterized
 * placeholder ("?", "$1", etc.) with a separate values array.
 */
export class SqlInjectionDetector implements DetectorVulnerabilidad {
  readonly tipo = 'SQL_INJECTION' as const;
  readonly nombre = 'Inyección SQL';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee)) return;
        if (!t.isIdentifier(callee.property)) return;
        if (!METODOS_CONSULTA.has(callee.property.name)) return;

        const primerArgumento = args[0];
        if (!primerArgumento) return;

        if (contieneInterpolacionDinamica(primerArgumento)) {
          const linea = obtenerLinea(path.node);
          hallazgos.push(
            new Hallazgo({
              tipo: 'SQL_INJECTION',
              severidad: 'CRITICA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion:
                'Esta consulta SQL se construye concatenando o interpolando una variable directamente en el texto, en lugar de usar parámetros. Si esa variable proviene de la entrada de un usuario, un atacante puede inyectar SQL arbitrario y leer, modificar o borrar datos de la base de datos.',
              recomendacion:
                'Usa consultas parametrizadas: escribe placeholders ("?" o "$1" según el driver) en el texto de la consulta y pasa los valores reales en un arreglo aparte, nunca insertados directamente en el string.',
            }),
          );
        }
      },
    });

    return hallazgos;
  }
}
