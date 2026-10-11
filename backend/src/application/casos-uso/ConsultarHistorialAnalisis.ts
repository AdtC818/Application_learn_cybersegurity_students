import { RepositorioAnalisis } from '../../domain/ports/RepositorioAnalisis';
import { Analisis } from '../../domain/entities/Analisis';

/**
 * ConsultarHistorialAnalisis (use case)
 *
 * Reads back previously saved analyses, so a student can revisit code
 * they analyzed before without re-pasting it.
 */
export class ConsultarHistorialAnalisis {
  constructor(private readonly repositorioAnalisis: RepositorioAnalisis) {}

  async ejecutar(limite = 20): Promise<Analisis[]> {
    return this.repositorioAnalisis.listarRecientes(limite);
  }

  async ejecutarPorId(id: string): Promise<Analisis | null> {
    return this.repositorioAnalisis.buscarPorId(id);
  }
}
