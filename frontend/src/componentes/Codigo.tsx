import type { KeyboardEvent, ReactNode } from 'react';

/* ---------- Resaltado de sintaxis mínimo (sin dependencias) ---------- */

type TipoToken = 'com' | 'str' | 'num' | 'pal' | 'fn' | undefined;

export interface Token {
  tipo: TipoToken;
  texto: string;
}

const PATRON =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|await|async|new|import|from|export|require|true|false|null|undefined|class|throw|try|catch|typeof|of|in)\b|\b([A-Za-z_$][\w$]*)(?=\()/g;

/** Devuelve el código separado por líneas, cada una como una lista de tokens. */
export function resaltar(codigo: string): Token[][] {
  const lineas: Token[][] = [[]];

  const empujar = (tipo: TipoToken, texto: string) => {
    const partes = texto.split('\n');
    partes.forEach((parte, i) => {
      if (i > 0) lineas.push([]);
      if (parte.length > 0) lineas[lineas.length - 1].push({ tipo, texto: parte });
    });
  };

  let ultimo = 0;
  for (const m of codigo.matchAll(PATRON)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) empujar(undefined, codigo.slice(ultimo, inicio));
    const tipo: TipoToken = m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'num' : m[4] ? 'pal' : 'fn';
    empujar(tipo, m[0]);
    ultimo = inicio + m[0].length;
  }
  if (ultimo < codigo.length) empujar(undefined, codigo.slice(ultimo));
  return lineas;
}

/* ---------- Bloque de código con números de línea, marcas y notas ---------- */

export type MarcaLinea = 'ataque' | 'defensa' | 'aviso' | 'dato';

interface PropsBloque {
  codigo: string;
  /** Línea (empezando en 1) -> color de la marca. */
  marcas?: Record<number, MarcaLinea>;
  /** Línea -> nota que se muestra justo debajo. */
  notas?: Record<number, ReactNode>;
  /** Si se da, las líneas marcadas se pueden pulsar. */
  alPulsarLinea?: (linea: number) => void;
  lineaActiva?: number | null;
  /** Número de la primera línea (para mostrar fragmentos). */
  desde?: number;
  className?: string;
  etiqueta?: string;
}

export function BloqueCodigo({
  codigo,
  marcas = {},
  notas = {},
  alPulsarLinea,
  lineaActiva,
  desde = 1,
  className,
  etiqueta,
}: PropsBloque) {
  const lineas = resaltar(codigo);

  return (
    <div className={`bloque-codigo${className ? ` ${className}` : ''}`} role="group" aria-label={etiqueta}>
      {lineas.map((tokens, i) => {
        const n = desde + i;
        const marca = marcas[n];
        const pulsable = Boolean(marca && alPulsarLinea);
        const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
          if (pulsable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            alPulsarLinea?.(n);
          }
        };
        return (
          <div key={n} className="linea-grupo">
            <div
              className={`linea${marca ? ` linea-${marca}` : ''}${lineaActiva === n ? ' linea-activa' : ''}${pulsable ? ' linea-pulsable' : ''}`}
              {...(pulsable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    onClick: () => alPulsarLinea?.(n),
                    onKeyDown: teclado,
                    'aria-label': `Ir al hallazgo de la línea ${n}`,
                  }
                : {})}
            >
              <span className="linea-num" aria-hidden="true">
                {n}
              </span>
              <code className="linea-txt codigo">
                {tokens.length === 0 ? '​' : null}
                {tokens.map((t, k) =>
                  t.tipo ? (
                    <span key={k} className={`tk-${t.tipo}`}>
                      {t.texto}
                    </span>
                  ) : (
                    <span key={k}>{t.texto}</span>
                  ),
                )}
              </code>
            </div>
            {notas[n] && <div className={`linea-nota${marca ? ` nota-${marca}` : ''}`}>{notas[n]}</div>}
          </div>
        );
      })}
    </div>
  );
}
