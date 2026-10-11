import { describe, expect, it } from 'vitest';
import { SensitiveDataLoggingDetector } from '../../src/domain/detectores/SensitiveDataLoggingDetector';
import { parsearFragmento } from '../ayudaAst';

describe('SensitiveDataLoggingDetector', () => {
  const detector = new SensitiveDataLoggingDetector();

  it('detecta console.log imprimiendo una contraseña', () => {
    const codigo = `
      function iniciarSesion(password) {
        console.log('Intento de login con password:', password);
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('SENSITIVE_DATA_LOGGING');
  });

  it('no reporta nada para un log sin datos sensibles', () => {
    const codigo = `console.log('Usuario autenticado correctamente');`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
