import { describe, expect, it } from 'vitest';
import { HardcodedSecretsDetector } from '../../src/domain/detectores/HardcodedSecretsDetector';
import { parsearFragmento } from '../ayudaAst';

describe('HardcodedSecretsDetector', () => {
  const detector = new HardcodedSecretsDetector();

  it('detecta una contraseña escrita directamente en el código', () => {
    const codigo = `const dbPassword = "SuperSecreta123!";`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('HARDCODED_SECRETS');
  });

  it('detecta una apiKey dentro de un objeto de configuración', () => {
    const codigo = `
      const config = {
        apiKey: "sk-live-abcdef1234567890"
      };
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada cuando el secreto viene de una variable de entorno', () => {
    const codigo = `const dbPassword = process.env.DB_PASSWORD;`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });

  it('no reporta nada para valores placeholder obvios', () => {
    const codigo = `const apiKey = "changeme";`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
