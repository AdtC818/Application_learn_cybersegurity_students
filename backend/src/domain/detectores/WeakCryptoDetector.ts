import type { File as BabelFile } from '@babel/types';
import * as t from '@babel/types';
import { DetectorVulnerabilidad } from '../ports/DetectorVulnerabilidad';
import { Hallazgo } from '../entities/Hallazgo';
import { traverse, obtenerFragmentoLinea, obtenerLinea, obtenerColumna } from './utilidadesAst';

const ALGORITMOS_DEBILES = new Set(['md5', 'sha1', 'des', 'rc4']);
const METODOS_CRYPTO_VIGILADOS = new Set(['createHash', 'createCipher', 'createDecipher']);

/**
 * WeakCryptoDetector
 *
 * Flags two things from Node's built-in `crypto` module:
 *  1. `createHash('md5' | 'sha1')` and similarly weak algorithms, which are
 *     broken for collision resistance and unsafe for passwords/signatures.
 *  2. `createCipher()` / `createDecipher()` (any algorithm), which are
 *     deprecated because they derive the key and IV insecurely — regardless
 *     of which cipher name is passed.
 */
export class WeakCryptoDetector implements DetectorVulnerabilidad {
  readonly tipo = 'WEAK_CRYPTO' as const;
  readonly nombre = 'Uso de criptografía débil';

  detectar(ast: BabelFile, codigoFuente: string): Hallazgo[] {
    const hallazgos: Hallazgo[] = [];

    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) return;
        const metodo = callee.property.name;
        if (!METODOS_CRYPTO_VIGILADOS.has(metodo)) return;

        const primerArgumento = args[0];
        const algoritmo = t.isStringLiteral(primerArgumento)
          ? primerArgumento.value.toLowerCase()
          : undefined;
        const linea = obtenerLinea(path.node);

        if (algoritmo && ALGORITMOS_DEBILES.has(algoritmo)) {
          hallazgos.push(
            new Hallazgo({
              tipo: 'WEAK_CRYPTO',
              severidad: 'MEDIA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion: `Se usa el algoritmo "${algoritmo}" con ${metodo}(), considerado criptográficamente débil (vulnerable a colisiones o a fuerza bruta) y no apto para contraseñas, firmas ni datos sensibles.`,
              recomendacion:
                'Usa SHA-256 o SHA-3 para hashing general, y bcrypt, scrypt o Argon2 específicamente para contraseñas (nunca un hash genérico de un solo paso).',
            }),
          );
        } else if (metodo === 'createCipher' || metodo === 'createDecipher') {
          hallazgos.push(
            new Hallazgo({
              tipo: 'WEAK_CRYPTO',
              severidad: 'MEDIA',
              linea,
              columna: obtenerColumna(path.node),
              codigoFragmento: obtenerFragmentoLinea(codigoFuente, linea),
              explicacion: `"${metodo}()" está obsoleto en Node.js: deriva la clave y el vector de inicialización (IV) de forma insegura y predecible a partir de una sola contraseña.`,
              recomendacion:
                'Usa crypto.createCipheriv() / crypto.createDecipheriv() con una clave e IV generados aleatoriamente mediante crypto.randomBytes().',
            }),
          );
        }
      },
    });

    return hallazgos;
  }
}
