import { Router } from 'express';
import { AnalisisController } from '../controllers/AnalisisController';

export function crearRutasAnalisis(controller: AnalisisController): Router {
  const router = Router();
  router.post('/analizar', controller.analizar);
  router.get('/historial', controller.listarHistorial);
  router.get('/historial/:id', controller.obtenerPorId);
  return router;
}
