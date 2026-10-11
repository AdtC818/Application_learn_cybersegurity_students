import type { File as BabelFile, Node } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

const METODOS_LOG = new Set(['log', 'info', 'warn', 'error', 'debug']);

const PATRON_DATO_SENSIBLE =
  /password|passwd|pwd|secret|token|api[_-]?key|credit[_-]?card|tarjeta|ssn|cedula|cvv/i;

/** Returns the identifier-like name of a node, if it has one worth checking. */
function obtenerNombreVigilable(nodo: Node): string | undefined {
  if (t.isIdentifier(nodo)) return nodo.name;
  if (t.isMemberExpression(nodo) && t.isIdentifier(nodo.property)) return nodo.property.name;
  return undefined;
}

/**
 * SensitiveDataLoggingDetector
 *
 * Flags `console.log/info/warn/error/debug(...)` calls whose arguments
 * include a variable or property whose *name* suggests sensitive data
 * (password, token, creditCard, etc.). Logs are often shipped to
 * third-party services or left in plaintext files, so sensitive values
 * ending up there is a real exposure risk even without any other bug.
 */
export class SensitiveDataLoggingDetector implements DetectorVulnerabilidad {
  readonly tipo = 'SENSITIVE_DATA_LOGGING' as const;
  readonly nombre = 'Registro (logging) de datos sensibles';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.object) || !t.isIdentifier(callee.property)) {
          return;
        }
        if (!['console', 'logger'].includes(callee.object.name)) return;
        if (!METODOS_LOG.has(callee.property.name)) return;

        for (const argumento of args) {
          const nombre = obtenerNombreVigilable(argumento as Node);
          if (nombre && PATRON_DATO_SENSIBLE.test(nombre)) {
            const linea = obtenerLinea(path.node);
            hallazgos.push(
              new Hallazgo({
                tipo: 'SENSITIVE_DATA_LOGGING',
                severidad: 'MEDIA',
                linea,
                columna: obtenerColumna(path.node),
                codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
                explicacion: `Se está registrando en el log un valor llamado "${nombre}", cuyo nombre sugiere un dato sensible. Los logs suelen guardarse en texto plano, enviarse a servicios externos de monitoreo, o quedar accesibles a más personas de las que deberían ver ese dato.`,
                recomendacion:
                  'Evita registrar credenciales o datos sensibles directamente; si necesitas depurar, enmascara el valor (por ejemplo, muestra solo los últimos 4 caracteres) o quita el log antes de pasar a producción.',
              }),
            );
            break; // one finding per log call is enough
          }
        }
      },
    });

    return hallazgos;
  }
}
