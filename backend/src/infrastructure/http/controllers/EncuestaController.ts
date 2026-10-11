import { Request, Response } from 'express';
import { z } from 'zod';
import { RegistrarRespuestaEncuesta } from '../../../application/casos-uso/RegistrarRespuestaEncuesta';

const escalaLikert = z.number().int().min(1).max(5);

const esquemaRespuesta = z.object({
  utilidadPercibida: escalaLikert,
  claridadExplicaciones: escalaLikert,
  facilidadUso: escalaLikert,
  comentarios: z.string().max(2000).optional(),
});

export class EncuestaController {
  constructor(private readonly casoUsoRegistrarEncuesta: RegistrarRespuestaEncuesta) {}

  registrar = async (req: Request, res: Response): Promise<void> => {
    const resultado = esquemaRespuesta.safeParse(req.body);
    if (!resultado.success) {
      res.status(400).json({ error: 'Datos de entrada inválidos', detalles: resultado.error.flatten() });
      return;
    }

    try {
      const respuesta = await this.casoUsoRegistrarEncuesta.ejecutar(resultado.data);
      res.status(201).json(respuesta.toJSON());
    } catch (error) {
      console.error('Error registrando respuesta de encuesta:', error);
      res.status(500).json({ error: 'Error interno al registrar la respuesta.' });
    }
  };

  listar = async (_req: Request, res: Response): Promise<void> => {
    try {
      const respuestas = await this.casoUsoRegistrarEncuesta.listarTodas();
      res.status(200).json(respuestas.map((r) => r.toJSON()));
    } catch (error) {
      console.error('Error listando respuestas de encuesta:', error);
      res.status(500).json({ error: 'Error interno al listar las respuestas.' });
    }
  };
}
