import type { ResultadoAnalisis } from './tipos';

const URL_BASE_API: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

/** Wrapper común: traduce los fallos de red y los errores del servidor a mensajes claros. */
async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_BASE_API}${ruta}`, opciones);
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend (npm run dev)?');
  }

  const datos: unknown = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = (datos as { error?: string }).error;
    throw new Error(mensaje ?? 'Ocurrió un error en el servidor.');
  }
  return datos as T;
}

function enviarCodigo(cuerpo: Record<string, unknown>): Promise<ResultadoAnalisis> {
  return pedir<ResultadoAnalisis>('/analizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
}

/** Analiza el código sin guardar nada en la base de datos. */
export function analizarCodigo(codigoFuente: string): Promise<ResultadoAnalisis> {
  return enviarCodigo({ codigoFuente });
}

/** Analiza el código y además lo guarda en el historial, con un nombre opcional escrito a mano. */
export function guardarAnalisis(
  codigoFuente: string,
  nombreArchivo?: string,
): Promise<ResultadoAnalisis> {
  return enviarCodigo({
    codigoFuente,
    nombreArchivo: nombreArchivo?.trim() || undefined,
    guardarEnHistorial: true,
  });
}

/** Trae los análisis guardados más recientes. */
export function listarHistorial(): Promise<ResultadoAnalisis[]> {
  return pedir<ResultadoAnalisis[]>('/historial');
}
