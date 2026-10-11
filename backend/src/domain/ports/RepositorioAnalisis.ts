import { Analisis } from '../entities/Analisis';

/**
 * RepositorioAnalisis (Repository port)
 *
 * Abstracts persistence of analysis history. The use case
 * (AnalizarCodigo) depends only on this interface; the concrete
 * implementation (a Prisma-backed adapter) lives in
 * infrastructure/persistence and can be swapped (e.g. for an in-memory
 * fake in tests) without any change above this line.
 */
export interface RepositorioAnalisis {
  guardar(analisis: Analisis): Promise<Analisis>;
  buscarPorId(id: string): Promise<Analisis | null>;
  listarRecientes(limite?: number): Promise<Analisis[]>;
}
