/**
 * Reglas del navegador sobre cookies para el laboratorio de sesiones inseguras.
 */

export interface BanderasCookie {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'sin' | 'None' | 'Lax' | 'Strict';
}

export type Ataque = 'xss' | 'espia' | 'csrf';

export interface ResultadoAtaque {
  /** true = el ataque funciona; false = bloqueado; 'incierto' = depende del navegador. */
  exito: boolean | 'incierto';
  porque: string;
}

export function simularAtaque(b: BanderasCookie, ataque: Ataque): ResultadoAtaque {
  switch (ataque) {
    case 'xss':
      return b.httpOnly
        ? { exito: false, porque: 'document.cookie no puede leer una cookie HttpOnly: el script ve una lista vacía.' }
        : { exito: true, porque: 'document.cookie devuelve la cookie completa y el script la envía al atacante.' };
    case 'espia':
      return b.secure
        ? { exito: false, porque: 'Con Secure, el navegador nunca manda la cookie por http:// (sin cifrar).' }
        : {
            exito: true,
            porque: 'Al entrar por http:// la cookie viaja en texto plano: quien esté en esa red WiFi la puede leer.',
          };
    case 'csrf':
      if (b.sameSite === 'Strict' || b.sameSite === 'Lax') {
        return {
          exito: false,
          porque: `Con SameSite=${b.sameSite} el navegador no manda la cookie en un POST que viene de otro sitio.`,
        };
      }
      if (b.sameSite === 'None') {
        return b.secure
          ? { exito: true, porque: 'SameSite=None manda la cookie también desde otros sitios: el POST llega con tu sesión.' }
          : {
              exito: false,
              porque:
                'Los navegadores modernos rechazan SameSite=None sin Secure: la cookie ni se guarda (y tampoco serviría para iniciar sesión).',
            };
      }
      return {
        exito: 'incierto',
        porque: 'Sin SameSite, Chrome lo trata como Lax pero otros navegadores no. No dependas de eso: decláralo.',
      };
  }
}

export function advertencias(b: BanderasCookie): string[] {
  const lista: string[] = [];
  if (b.sameSite === 'None' && !b.secure) {
    lista.push('SameSite=None exige Secure; sin él la cookie es rechazada por los navegadores modernos.');
  }
  return lista;
}

export function cabeceraSetCookie(b: BanderasCookie): string {
  const partes = ['sid=a91f3c0e7b', 'Path=/'];
  if (b.httpOnly) partes.push('HttpOnly');
  if (b.secure) partes.push('Secure');
  if (b.sameSite !== 'sin') partes.push(`SameSite=${b.sameSite}`);
  return `Set-Cookie: ${partes.join('; ')}`;
}

export function cuantasProtecciones(b: BanderasCookie): number {
  return (
    Number(b.httpOnly) + Number(b.secure) + Number(b.sameSite === 'Lax' || b.sameSite === 'Strict')
  );
}
