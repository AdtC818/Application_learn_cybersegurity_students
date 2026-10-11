import { describe, expect, it } from 'vitest';
import { SqlInjectionDetector } from '../../src/domain/detectores/SqlInjectionDetector';
import { parsearFragmento } from '../ayudaAst';

describe('SqlInjectionDetector', () => {
  const detector = new SqlInjectionDetector();

  it('detecta concatenación de una variable en una consulta SQL', () => {
    const codigo = `
      function buscarUsuario(id) {
        return db.query('SELECT * FROM users WHERE id = ' + id);
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('SQL_INJECTION');
  });

  it('detecta interpolación en un template literal dentro de una consulta', () => {
    const codigo = `
      function buscarUsuario(id) {
        return db.query(\`SELECT * FROM users WHERE id = \${id}\`);
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada cuando se usa una consulta parametrizada', () => {
    const codigo = `
      function buscarUsuario(id) {
        return db.query('SELECT * FROM users WHERE id = ?', [id]);
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
