import { describe, expect, it } from 'vitest';
import { PrototypePollutionDetector } from '../../src/domain/detectores/PrototypePollutionDetector';
import { parsearFragmento } from '../ayudaAst';

describe('PrototypePollutionDetector', () => {
  const detector = new PrototypePollutionDetector();

  it('detecta _.merge fusionando req.body en un objeto existente', () => {
    const codigo = `
      app.post('/perfil', (req, res) => {
        _.merge(perfilActual, req.body);
      });
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('PROTOTYPE_POLLUTION');
  });

  it('no reporta nada cuando se fusionan objetos literales sin entrada externa', () => {
    const codigo = `const config = Object.assign({}, valoresPorDefecto, { modo: 'oscuro' });`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
