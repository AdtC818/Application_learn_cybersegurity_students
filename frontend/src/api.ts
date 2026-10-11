import type { ResultadoAnalisis } from './tipos';

const URL_BASE_API: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export async function analizarCodigo(codigoFuente: string): Promise<ResultadoAnalisis> {
  const respuesta = await fetch(`${URL_BASE_API}/analizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigoFuente }),
  });

  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.error ?? 'Error al analizar el código.');
  }
  return datos as ResultadoAnalisis;
}
