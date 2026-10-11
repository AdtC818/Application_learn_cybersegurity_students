import { describe, expect, it } from 'vitest';
import { SsrfDetector } from '../../src/domain/detectores/SsrfDetector';
import { parsearFragmento } from '../ayudaAst';

describe('SsrfDetector', () => {
  const detector = new SsrfDetector();

  it('detecta un fetch hacia una URL controlada por el usuario', () => {
    const codigo = `
      app.get('/proxy', async (req, res) => {
        const respuesta = await fetch(req.query.url);
        res.send(await respuesta.text());
      });
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('SSRF');
  });

  it('no reporta nada para una URL fija en el código', () => {
    const codigo = `
      async function obtenerDatos() {
        const respuesta = await fetch('https://api.miservicio.com/datos');
        return respuesta.json();
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
