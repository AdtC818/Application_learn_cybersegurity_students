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

const METODOS_SISTEMA_ARCHIVOS = new Set([
  'readFile',
  'readFileSync',
  'writeFile',
  'writeFileSync',
  'createReadStream',
  'createWriteStream',
  'unlink',
  'unlinkSync',
]);

/** True for `req.params.x`, `req.query.x` or `req.body.x` — a value a client fully controls. */
function referenciaEntradaDeUsuario(nodo: Node): boolean {
  if (t.isMemberExpression(nodo)) {
    if (
      t.isMemberExpression(nodo.object) &&
      t.isIdentifier(nodo.object.object) &&
      nodo.object.object.name === 'req'
    ) {
      return true;
    }
    return referenciaEntradaDeUsuario(nodo.object);
  }
  return false;
}

/** True if the node is built dynamically and involves user-controlled input. */
function esRutaInsegura(nodo: Node): boolean {
  if (referenciaEntradaDeUsuario(nodo)) return true;
  if (contieneInterpolacionDinamica(nodo)) {
    if (t.isTemplateLiteral(nodo)) return nodo.expressions.some((e) => referenciaEntradaDeUsuario(e as Node));
    if (t.isBinaryExpression(nodo)) {
      return referenciaEntradaDeUsuario(nodo.left) || referenciaEntradaDeUsuario(nodo.right);
    }
  }
  return false;
}

/**
 * PathTraversalDetector
 *
 * Flags filesystem calls (fs.readFile, fs.writeFileSync, etc.) whose path
 * argument is built directly from request input (req.params/query/body),
 * with no visible sanitization such as `path.basename()` or an allowlist
 * check — the classic `../../etc/passwd` traversal vector.
 */
export class PathTraversalDetector implements DetectorVulnerabilidad {
  readonly tipo = 'PATH_TRAVERSAL' as const;
  readonly nombre = 'Path Traversal (recorrido de directorios)';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) return;
        if (!METODOS_SISTEMA_ARCHIVOS.has(callee.property.name)) return;

        const primerArgumento = args[0] as Node | undefined;
        if (primerArgumento && esRutaInsegura(primerArgumento)) {
          const linea = obtenerLinea(path.node);
          hallazgos.push(
            new Hallazgo({
              tipo: 'PATH_TRAVERSAL',
              severidad: 'ALTA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion: `La ruta pasada a fs.${callee.property.name}() se construye a partir de datos de la solicitud (req.params/query/body) sin verificarla. Un atacante puede usar secuencias como "../../" para salir de la carpeta esperada y leer o escribir archivos arbitrarios del servidor.`,
              recomendacion:
                'Valida el nombre recibido contra una lista de archivos permitidos, o normaliza la ruta con path.join()/path.basename() y verifica que el resultado siga dentro del directorio base esperado antes de usarla.',
            }),
          );
        }
      },
    });

    return hallazgos;
  }
}
