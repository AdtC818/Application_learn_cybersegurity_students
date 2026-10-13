import { useEffect, useRef, type ReactNode } from 'react';
import { useMenosMovimiento } from '../hooks/useMenosMovimiento';
import type { NombreGlifo } from '../contenido/catalogo';
import { GlifoEn } from './Glifos';

/**
 * Piezas para dibujar los diagramas de los laboratorios como planos técnicos:
 * nodos (equipos), enlaces (flechas), paquetes que viajan y marcas de impacto.
 */

export type EstadoEscena = 'normal' | 'ataque' | 'defensa' | 'dato' | 'apagado';

/** Definiciones compartidas (puntas de flecha). Se monta una sola vez en la app. */
export function MarcadoresSvg() {
  const punta = (id: string, color: string) => (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8.5"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M1 1.500L9 5 1 8.500z" fill={color} />
    </marker>
  );
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {punta('m-flecha-ataque', '#ff5a5f')}
        {punta('m-flecha-defensa', '#3fe0a0')}
        {punta('m-flecha-dato', '#6cc4ff')}
        {punta('m-flecha-normal', '#9db3d0')}
        {punta('m-flecha-apagado', '#4d72a2')}
      </defs>
    </svg>
  );
}

interface PropsEscena {
  ancho: number;
  alto: number;
  titulo: string;
  children: ReactNode;
  /**
   * Al cambiar este valor la escena se vuelve a crear desde cero, y con ella
   * sus animaciones (las animaciones SMIL cuentan el tiempo desde que nace el <svg>).
   */
  reinicio?: number | string;
}

export function Escena({ ancho, alto, titulo, children, reinicio }: PropsEscena) {
  const marco = useRef<HTMLDivElement>(null);
  const menosMovimiento = useMenosMovimiento();

  // En celular el dibujo es más ancho que la pantalla: cada vez que la animación
  // arranca, la "cámara" empieza a la izquierda y acompaña el viaje hasta el desenlace.
  useEffect(() => {
    const el = marco.current;
    if (!el || el.scrollWidth <= el.clientWidth + 1) return;
    el.scrollLeft = 0;
    if (menosMovimiento) return;
    const t = window.setTimeout(() => el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' }), 900);
    return () => window.clearTimeout(t);
  }, [reinicio, menosMovimiento]);

  return (
    <>
      <div className="escena-marco" ref={marco}>
        <svg
          key={reinicio}
          className="escena"
          viewBox={`0 0 ${ancho} ${alto}`}
          role="img"
          aria-label={titulo}
          preserveAspectRatio="xMidYMid meet"
        >
          {children}
        </svg>
      </div>
      <p className="escena-aviso" aria-hidden="true">
        Desliza el dibujo para verlo completo
      </p>
    </>
  );
}

interface PropsNodo {
  x: number;
  y: number;
  glifo: NombreGlifo;
  etiqueta: string;
  sub?: string;
  estado?: EstadoEscena;
  ancho?: number;
  alto?: number;
}

export function Nodo({ x, y, glifo, etiqueta, sub, estado = 'normal', ancho = 84, alto = 64 }: PropsNodo) {
  return (
    <g className={`nodo nodo-${estado}`}>
      <rect x={x - ancho / 2} y={y - alto / 2} width={ancho} height={alto} rx={5} />
      <GlifoEn nombre={glifo} x={x} y={y} tamano={Math.min(ancho, alto) * 0.62} />
      <text x={x} y={y + alto / 2 + 15} textAnchor="middle" className="esc-texto">
        {etiqueta}
      </text>
      {sub && (
        <text x={x} y={y + alto / 2 + 29} textAnchor="middle" className="esc-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

interface PropsEnlace {
  d: string;
  estado?: EstadoEscena;
  punteada?: boolean;
  sinFlecha?: boolean;
}

export function Enlace({ d, estado = 'normal', punteada, sinFlecha }: PropsEnlace) {
  return (
    <path
      d={d}
      className={`enlace enlace-${estado}`}
      strokeDasharray={punteada ? '5 5' : undefined}
      markerEnd={sinFlecha ? undefined : `url(#m-flecha-${estado})`}
    />
  );
}

interface PropsPaquete {
  d: string;
  estado?: EstadoEscena;
  dur?: number;
  retardo?: number;
  repetir?: boolean;
  /** Texto corto que viaja junto al paquete. */
  texto?: string;
}

/** Un punto que viaja por el trazado `d`. Con "menos movimiento" no se dibuja. */
export function Paquete({ d, estado = 'dato', dur = 1.5, retardo = 0, repetir, texto }: PropsPaquete) {
  const sinMovimiento = useMenosMovimiento();
  if (sinMovimiento) return null;
  const movimiento = (
    <animateMotion
      dur={`${dur}s`}
      begin={`${retardo}s`}
      path={d}
      fill="freeze"
      repeatCount={repetir ? 'indefinite' : '1'}
      calcMode="linear"
    />
  );
  return (
    <g className={`paquete paquete-${estado}`} opacity={retardo > 0 ? 0 : 1}>
      {/* El grupo queda oculto hasta que empieza su movimiento */}
      {retardo > 0 && <set attributeName="opacity" to="1" begin={`${retardo}s`} fill="freeze" />}
      <circle r={6} cx={0} cy={0}>
        {movimiento}
      </circle>
      {texto && (
        <text className="esc-mono paquete-texto" y={-11} textAnchor="middle">
          {texto}
          {movimiento}
          {/* El rótulo desaparece al llegar, para no tapar lo que hay en el destino */}
          <set attributeName="opacity" to="0" begin={`${retardo + dur}s`} fill="freeze" />
        </text>
      )}
    </g>
  );
}

interface PropsImpacto {
  x: number;
  y: number;
  tipo: 'brecha' | 'bloqueo' | 'ok';
  retardo?: number;
}

/** Marca de resultado: brecha (rojo), bloqueo (X verde) o éxito (check verde). */
export function Impacto({ x, y, tipo, retardo = 0 }: PropsImpacto) {
  const color = tipo === 'brecha' ? 'ataque' : 'defensa';
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`impacto impacto-${color}`} style={{ animationDelay: `${retardo}s` }}>
        <circle r={15} />
        {tipo === 'brecha' && <path d="M-6 -6L6 6M6 -6L-6 6" />}
        {tipo === 'bloqueo' && <path d="M-7 0h14" />}
        {tipo === 'ok' && <path d="M-6 0l4.500 5 8-10" />}
      </g>
    </g>
  );
}

interface PropsGlobo {
  x: number;
  y: number;
  lineas: string[];
  estado?: EstadoEscena;
  /** 'izq' ancla el texto a la izquierda desde x; 'centro' lo centra en x. */
  anclaje?: 'izq' | 'centro';
  mono?: boolean;
}

/** Cuadro de texto corto dentro de la escena (varias líneas explícitas). */
export function Globo({ x, y, lineas, estado = 'normal', anclaje = 'centro', mono }: PropsGlobo) {
  const charW = mono ? 7 : 6.6;
  const w = Math.max(...lineas.map((l) => l.length)) * charW + 18;
  const h = lineas.length * 16 + 12;
  const x0 = anclaje === 'centro' ? x - w / 2 : x;
  return (
    <g className={`globo globo-${estado}`}>
      <rect x={x0} y={y} width={w} height={h} rx={4} />
      {lineas.map((l, i) => (
        <text
          key={i}
          x={x0 + 9}
          y={y + 18 + i * 16}
          className={mono ? 'esc-mono' : 'esc-texto-chico'}
        >
          {l}
        </text>
      ))}
    </g>
  );
}

export function TextoEscena({
  x,
  y,
  children,
  anclaje = 'middle',
  mono,
  estado,
}: {
  x: number;
  y: number;
  children: ReactNode;
  anclaje?: 'start' | 'middle' | 'end';
  mono?: boolean;
  estado?: EstadoEscena;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anclaje}
      className={`${mono ? 'esc-mono' : 'esc-texto-chico'}${estado ? ` esc-${estado}` : ''}`}
    >
      {children}
    </text>
  );
}
