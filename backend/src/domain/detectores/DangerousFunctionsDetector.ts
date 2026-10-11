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

const METODOS_EJECUCION_SHELL = new Set(['exec', 'execSync', 'spawn']);

/**
 * DangerousFunctionsDetector
 *
 * Flags calls that execute arbitrary code or shell commands:
 *  - `eval(...)` — always flagged, there is no safe use of eval on
 *    anything that isn't a hardcoded constant.
 *  - `new Function(...)` — same risk as eval, builds a function from a string.
 *  - `child_process.exec/execSync/spawn(...)` with a command string built
 *    dynamically (concatenation/interpolation) — classic OS command
 *    injection.
 */
export class DangerousFunctionsDetector implements DetectorVulnerabilidad {
  readonly tipo = 'DANGEROUS_FUNCTIONS' as const;
  readonly nombre = 'Uso de funciones peligrosas (eval / exec)';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    const reportar = (nodo: Node, explicacion: string, recomendacion: string) => {
      const linea = obtenerLinea(nodo);
      hallazgos.push(
        new Hallazgo({
          tipo: 'DANGEROUS_FUNCTIONS',
          severidad: 'CRITICA',
          linea,
          columna: obtenerColumna(nodo),
          codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
          explicacion,
          recomendacion,
        }),
      );
    };

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;

        if (t.isIdentifier(callee) && callee.name === 'eval') {
          reportar(
            path.node,
            'eval() ejecuta como código cualquier texto que reciba. Si ese texto incluye, directa o indirectamente, algo que un usuario pueda influenciar, un atacante puede ejecutar código arbitrario en el servidor.',
            'Evita eval() por completo; casi siempre existe una alternativa específica (JSON.parse para datos, una función con nombre en vez de código generado dinámicamente, etc.).',
          );
          return;
        }

        if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
          const metodo = callee.property.name;
          if (METODOS_EJECUCION_SHELL.has(metodo)) {
            const primerArgumento = args[0] as Node | undefined;
            if (primerArgumento && (contieneInterpolacionDinamica(primerArgumento) || t.isIdentifier(primerArgumento))) {
              reportar(
                path.node,
                `child_process.${metodo}() ejecuta un comando de shell construido dinámicamente. Si parte de ese texto proviene de la entrada de un usuario, un atacante puede inyectar comandos adicionales (por ejemplo con ";" o "&&") y ejecutarlos en el servidor.`,
                'Evita construir comandos de shell a partir de entrada externa. Si necesitas ejecutar un binario con argumentos, usa spawn() pasando los argumentos como un arreglo aparte (sin shell: true) en vez de concatenar un único string.',
              );
            }
          }
        }
      },
      NewExpression(path) {
        const { callee } = path.node;
        if (t.isIdentifier(callee) && callee.name === 'Function') {
          reportar(
            path.node,
            'new Function(...) compila una cadena de texto en una función, igual que eval(). Tiene el mismo riesgo de ejecución de código arbitrario si el texto no es completamente estático.',
            'Evita construir funciones a partir de texto dinámico; escribe la lógica como una función normal del lenguaje.',
          );
        }
      },
    });

    return hallazgos;
  }
}
