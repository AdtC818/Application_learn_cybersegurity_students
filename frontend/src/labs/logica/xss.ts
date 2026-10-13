/**
 * Análisis de HTML para el laboratorio de XSS.
 *
 * No se ejecuta nada: se lee el texto como lo haría un navegador (etiquetas y
 * atributos) y se listan las formas en que ese HTML podría correr JavaScript.
 * La vista previa se dibuja aparte, dentro de un marco aislado (sandbox).
 */

export type TipoVia = 'script' | 'evento' | 'url-js';

export type Disparo = 'al cargar' | 'al hacer clic' | 'al pasar el cursor' | 'al enfocar' | 'cuando ocurra el evento';

export interface ViaEjecucion {
  tipo: TipoVia;
  /** Dónde está: «onerror en <img>». */
  etiqueta: string;
  /** El JavaScript que se escondió ahí. */
  codigo: string;
  disparo: Disparo;
  /** ¿Funciona cuando el HTML entra con element.innerHTML? (<script> no.) */
  conInnerHtml: boolean;
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ETIQUETA = /<([a-zA-Z][\w-]*)((?:\s+[^\s>"'=/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
const ATRIBUTO = /([^\s>"'=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;

const ATRIBUTOS_URL = new Set(['href', 'src', 'action', 'formaction', 'data', 'xlink:href']);

function disparoDeEvento(evento: string): Disparo {
  if (/^on(error|load)$/.test(evento)) return 'al cargar';
  if (/^on(click|dblclick|mousedown|mouseup|submit)$/.test(evento)) return 'al hacer clic';
  if (/^on(mouseover|mouseenter|mousemove)$/.test(evento)) return 'al pasar el cursor';
  if (/^onfocus$/.test(evento)) return 'al enfocar';
  return 'cuando ocurra el evento';
}

function limpiarUrl(valor: string): string {
  // Los navegadores ignoran espacios y caracteres de control dentro del esquema.
  // eslint-disable-next-line no-control-regex
  return valor.replace(/[\u0000- ]+/g, '').toLowerCase();
}

/** Todas las formas en que este HTML podría ejecutar código. */
export function analizarHtml(html: string): ViaEjecucion[] {
  const vias: ViaEjecucion[] = [];

  // <script>…</script> (o sin cerrar: el navegador toma todo lo que sigue)
  const reScript = /<script\b[^>]*>([\s\S]*?)(?:<\/script\s*>|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = reScript.exec(html)) !== null) {
    vias.push({
      tipo: 'script',
      etiqueta: 'etiqueta <script>',
      codigo: m[1].trim() || '(vacío)',
      disparo: 'al cargar',
      conInnerHtml: false,
    });
    if (m[0].length === 0) break;
  }

  ETIQUETA.lastIndex = 0;
  while ((m = ETIQUETA.exec(html)) !== null) {
    const etiqueta = m[1].toLowerCase();
    if (etiqueta === 'script') continue;
    const atributos = m[2] ?? '';
    ATRIBUTO.lastIndex = 0;
    let a: RegExpExecArray | null;
    while ((a = ATRIBUTO.exec(atributos)) !== null) {
      const nombre = a[1].toLowerCase();
      const valor = a[2] ?? a[3] ?? a[4] ?? '';
      if (/^on[a-z]+$/.test(nombre)) {
        vias.push({
          tipo: 'evento',
          etiqueta: `${nombre} en <${etiqueta}>`,
          codigo: valor,
          disparo: disparoDeEvento(nombre),
          conInnerHtml: true,
        });
      } else if (ATRIBUTOS_URL.has(nombre) && limpiarUrl(valor).startsWith('javascript:')) {
        vias.push({
          tipo: 'url-js',
          etiqueta: `${nombre}="javascript:…" en <${etiqueta}>`,
          codigo: valor.replace(/^\s*javascript:/i, '').trim(),
          disparo: nombre === 'href' || nombre === 'action' || nombre === 'formaction' ? 'al hacer clic' : 'al cargar',
          conInnerHtml: true,
        });
      }
    }
  }
  return vias;
}

export type Efecto = 'cookie' | 'redireccion' | 'alerta' | 'otro';

/** Qué consigue el atacante con ese código (clasificación didáctica por palabras clave). */
export function efectoDe(codigo: string): Efecto {
  if (/document\.cookie|localStorage|sessionStorage/.test(codigo)) return 'cookie';
  if (/location|window\.open/.test(codigo)) return 'redireccion';
  if (/\balert\s*\(|\bprompt\s*\(|\bconfirm\s*\(/.test(codigo)) return 'alerta';
  return 'otro';
}

export function describirEfecto(efecto: Efecto): string {
  switch (efecto) {
    case 'cookie':
      return 'Lee la sesión de quien mira la página y la envía a un servidor del atacante.';
    case 'redireccion':
      return 'Manda a la víctima a otra página, quizá una copia falsa de la tuya.';
    case 'alerta':
      return 'Muestra una ventana: es la prueba de que el atacante puede ejecutar código.';
    default:
      return 'Ejecuta código del atacante con los permisos de tu sitio.';
  }
}

/** Texto que muestra la ventana de alerta simulada, si el código llama a alert(...). */
export function textoDeAlerta(codigo: string): string | null {
  const m = /\balert\s*\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`|([\w.]+))?\s*\)/.exec(codigo);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
}

const PAGINA_ESTILO =
  'body{margin:0;padding:12px 14px;font:14px/1.5 system-ui,sans-serif;color:#e8f0fb;background:#0b1f38}' +
  'h1{font-size:1.5em;margin:.2em 0}ul{margin:0;padding:0;list-style:none}' +
  'li{padding:6px 0;border-bottom:1px solid #2b4c74}a{color:#6cc4ff}b{color:#9db3d0}';

/**
 * Documento para el marco aislado. Con `sandbox=""` y esta política de contenido,
 * ni siquiera una etiqueta con onerror puede ejecutar nada ni pedir recursos de red.
 */
export function paginaVistaPrevia(comentarios: Array<{ autor: string; html: string }>): string {
  const items = comentarios.map((c) => `<li><b>${escaparHtml(c.autor)}</b>: ${c.html}</li>`).join('');
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">` +
    `<style>${PAGINA_ESTILO}</style></head><body><ul>${items}</ul></body></html>`
  );
}
