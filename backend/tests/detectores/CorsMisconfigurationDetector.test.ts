import { describe, expect, it } from 'vitest';
import { CorsMisconfigurationDetector } from '../../src/domain/detectores/CorsMisconfigurationDetector';
import { parsearFragmento } from '../ayudaAst';

describe('CorsMisconfigurationDetector', () => {
  const detector = new CorsMisconfigurationDetector();

  it('detecta Access-Control-Allow-Origin fijado manualmente a *', () => {
    const codigo = `res.setHeader('Access-Control-Allow-Origin', '*');`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('CORS_MISCONFIGURATION');
  });

  it('detecta cors() configurado con origin comodín', () => {
    const codigo = `app.use(cors({ origin: '*' }));`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada cuando el origen es una lista explícita', () => {
    const codigo = `app.use(cors({ origin: 'https://mi-sitio.com' }));`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
