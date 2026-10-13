import { describe, expect, it } from 'vitest';
import { CATALOGO, ordenarPorGravedad } from '../contenido/catalogo';
import { LABS } from './indice';

const lineas = (codigo: string) => codigo.split('\n').length;

describe('contenido de los laboratorios', () => {
  it('hay un laboratorio por cada categoría del catálogo', () => {
    for (const c of CATALOGO) {
      expect(LABS[c.tipo], `falta el laboratorio de ${c.tipo}`).toBeDefined();
      expect(LABS[c.tipo]?.tipo).toBe(c.tipo);
    }
    expect(Object.keys(LABS)).toHaveLength(CATALOGO.length);
  });

  for (const c of CATALOGO) {
    describe(c.nombre, () => {
      const lab = LABS[c.tipo]!;

      it('las líneas marcadas y las notas existen en el código', () => {
        const nv = lineas(lab.codigoVulnerable);
        const ns = lineas(lab.codigoSeguro);
        for (const n of [...lab.lineasVulnerables, ...Object.keys(lab.notasVulnerable).map(Number)]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(nv);
        }
        for (const n of [...lab.lineasSeguras, ...Object.keys(lab.notasSeguro).map(Number)]) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(ns);
        }
        expect(lab.lineasVulnerables.length).toBeGreaterThan(0);
      });

      it('el reto tiene tres opciones y una correcta válida', () => {
        expect(lab.reto.opciones).toHaveLength(3);
        expect(lab.reto.correcta).toBeGreaterThanOrEqual(0);
        expect(lab.reto.correcta).toBeLessThan(3);
        for (const o of lab.reto.opciones) {
          expect(o.codigo.length).toBeGreaterThan(0);
          expect(o.comentario.length).toBeGreaterThan(0);
        }
      });

      it('cuenta la historia en tres pasos y deja una regla', () => {
        expect(lab.flujo).toHaveLength(3);
        expect(lab.regla.length).toBeGreaterThan(10);
      });
    });
  }

  it('la respuesta correcta no siempre está en la misma posición', () => {
    const posiciones = new Set(Object.values(LABS).map((l) => l!.reto.correcta));
    expect(posiciones.size).toBeGreaterThan(1);
  });
});

describe('orden de los hallazgos', () => {
  it('pone primero lo más grave y, a igual gravedad, la línea más baja', () => {
    const lista = [
      { id: 'a', severidad: 'MEDIA' as const, linea: 3 },
      { id: 'b', severidad: 'CRITICA' as const, linea: 10 },
      { id: 'c', severidad: 'ALTA' as const, linea: 2 },
      { id: 'd', severidad: 'CRITICA' as const, linea: 4 },
      { id: 'e', severidad: 'BAJA' as const, linea: 1 },
    ];
    expect(ordenarPorGravedad(lista).map((h) => h.id)).toEqual(['d', 'b', 'c', 'a', 'e']);
  });

  it('no modifica la lista original', () => {
    const lista = [
      { severidad: 'BAJA' as const, linea: 1 },
      { severidad: 'CRITICA' as const, linea: 2 },
    ];
    ordenarPorGravedad(lista);
    expect(lista[0].severidad).toBe('BAJA');
  });
});
