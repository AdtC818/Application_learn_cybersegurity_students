import { useCallback, useEffect, useState } from 'react';

/**
 * Enrutador mínimo basado en el hash de la URL, para poder compartir enlaces
 * directos a un laboratorio (por ejemplo #/labs/sql) sin servidor de rutas.
 */

export type Ruta =
  | { vista: 'analizar' }
  | { vista: 'labs' }
  | { vista: 'lab'; slug: string };

export function leerRuta(hash: string): Ruta {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (partes[0] === 'labs' && partes[1]) return { vista: 'lab', slug: partes[1] };
  if (partes[0] === 'labs') return { vista: 'labs' };
  return { vista: 'analizar' };
}

export function hrefDe(ruta: Ruta): string {
  if (ruta.vista === 'labs') return '#/labs';
  if (ruta.vista === 'lab') return `#/labs/${ruta.slug}`;
  return '#/';
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => leerRuta(window.location.hash));

  const alCambiar = useCallback(() => {
    setRuta(leerRuta(window.location.hash));
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, [alCambiar]);

  return ruta;
}
