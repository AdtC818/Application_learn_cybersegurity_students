import { RespuestaEncuesta } from '../entities/RespuestaEncuesta';

/**
 * RepositorioEncuesta (Repository port)
 *
 * Abstracts persistence of survey/perception responses, used to support
 * the thesis's acceptance-survey specific objective. Kept separate from
 * RepositorioAnalisis because the two are unrelated aggregates — a survey
 * response is not owned by or nested under an analysis.
 */
export interface RepositorioEncuesta {
  guardar(respuesta: RespuestaEncuesta): Promise<RespuestaEncuesta>;
  listarTodas(): Promise<RespuestaEncuesta[]>;
}
