/**
 * Hashes reales para el laboratorio de criptografía débil:
 * MD5 (rápido y roto para contraseñas) y PBKDF2 (lento a propósito, con sal).
 */

/* ---------- MD5 ---------- */

const K = new Uint32Array(64).map((_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

function rotIzq(x: number, c: number): number {
  return ((x << c) | (x >>> (32 - c))) >>> 0;
}

function hexLE(n: number): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += ((n >>> (i * 8)) & 0xff).toString(16).padStart(2, '0');
  return s;
}

export function md5(texto: string): string {
  const msg = new TextEncoder().encode(texto);
  const len = msg.length;
  const total = (((len + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[len] = 0x80;
  const vista = new DataView(buf.buffer);
  vista.setUint32(total - 8, (len * 8) >>> 0, true);
  vista.setUint32(total - 4, Math.floor((len * 8) / 4294967296), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const M = new Uint32Array(16);
  for (let off = 0; off < total; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = vista.getUint32(off + j * 4, true);
    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotIzq(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  return hexLE(a0) + hexLE(b0) + hexLE(c0) + hexLE(d0);
}

/* ---------- Datos del laboratorio ---------- */

/** Contraseñas comunes que cualquier atacante prueba primero. */
export const DICCIONARIO = [
  '123456',
  'password',
  'qwerty',
  '111111',
  'abc123',
  'admin',
  'letmein',
  'welcome',
  'iloveyou',
  'mango2024',
  'colombia',
  'tunja1539',
];

export interface UsuarioClave {
  nombre: string;
  clave: string;
  /** Sal propia de cada usuario (aquí fija, para que la demo sea reproducible). */
  sal: string;
}

export const USUARIOS_CLAVES: UsuarioClave[] = [
  { nombre: 'ana', clave: '123456', sal: 'k9Zq' },
  { nombre: 'beto', clave: '123456', sal: 'p3Xt' },
  { nombre: 'carla', clave: 'password', sal: 'm7Lw' },
  { nombre: 'dani', clave: 'Verde-Lluvia-Tunja-82!', sal: 'r2Ho' },
];

export interface IntentoCrackeo {
  encontrada: string | null;
  intentos: number;
}

/** El atacante prueba cada palabra del diccionario hasta que el hash coincide. */
export function crackearMd5(hash: string, sal = ''): IntentoCrackeo {
  for (let i = 0; i < DICCIONARIO.length; i++) {
    if (md5(sal + DICCIONARIO[i]) === hash) return { encontrada: DICCIONARIO[i], intentos: i + 1 };
  }
  return { encontrada: null, intentos: DICCIONARIO.length };
}

/* ---------- PBKDF2 (WebCrypto) ---------- */

export const ITERACIONES_PBKDF2 = 100_000;

function aHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function pbkdf2Hex(clave: string, sal: string, iteraciones = ITERACIONES_PBKDF2): Promise<string> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(sal), iterations: iteraciones },
    material,
    256,
  );
  return aHex(bits);
}

export interface Medicion {
  md5PorSegundo: number;
  pbkdf2Ms: number;
}

/** Mide en este navegador cuántos hashes por segundo salen de cada método. */
export async function medirVelocidades(): Promise<Medicion> {
  const rondas = 20000;
  const t0 = performance.now();
  for (let i = 0; i < rondas; i++) md5('prueba' + i);
  const msMd5 = Math.max(performance.now() - t0, 0.001);

  const t1 = performance.now();
  await pbkdf2Hex('prueba', 'sal-de-prueba');
  const msPbkdf2 = Math.max(performance.now() - t1, 0.001);

  return { md5PorSegundo: (rondas / msMd5) * 1000, pbkdf2Ms: msPbkdf2 };
}

/** Texto legible para una duración en segundos. */
export function duracionLegible(segundos: number): string {
  if (segundos < 1) return 'menos de 1 segundo';
  if (segundos < 90) return `${Math.round(segundos)} segundos`;
  const min = segundos / 60;
  if (min < 90) return `${Math.round(min)} minutos`;
  const horas = min / 60;
  if (horas < 48) return `${Math.round(horas)} horas`;
  const dias = horas / 24;
  if (dias < 365 * 2) return `${Math.round(dias)} días`;
  return `${Math.round(dias / 365)} años`;
}
