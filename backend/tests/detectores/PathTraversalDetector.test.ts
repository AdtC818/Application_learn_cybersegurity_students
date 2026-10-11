import { describe, expect, it } from 'vitest';
import { PathTraversalDetector } from '../../src/domain/detectores/PathTraversalDetector';
import { parsearFragmento } from '../ayudaAst';

describe('PathTraversalDetector', () => {
  const detector = new PathTraversalDetector();

  it('detecta una ruta construida a partir de req.params', () => {
    const codigo = `
      app.get('/files/:nombre', (req, res) => {
        fs.readFile(req.params.nombre, (err, data) => res.send(data));
      });
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('PATH_TRAVERSAL');
  });

  it('no reporta nada para una ruta fija', () => {
    const codigo = `fs.readFile('./datos/config.json', (err, data) => {});`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
