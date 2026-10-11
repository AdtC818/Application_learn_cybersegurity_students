import { describe, expect, it } from 'vitest';
import { XssDetector } from '../../src/domain/detectores/XssDetector';
import { parsearFragmento } from '../ayudaAst';

describe('XssDetector', () => {
  const detector = new XssDetector();

  it('detecta asignación dinámica a innerHTML', () => {
    const codigo = `
      function mostrarComentario(texto) {
        document.getElementById('caja').innerHTML = texto;
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0].tipo).toBe('XSS');
  });

  it('detecta document.write con contenido dinámico', () => {
    const codigo = `
      function render(nombre) {
        document.write('<h1>Hola ' + nombre + '</h1>');
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(1);
  });

  it('no reporta nada cuando el valor asignado es un texto fijo', () => {
    const codigo = `
      function mostrarMensaje() {
        document.getElementById('caja').innerHTML = '<p>Mensaje fijo</p>';
      }
    `;
    const hallazgos = detector.detectar(parsearFragmento(codigo), codigo);
    expect(hallazgos).toHaveLength(0);
  });
});
