import type { File as BabelFile } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

const BANDERAS_VIGILADAS: Record<string, string> = {
  secure: 'secure',
  httpOnly: 'httpOnly',
};

/**
 * InsecureSessionCookiesDetector
 *
 * Flags session/cookie configuration objects (express-session,
 * cookie-session, res.cookie options, etc.) that explicitly set
 * `secure: false` or `httpOnly: false`. Both flags defaulting to false is
 * common and not flagged here (too many false positives); but an explicit
 * `false` is a clear, deliberate signal that the protection was turned off.
 */
export class InsecureSessionCookiesDetector implements DetectorVulnerabilidad {
  readonly tipo = 'INSECURE_SESSION_COOKIES' as const;
  readonly nombre = 'Cookies de sesión inseguras';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      ObjectProperty(path) {
        const { key, value } = path.node;
        if (!t.isIdentifier(key)) return;
        const bandera = BANDERAS_VIGILADAS[key.name];
        if (!bandera) return;
        if (!t.isBooleanLiteral(value) || value.value !== false) return;

        const linea = obtenerLinea(path.node);
        hallazgos.push(
          new Hallazgo({
            tipo: 'INSECURE_SESSION_COOKIES',
            severidad: bandera === 'secure' ? 'ALTA' : 'MEDIA',
            linea,
            columna: obtenerColumna(path.node),
            codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
            explicacion:
              bandera === 'secure'
                ? 'La cookie de sesión se configura con "secure: false", por lo que el navegador la enviará incluso por HTTP sin cifrar, permitiendo que se intercepte en una red insegura.'
                : 'La cookie de sesión se configura con "httpOnly: false", lo que permite que JavaScript en el navegador la lea (document.cookie). Si existe una vulnerabilidad XSS, el atacante podría robar la cookie de sesión.',
            recomendacion:
              bandera === 'secure'
                ? 'Activa "secure: true" en producción (requiere HTTPS) para que la cookie nunca se envíe sin cifrar.'
                : 'Activa "httpOnly: true" para que la cookie solo sea accesible desde el servidor, nunca desde JavaScript del navegador.',
          }),
        );
      },
    });

    return hallazgos;
  }
}
