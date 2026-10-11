import { describe, expect, it } from 'vitest';
import { WeakCryptoDetector } from '../../src/domain/detectores/WeakCryptoDetector';
import { parsearFragmento } from '../ayudaAst';

describe('WeakCryptoDetector', () => {
  const detector = new WeakCryptoDetector();

  it('detecta el uso de MD5 para hashing', () => {
    const codigo = `const hash = crypto.createHash('md5').update(clave).digest('hex');`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('WEAK_CRYPTO');
  });

  it('detecta el uso de createCipher (obsoleto) aunque el algoritmo no esté en la lista débil', () => {
    const codigo = `const cipher = crypto.createCipher('aes-256-cbc', clave);`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada cuando se usa SHA-256', () => {
    const codigo = `const hash = crypto.createHash('sha256').update(clave).digest('hex');`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
