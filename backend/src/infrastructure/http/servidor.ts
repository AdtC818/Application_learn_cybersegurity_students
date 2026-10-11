import express, { Express } from 'express';
import cors from 'cors';
import { Contenedor } from '../../config/contenedor';
import { AnalisisController } from './controllers/AnalisisController';
import { EncuestaController } from './controllers/EncuestaController';
import { crearRutasAnalisis } from './routes/analisis.routes';
import { crearRutasEncuesta } from './routes/encuesta.routes';

/**
 * Builds the Express app, wiring HTTP routes to controllers built from the
 * use cases in the given container. Kept as a plain function (not a class)
 * so tests can build an app with a fake container and hit it with
 * supertest without starting a real server.
 */
export function crearServidor(contenedor: Contenedor): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  const analisisController = new AnalisisController(
    contenedor.casoUsoAnalizarCodigo,
    contenedor.casoUsoConsultarHistorial,
  );
  const encuestaController = new EncuestaController(contenedor.casoUsoRegistrarEncuesta);

  app.get('/api/salud', (_req, res) => res.json({ estado: 'ok' }));
  app.use('/api', crearRutasAnalisis(analisisController));
  app.use('/api', crearRutasEncuesta(encuestaController));

  return app;
}
