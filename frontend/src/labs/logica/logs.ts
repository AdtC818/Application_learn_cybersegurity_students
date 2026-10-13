/**
 * Formato de líneas de log para el laboratorio de datos sensibles.
 */

export interface DatosLogin {
  email: string;
  password: string;
  tarjeta: string;
}

const CLAVE_SENSIBLE = /pass|clave|token|secret|tarjeta|card|cvv|authorization|cookie/i;

export function hora(fecha: Date): string {
  return fecha.toTimeString().slice(0, 8);
}

export function enmascararEmail(email: string): string {
  const [usuario, dominio] = email.split('@');
  if (!dominio) return '***';
  return `${usuario.slice(0, 1)}***@${dominio}`;
}

export function enmascararTarjeta(tarjeta: string): string {
  const digitos = tarjeta.replace(/\D/g, '');
  return digitos.length >= 4 ? `**** **** **** ${digitos.slice(-4)}` : '****';
}

/** console.log('Login recibido:', email, password, tarjeta): escribe cada dato tal cual. */
export function logVulnerable(d: DatosLogin, fecha: Date): string[] {
  return [`${hora(fecha)} INFO  Login recibido: ${d.email} ${d.password} ${d.tarjeta}`];
}

/** Registra el evento con datos mínimos y enmascarados. */
export function logSeguro(d: DatosLogin, fecha: Date): string[] {
  return [`${hora(fecha)} INFO  Login recibido: ${enmascararEmail(d.email)}`];
}

/** Para mostrar el valor de una clave con la regla de redacción que aplicaría un logger configurado. */
export function redactarCampo(clave: string, valor: string): string {
  if (/email|correo/i.test(clave)) return enmascararEmail(valor);
  if (/tarjeta|card/i.test(clave)) return enmascararTarjeta(valor);
  if (CLAVE_SENSIBLE.test(clave)) return '[REDACTADO]';
  return valor;
}

/** ¿Aparece alguno de los datos sensibles en el texto del log? */
export function filtraciones(lineas: string[], d: DatosLogin): Array<'password' | 'tarjeta' | 'email'> {
  const texto = lineas.join('\n');
  const encontradas: Array<'password' | 'tarjeta' | 'email'> = [];
  if (d.password && texto.includes(d.password)) encontradas.push('password');
  if (d.tarjeta && texto.includes(d.tarjeta)) encontradas.push('tarjeta');
  if (d.email && texto.includes(d.email)) encontradas.push('email');
  return encontradas;
}
