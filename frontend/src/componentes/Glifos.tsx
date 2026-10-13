import type { ReactElement } from 'react';
import type { NombreGlifo } from '../contenido/catalogo';

/**
 * Dibujos de línea (48x48) que se usan tanto como iconos sueltos como
 * piezas dentro de los diagramas de los laboratorios.
 */
const FORMAS: Record<NombreGlifo, ReactElement> = {
  persona: (
    <>
      <circle cx="24" cy="15" r="7" />
      <path d="M9 43c0-9.5 6-16 15-16s15 6.5 15 16" />
    </>
  ),
  atacante: (
    <>
      <path d="M24 4C15.500 4 10 10.500 10 18.500V24c0 2 1 3.800 2.800 4.800L12 34h24l-.8-5.200C37 28.800 38 27 38 25v-6.500C38 10.500 32.500 4 24 4z" />
      <path d="M16 19.500c0-1.500 2.800-3.200 8-3.200s8 1.700 8 3.200v3.500c0 3.500-3.500 6-8 6s-8-2.500-8-6z" />
      <circle cx="20.500" cy="22" r="1.700" fill="currentColor" stroke="none" />
      <circle cx="27.500" cy="22" r="1.700" fill="currentColor" stroke="none" />
      <path d="M5 44c1.500-6.500 7-10 14-10.500M43 44c-1.500-6.500-7-10-14-10.500" />
    </>
  ),
  servidor: (
    <>
      <rect x="7" y="7" width="34" height="14" rx="2.500" />
      <rect x="7" y="27" width="34" height="14" rx="2.500" />
      <circle cx="14" cy="14" r="1.700" fill="currentColor" stroke="none" />
      <circle cx="14" cy="34" r="1.700" fill="currentColor" stroke="none" />
      <path d="M21 14h14M21 34h14" />
    </>
  ),
  base: (
    <>
      <ellipse cx="24" cy="11" rx="14" ry="5" />
      <path d="M10 11v26c0 2.800 6.300 5 14 5s14-2.200 14-5V11" />
      <path d="M10 24c0 2.800 6.300 5 14 5s14-2.200 14-5" />
    </>
  ),
  navegador: (
    <>
      <rect x="5" y="8" width="38" height="32" rx="3" />
      <path d="M5 16h38" />
      <circle cx="10" cy="12" r="1.200" fill="currentColor" stroke="none" />
      <circle cx="14.500" cy="12" r="1.200" fill="currentColor" stroke="none" />
      <path d="M19 25l-4 3.500 4 3.500M29 25l4 3.500-4 3.500M26 23.500l-4 10" />
    </>
  ),
  archivo: (
    <>
      <path d="M11 5h18l9 9v29H11z" />
      <path d="M29 5v9h9" />
      <path d="M17 24h14M17 30h14M17 36h9" />
    </>
  ),
  carpeta: (
    <path d="M5 12a2 2 0 0 1 2-2h12l5 6h17a2 2 0 0 1 2 2v21a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
  ),
  nube: <path d="M14 37a9 9 0 0 1-1.500-17.900A12 12 0 0 1 35.500 18 9.500 9.500 0 0 1 35 37z" />,
  llave: (
    <>
      <circle cx="15" cy="24" r="8.500" />
      <circle cx="15" cy="24" r="2.500" />
      <path d="M23.500 24H43M36 24v7M43 24v5" />
    </>
  ),
  candado: (
    <>
      <rect x="9" y="21" width="30" height="21" rx="3.500" />
      <path d="M15 21v-6.500a9 9 0 0 1 18 0V21" />
      <circle cx="24" cy="30.500" r="2.800" />
      <path d="M24 33.300V37" />
    </>
  ),
  terminal: (
    <>
      <rect x="4" y="8" width="40" height="32" rx="3" />
      <path d="M11 18l7 6-7 6M22 31h14" />
    </>
  ),
  galleta: (
    <>
      <path d="M24 5a19 19 0 1 0 19 19 7 7 0 0 1-7-7 7 7 0 0 1-7-7 5 5 0 0 1-5-5z" />
      <circle cx="17" cy="19" r="1.900" fill="currentColor" stroke="none" />
      <circle cx="22" cy="31" r="1.900" fill="currentColor" stroke="none" />
      <circle cx="31" cy="30" r="1.900" fill="currentColor" stroke="none" />
      <circle cx="13" cy="29" r="1.500" fill="currentColor" stroke="none" />
    </>
  ),
  repo: (
    <>
      <circle cx="13" cy="11" r="4" />
      <circle cx="13" cy="37" r="4" />
      <circle cx="35" cy="21" r="4" />
      <path d="M13 15v18M35 25c0 6-10 8-17 10" />
    </>
  ),
  ojo: (
    <>
      <path d="M3 24s8.500-14 21-14 21 14 21 14-8.500 14-21 14S3 24 3 24z" />
      <circle cx="24" cy="24" r="6" />
    </>
  ),
  escudo: (
    <>
      <path d="M24 4l16 6v12c0 10.500-6.500 17.500-16 21-9.500-3.500-16-10.500-16-21V10z" />
      <path d="M17 24l5 5 9-10" />
    </>
  ),
  bot: (
    <>
      <rect x="9" y="16" width="30" height="22" rx="5" />
      <path d="M24 16V9" />
      <circle cx="24" cy="7" r="2.200" />
      <circle cx="18" cy="26" r="2.600" />
      <circle cx="30" cy="26" r="2.600" />
      <path d="M18 33h12M4 24v6M44 24v6" />
    </>
  ),
  llaves: (
    <path d="M17 6c-5 0-6 2-6 6v5c0 3-2 5-5 7 3 2 5 4 5 7v5c0 4 1 6 6 6M31 6c5 0 6 2 6 6v5c0 3 2 5 5 7-3 2-5 4-5 7v5c0 4-1 6-6 6" />
  ),
  cadena: (
    <>
      <path d="M20 28l8-8" />
      <path d="M17 21l-5 5a7 7 0 0 0 10 10l5-5" />
      <path d="M31 27l5-5a7 7 0 0 0-10-10l-5 5" />
    </>
  ),
  muro: (
    <>
      <rect x="5" y="14" width="38" height="26" rx="1.500" />
      <path d="M5 22.500h38M5 31h38M16 14v8.500M32 14v8.500M24 22.500V31M12 31v9M36 31v9" />
      <path d="M24 4v6M21 7l3-3 3 3" />
    </>
  ),
  diana: (
    <>
      <circle cx="24" cy="24" r="18" />
      <circle cx="24" cy="24" r="11" />
      <circle cx="24" cy="24" r="4" fill="currentColor" />
      <path d="M24 2v8M24 38v8M2 24h8M38 24h8" />
    </>
  ),
  registro: (
    <>
      <rect x="8" y="5" width="30" height="38" rx="3" />
      <path d="M14 14h18M14 21h18M14 28h9" />
      <circle cx="33" cy="34" r="6" fill="var(--lamina)" />
      <path d="M37.500 38.500l5 5" />
    </>
  ),
};

const TRAZO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

interface PropsGlifo {
  nombre: NombreGlifo;
  tamano?: number;
  className?: string;
  /** Si se da, el icono se anuncia a lectores de pantalla; si no, es decorativo. */
  titulo?: string;
}

/** Icono suelto (interfaz). */
export function Glifo({ nombre, tamano = 24, className, titulo }: PropsGlifo) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={tamano}
      height={tamano}
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
      {...TRAZO}
    >
      {FORMAS[nombre]}
    </svg>
  );
}

interface PropsGlifoEn {
  nombre: NombreGlifo;
  x: number;
  y: number;
  tamano?: number;
}

/** Icono dentro de una escena SVG, centrado en (x, y). */
export function GlifoEn({ nombre, x, y, tamano = 40 }: PropsGlifoEn) {
  const escala = tamano / 48;
  return (
    <g transform={`translate(${x - tamano / 2} ${y - tamano / 2}) scale(${escala})`} {...TRAZO}>
      {FORMAS[nombre]}
    </g>
  );
}
