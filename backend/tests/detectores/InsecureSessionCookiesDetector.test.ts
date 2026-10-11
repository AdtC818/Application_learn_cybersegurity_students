import { describe, expect, it } from 'vitest';
import { InsecureSessionCookiesDetector } from '../../src/domain/detectores/InsecureSessionCookiesDetector';
import { parsearFragmento } from '../ayudaAst';

describe('InsecureSessionCookiesDetector', () => {
  const detector = new InsecureSessionCookiesDetector();

  it('detecta secure: false en la configuración de la cookie de sesión', () => {
    const codigo = `
      app.use(session({
        secret: process.env.SESSION_SECRET,
        cookie: { secure: false, httpOnly: true }
      }));
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos.some((h) => h.tipo === 'INSECURE_SESSION_COOKIES')).toBe(true);
  });

  it('detecta httpOnly: false', () => {
    const codigo = `const opciones = { secure: true, httpOnly: false };`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada cuando ambas banderas están en true', () => {
    const codigo = `const opciones = { secure: true, httpOnly: true };`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
