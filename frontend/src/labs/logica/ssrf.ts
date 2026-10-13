/**
 * Clasificación de direcciones para el laboratorio de SSRF.
 * No se hace ninguna petición de red: las respuestas son de juguete.
 */

export type ZonaRed = 'publica' | 'loopback' | 'privada' | 'metadatos' | 'invalida';

export interface AnalisisUrl {
  ok: boolean;
  esquema: string;
  host: string;
  ruta: string;
  zona: ZonaRed;
  /** Dirección IP efectiva (tras la "resolución DNS" simulada), si hay. */
  ip?: string;
  nota?: string;
}

/** DNS de juguete: nombres que resuelven a direcciones internas. */
const DNS_JUGUETE: Record<string, string> = {
  'interno.empresa.local': '10.0.0.5',
  'admin.empresa.local': '127.0.0.1',
  'api.clima.example': '203.0.113.20',
  'imagenes.example': '203.0.113.30',
};

function ipv4(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const partes = m.slice(1).map(Number);
  return partes.every((p) => p >= 0 && p <= 255) ? partes : null;
}

export function zonaDeIp(ip: string): ZonaRed {
  const p = ipv4(ip);
  if (p) {
    if (p[0] === 127 || p[0] === 0) return 'loopback';
    if (p[0] === 169 && p[1] === 254) return 'metadatos';
    if (p[0] === 10) return 'privada';
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return 'privada';
    if (p[0] === 192 && p[1] === 168) return 'privada';
    return 'publica';
  }
  const v6 = ip.toLowerCase();
  if (v6 === '::1' || v6 === '::') return 'loopback';
  if (v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')) return 'privada';
  return 'publica';
}

/** Resuelve un nombre a IP con el DNS de juguete (incluye el truco de nip.io). */
export function resolverNombre(host: string): { ip?: string; nota?: string } {
  const limpio = host.replace(/^\[|\]$/g, '');
  if (ipv4(limpio) || limpio.includes(':')) return { ip: limpio };
  if (limpio === 'localhost') return { ip: '127.0.0.1' };
  const nip = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.nip\.io$/.exec(limpio);
  if (nip) {
    return {
      ip: nip[1],
      nota: 'Parece un dominio público, pero su DNS apunta a una IP interna.',
    };
  }
  const ip = DNS_JUGUETE[limpio];
  return ip ? { ip } : {};
}

export function analizarUrl(texto: string): AnalisisUrl {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    return { ok: false, esquema: '', host: '', ruta: '', zona: 'invalida', nota: 'No es una URL válida.' };
  }
  const host = url.hostname;
  const { ip, nota } = resolverNombre(host);
  const zona: ZonaRed = ip ? zonaDeIp(ip) : 'publica';
  return {
    ok: true,
    esquema: url.protocol,
    host,
    ruta: url.pathname + url.search,
    zona: url.protocol === 'http:' || url.protocol === 'https:' ? zona : 'invalida',
    ip,
    nota: url.protocol === 'http:' || url.protocol === 'https:' ? nota : 'Solo se esperan http o https.',
  };
}

/** Lo que "responde" cada destino de juguete. */
export function respuestaJuguete(a: AnalisisUrl): { titulo: string; cuerpo: string; sensible: boolean } {
  const ip = a.ip ?? '';
  if (a.ruta.startsWith('/latest/meta-data') && ip === '169.254.169.254') {
    return {
      titulo: 'Servicio de metadatos de la nube',
      cuerpo: '{ "AccessKeyId": "AKIA-EJEMPLO", "SecretAccessKey": "clave-de-ejemplo", "Token": "…" }',
      sensible: true,
    };
  }
  if (ip === '127.0.0.1' && a.ruta.startsWith('/admin')) {
    return {
      titulo: 'Panel de administración (solo escucha en localhost)',
      cuerpo: 'Usuarios: admin, ana, luis · [Borrar usuario] [Exportar base]',
      sensible: true,
    };
  }
  if (ip === '10.0.0.5') {
    return {
      titulo: 'Servidor interno 10.0.0.5',
      cuerpo: 'Index of /backups → copia-base-2024.sql',
      sensible: true,
    };
  }
  if (a.host === 'api.clima.example') {
    return { titulo: 'API pública del clima', cuerpo: '{ "ciudad": "Tunja", "temperatura": 14 }', sensible: false };
  }
  if (a.host === 'imagenes.example') {
    return { titulo: 'Servidor de imágenes', cuerpo: '[imagen JPG: 120 KB]', sensible: false };
  }
  return { titulo: 'Sin respuesta', cuerpo: 'Nadie contesta en esa dirección.', sensible: false };
}

export const DOMINIOS_PERMITIDOS = ['api.clima.example', 'imagenes.example'];

export type ResultadoSsrf =
  | { tipo: 'invalida'; analisis: AnalisisUrl; motivo: string }
  | { tipo: 'bloqueada'; analisis: AnalisisUrl; motivo: string }
  | { tipo: 'respondio'; analisis: AnalisisUrl; titulo: string; cuerpo: string; sensible: boolean };

/** Lo que hace el servidor al pedirle "ve a esta URL y muéstrame la vista previa". */
export function pedirVistaPrevia(texto: string, modo: 'vulnerable' | 'seguro'): ResultadoSsrf {
  const analisis = analizarUrl(texto);
  if (!analisis.ok) return { tipo: 'invalida', analisis, motivo: analisis.nota ?? 'URL inválida.' };

  if (modo === 'seguro') {
    if (!DOMINIOS_PERMITIDOS.includes(analisis.host)) {
      return { tipo: 'bloqueada', analisis, motivo: `«${analisis.host}» no está en la lista de destinos permitidos.` };
    }
    if (analisis.esquema !== 'https:') {
      return { tipo: 'bloqueada', analisis, motivo: 'Solo se permite https.' };
    }
    if (analisis.zona !== 'publica') {
      return { tipo: 'bloqueada', analisis, motivo: 'El nombre resuelve a una IP interna.' };
    }
  } else if (analisis.zona === 'invalida') {
    return { tipo: 'invalida', analisis, motivo: analisis.nota ?? 'Esquema no soportado.' };
  }

  const r = respuestaJuguete(analisis);
  return { tipo: 'respondio', analisis, ...r };
}
