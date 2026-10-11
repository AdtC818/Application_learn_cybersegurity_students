import { describe, expect, it } from 'vitest';
import { DangerousFunctionsDetector } from '../../src/domain/detectores/DangerousFunctionsDetector';
import { parsearFragmento } from '../ayudaAst';

describe('DangerousFunctionsDetector', () => {
  const detector = new DangerousFunctionsDetector();

  it('detecta una llamada a eval()', () => {
    const codigo = `eval(codigoDelUsuario);`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('DANGEROUS_FUNCTIONS');
  });

  it('detecta exec() con un comando construido dinámicamente', () => {
    const codigo = `
      app.get('/ping', (req, res) => {
        child_process.exec('ping -c 1 ' + req.query.host);
      });
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada para un comando fijo', () => {
    const codigo = `child_process.execSync('ls -la');`;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
