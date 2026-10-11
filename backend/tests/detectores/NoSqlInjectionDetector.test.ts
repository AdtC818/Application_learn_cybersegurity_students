import { describe, expect, it } from 'vitest';
import { NoSqlInjectionDetector } from '../../src/domain/detectores/NoSqlInjectionDetector';
import { parsearFragmento } from '../ayudaAst';

describe('NoSqlInjectionDetector', () => {
  const detector = new NoSqlInjectionDetector();

  it('detecta pasar req.body directamente como filtro de Mongo', () => {
    const codigo = `
      app.post('/login', (req, res) => {
        Usuario.findOne(req.body);
      });
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('NOSQL_INJECTION');
  });

  it('no reporta nada cuando el filtro se construye explícitamente', () => {
    const codigo = `
      app.post('/login', (req, res) => {
        Usuario.findOne({ email: req.body.email });
      });
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
