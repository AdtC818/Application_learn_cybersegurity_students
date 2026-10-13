import { prisma } from '../infrastructure/persistence/prisma/cliente';
import { PrismaRepositorioAnalisis } from '../infrastructure/persistence/prisma/PrismaRepositorioAnalisis';
import { BabelParserAdapter } from '../infrastructure/parsers/BabelParserAdapter';
import { RegistroDetectores } from '../application/servicios/RegistroDetectores';
import { AnalizarCodigo } from '../application/casos-uso/AnalizarCodigo';
import { ConsultarHistorialAnalisis } from '../application/casos-uso/ConsultarHistorialAnalisis';

/**
 * Contenedor (composition root)
 *
 * This is the one place where concrete infrastructure classes (the Prisma
 * adapter, the Babel adapter) get wired into the use cases that depend
 * on their ports. Everything above this file deals only in interfaces.
 * A test can build its own small container with fake adapters instead of
 * calling this function at all.
 */
export function construirContenedor() {
  const parserCodigo = new BabelParserAdapter();
  const detectores = RegistroDetectores.obtenerInstancia().obtenerTodos();
  const repositorioAnalisis = new PrismaRepositorioAnalisis(prisma);

  return {
    casoUsoAnalizarCodigo: new AnalizarCodigo(parserCodigo, detectores, repositorioAnalisis),
    casoUsoConsultarHistorial: new ConsultarHistorialAnalisis(repositorioAnalisis),
  };
}

export type Contenedor = ReturnType<typeof construirContenedor>;
