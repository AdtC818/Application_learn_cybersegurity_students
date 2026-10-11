import { Router } from 'express';
import { EncuestaController } from '../controllers/EncuestaController';

export function crearRutasEncuesta(controller: EncuestaController): Router {
  const router = Router();
  router.post('/encuesta', controller.registrar);
  router.get('/encuesta', controller.listar);
  return router;
}
