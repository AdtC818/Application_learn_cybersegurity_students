import { describe, expect, it } from 'vitest';
import { AnalizarCodigo } from '../../src/application/casos-uso/AnalizarCodigo';
import { RegistroDetectores } from '../../src/application/servicios/RegistroDetectores';
import { BabelParserAdapter } from '../../src/infrastructure/parsers/BabelParserAdapter';
import { RepositorioAnalisis } from '../../src/domain/ports/RepositorioAnalisis';
import { Analisis } from '../../src/domain/entities/Analisis';

/** In-memory fake so this test never touches a real database. */
class RepositorioAnalisisFalso implements RepositorioAnalisis {
  guardados: Analisis[] = [];

  async guardar(analisis: Analisis): Promise<Analisis> {
    this.guardados.push(analisis);
    return analisis;
  }
  async buscarPorId(): Promise<Analisis | null> {
    return null;
  }
  async listarRecientes(): Promise<Analisis[]> {
    return this.guardados;
  }
}

describe('AnalizarCodigo (caso de uso, integración de todos los detectores)', () => {
  function construir() {
    const parser = new BabelParserAdapter();
    const detectores = RegistroDetectores.obtenerInstancia().obtenerTodos();
    const repositorio = new RepositorioAnalisisFalso();
    const casoUso = new AnalizarCodigo(parser, detectores, repositorio);
    return { casoUso, repositorio };
  }

  it('ejecuta los 12 detectores y devuelve hallazgos ordenados por línea', async () => {
    const { casoUso } = construir();
    const codigo = `
      function manejador(req, res) {
        const password = "SuperSecreta123!";
        db.query('SELECT * FROM users WHERE id = ' + req.query.id);
        eval(req.query.codigo);
      }
    `;

    const analisis = await casoUso.ejecutar({ codigoFuente: codigo });

    expect(analisis.totalHallazgos).toBeGreaterThanOrEqual(3);
    const lineas = analisis.hallazgos.map((h) => h.linea);
    expect(lineas).toEqual([...lineas].sort((a, b) => a - b));
  });

  it('no reporta nada para código sin problemas conocidos', async () => {
    const { casoUso } = construir();
    const codigo = `
      function sumar(a, b) {
        return a + b;
      }
    `;
    const analisis = await casoUso.ejecutar({ codigoFuente: codigo });
    expect(analisis.totalHallazgos).toBe(0);
  });

  it('persiste el análisis cuando guardarEnHistorial es true', async () => {
    const { casoUso, repositorio } = construir();
    await casoUso.ejecutar({ codigoFuente: 'const x = 1;', guardarEnHistorial: true });
    expect(repositorio.guardados).toHaveLength(1);
  });

  it('propaga un error de parseo para código con sintaxis inválida', async () => {
    const { casoUso } = construir();
    await expect(casoUso.ejecutar({ codigoFuente: 'function ( { ' })).rejects.toThrow();
  });
});
