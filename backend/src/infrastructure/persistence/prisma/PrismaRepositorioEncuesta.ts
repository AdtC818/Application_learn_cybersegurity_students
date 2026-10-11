import type { PrismaClient } from '../../../../generated/prisma-client';
import { RepositorioEncuesta } from '../../../domain/ports/RepositorioEncuesta';
import { RespuestaEncuesta } from '../../../domain/entities/RespuestaEncuesta';

export class PrismaRepositorioEncuesta implements RepositorioEncuesta {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(respuesta: RespuestaEncuesta): Promise<RespuestaEncuesta> {
    const registro = await this.prisma.respuestaEncuesta.create({
      data: {
        utilidadPercibida: respuesta.utilidadPercibida,
        claridadExplicaciones: respuesta.claridadExplicaciones,
        facilidadUso: respuesta.facilidadUso,
        comentarios: respuesta.comentarios,
      },
    });
    return new RespuestaEncuesta({ ...registro, comentarios: registro.comentarios ?? undefined });
  }

  async listarTodas(): Promise<RespuestaEncuesta[]> {
    const registros = await this.prisma.respuestaEncuesta.findMany({ orderBy: { creadoEn: 'desc' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return registros.map(
      (r: any) => new RespuestaEncuesta({ ...r, comentarios: r.comentarios ?? undefined }),
    );
  }
}
