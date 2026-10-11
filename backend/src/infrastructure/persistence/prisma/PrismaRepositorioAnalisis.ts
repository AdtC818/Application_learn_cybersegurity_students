import type { PrismaClient } from '../../../../generated/prisma-client';
import { RepositorioAnalisis } from '../../../domain/ports/RepositorioAnalisis';
import { Analisis } from '../../../domain/entities/Analisis';
import { Hallazgo, HallazgoProps } from '../../../domain/entities/Hallazgo';

/**
 * PrismaRepositorioAnalisis
 *
 * Implements the RepositorioAnalisis port on top of Prisma/PostgreSQL.
 * Findings are stored as a JSON column and rehydrated into real Hallazgo
 * instances on the way out, so nothing outside this file ever has to know
 * the storage representation differs from the domain entity.
 */
export class PrismaRepositorioAnalisis implements RepositorioAnalisis {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(analisis: Analisis): Promise<Analisis> {
    const registro = await this.prisma.analisis.create({
      data: {
        nombreArchivo: analisis.nombreArchivo,
        codigoFuente: analisis.codigoFuente,
        lenguaje: analisis.lenguaje,
        hallazgos: analisis.hallazgos.map((h) => h.toJSON()),
        totalHallazgos: analisis.totalHallazgos,
      },
    });
    return this.aEntidad(registro);
  }

  async buscarPorId(id: string): Promise<Analisis | null> {
    const registro = await this.prisma.analisis.findUnique({ where: { id } });
    return registro ? this.aEntidad(registro) : null;
  }

  async listarRecientes(limite = 20): Promise<Analisis[]> {
    const registros = await this.prisma.analisis.findMany({
      orderBy: { creadoEn: 'desc' },
      take: limite,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return registros.map((r: any) => this.aEntidad(r));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private aEntidad(registro: any): Analisis {
    const hallazgos = (registro.hallazgos as HallazgoProps[]).map((h) => new Hallazgo(h));
    return new Analisis({
      id: registro.id,
      nombreArchivo: registro.nombreArchivo ?? undefined,
      codigoFuente: registro.codigoFuente,
      lenguaje: registro.lenguaje,
      hallazgos,
      creadoEn: registro.creadoEn,
    });
  }
}
