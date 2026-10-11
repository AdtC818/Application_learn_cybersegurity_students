import { Request, Response } from 'express';
import { z } from 'zod';
import { AnalizarCodigo } from '../../../application/casos-uso/AnalizarCodigo';
import { ConsultarHistorialAnalisis } from '../../../application/casos-uso/ConsultarHistorialAnalisis';
import { ErrorParseo } from '../../../domain/ports/ParserCodigo';

const esquemaAnalizar = z.object({
  codigoFuente: z.string().min(1, 'El código fuente no puede estar vacío'),
  nombreArchivo: z.string().optional(),
  lenguaje: z.enum(['javascript', 'typescript']).optional(),
  guardarEnHistorial: z.boolean().optional(),
});

export class AnalisisController {
  constructor(
    private readonly casoUsoAnalizarCodigo: AnalizarCodigo,
    private readonly casoUsoConsultarHistorial: ConsultarHistorialAnalisis,
  ) {}

  analizar = async (req: Request, res: Response): Promise<void> => {
    const resultado = esquemaAnalizar.safeParse(req.body);
    if (!resultado.success) {
      res.status(400).json({ error: 'Datos de entrada inválidos', detalles: resultado.error.flatten() });
      return;
    }

    try {
      const analisis = await this.casoUsoAnalizarCodigo.ejecutar(resultado.data);
      res.status(200).json(analisis.toJSON());
    } catch (error) {
      if (error instanceof ErrorParseo) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error('Error inesperado analizando código:', error);
      res.status(500).json({ error: 'Error interno al analizar el código.' });
    }
  };

  listarHistorial = async (req: Request, res: Response): Promise<void> => {
    try {
      const limite = req.query.limite ? Number(req.query.limite) : undefined;
      const analisis = await this.casoUsoConsultarHistorial.ejecutar(limite);
      res.status(200).json(analisis.map((a) => a.toJSON()));
    } catch (error) {
      console.error('Error consultando historial:', error);
      res.status(500).json({ error: 'Error interno al consultar el historial.' });
    }
  };

  obtenerPorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const analisis = await this.casoUsoConsultarHistorial.ejecutarPorId(req.params.id);
      if (!analisis) {
        res.status(404).json({ error: 'Análisis no encontrado.' });
        return;
      }
      res.status(200).json(analisis.toJSON());
    } catch (error) {
      console.error('Error consultando análisis:', error);
      res.status(500).json({ error: 'Error interno al consultar el análisis.' });
    }
  };
}
