import type { File as BabelFile, Node } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

const PATRON_NOMBRE_SECRETO =
  /secret|password|passwd|pwd|token|api[_-]?key|access[_-]?key|private[_-]?key|credential/i;

function esNombrePotencialSecreto(nombre: string): boolean {
  return PATRON_NOMBRE_SECRETO.test(nombre);
}

/** Filters out obvious placeholders so the detector doesn't flag example/dummy values. */
function pareceValorPlaceholder(valor: string): boolean {
  if (valor.trim().length < 8) return true;
  return /^(x+|todo|changeme|your[_-]?key([_-]?here)?|example|placeholder|<.*>|\.\.\.)$/i.test(
    valor.trim(),
  );
}

/**
 * HardcodedSecretsDetector
 *
 * Flags string literals assigned to a variable, object property, or object
 * member whose name looks like it holds a credential (password, token,
 * apiKey, secret, etc.). It intentionally does NOT flag values read from
 * `process.env`, since that is the recommended, safe pattern.
 */
export class HardcodedSecretsDetector implements DetectorVulnerabilidad {
  readonly tipo = 'HARDCODED_SECRETS' as const;
  readonly nombre = 'Credenciales o secretos codificados en el código';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    const evaluar = (nombre: string | undefined, valorNodo: Node, nodoReporte: Node) => {
      if (!nombre || !esNombrePotencialSecreto(nombre)) return;
      if (!t.isStringLiteral(valorNodo)) return;
      if (pareceValorPlaceholder(valorNodo.value)) return;

      const linea = obtenerLinea(nodoReporte);
      hallazgos.push(
        new Hallazgo({
          tipo: 'HARDCODED_SECRETS',
          severidad: 'ALTA',
          linea,
          columna: obtenerColumna(nodoReporte),
          codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
          explicacion: `La variable "${nombre}" parece contener una credencial o secreto escrito directamente en el código fuente. Cualquiera con acceso al repositorio (incluido su historial de Git) puede verlo, aunque luego se borre.`,
          recomendacion:
            'Mueve el valor a una variable de entorno (process.env.NOMBRE) cargada desde un archivo .env que esté en .gitignore, y nunca lo escribas literalmente en el código.',
        }),
      );
    };

    traverse(ast, {
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id) && path.node.init) {
          evaluar(path.node.id.name, path.node.init, path.node);
        }
      },
      ObjectProperty(path) {
        const nombre = t.isIdentifier(path.node.key)
          ? path.node.key.name
          : t.isStringLiteral(path.node.key)
            ? path.node.key.value
            : undefined;
        evaluar(nombre, path.node.value as Node, path.node);
      },
      AssignmentExpression(path) {
        if (t.isMemberExpression(path.node.left) && t.isIdentifier(path.node.left.property)) {
          evaluar(path.node.left.property.name, path.node.right, path.node);
        }
      },
    });

    return hallazgos;
  }
}
