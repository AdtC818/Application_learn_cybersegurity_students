import { RepositorioEncuesta } from '../../domain/ports/RepositorioEncuesta';
import { RespuestaEncuesta, RespuestaEncuestaProps } from '../../domain/entities/RespuestaEncuesta';

/**
 * RegistrarRespuestaEncuesta (use case)
 *
 * Persists one response to the perception/acceptance survey (how useful,
 * clear and easy to use students found the tool) — supports the thesis's
 * survey-based specific objective, without measuring learning outcomes.
 */
export class RegistrarRespuestaEncuesta {
  constructor(private readonly repositorioEncuesta: RepositorioEncuesta) {}

  async ejecutar(datos: RespuestaEncuestaProps): Promise<RespuestaEncuesta> {
    const respuesta = new RespuestaEncuesta(datos);
    return this.repositorioEncuesta.guardar(respuesta);
  }

  async listarTodas(): Promise<RespuestaEncuesta[]> {
    return this.repositorioEncuesta.listarTodas();
  }
}
