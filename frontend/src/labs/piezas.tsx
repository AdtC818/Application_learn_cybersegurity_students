import type { ReactNode } from 'react';
import type { Modo } from './tipos';
import { Glifo } from '../componentes/Glifos';

/** Interruptor entre la versión vulnerable y la segura del mismo código. */
export function AlternadorModo({ modo, alCambiar }: { modo: Modo; alCambiar: (m: Modo) => void }) {
  return (
    <div className="alternador" role="group" aria-label="Versión del código">
      <button
        type="button"
        className="alternador-opcion alternador-vulnerable"
        aria-pressed={modo === 'vulnerable'}
        onClick={() => alCambiar('vulnerable')}
      >
        <Glifo nombre="atacante" tamano={18} />
        Código vulnerable
      </button>
      <button
        type="button"
        className="alternador-opcion alternador-seguro"
        aria-pressed={modo === 'seguro'}
        onClick={() => alCambiar('seguro')}
      >
        <Glifo nombre="escudo" tamano={18} />
        Código seguro
      </button>
    </div>
  );
}

type TipoVeredicto = 'brecha' | 'bloqueado' | 'neutro' | 'aviso' | 'ok';

/** El resultado de lo que se acaba de intentar, en una línea que no se puede pasar por alto. */
export function Veredicto({
  tipo,
  titulo,
  children,
}: {
  tipo: TipoVeredicto;
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <div className={`veredicto veredicto-${tipo}`} role="status" aria-live="polite">
      <strong className="veredicto-titulo">{titulo}</strong>
      {children && <div className="veredicto-texto">{children}</div>}
    </div>
  );
}

/** Un recuadro de "lo que ve" el servidor, la base de datos, el navegador, etc. */
export function Lectura({
  titulo,
  children,
  estado,
  mono = true,
}: {
  titulo: string;
  children: ReactNode;
  estado?: 'ataque' | 'defensa' | 'dato';
  mono?: boolean;
}) {
  return (
    <div className={`lectura${estado ? ` lectura-${estado}` : ''}`}>
      <div className="lectura-titulo">{titulo}</div>
      <div className={`lectura-cuerpo${mono ? ' codigo' : ''}`}>{children}</div>
    </div>
  );
}

export interface ItemChip {
  etiqueta: string;
  /** Texto largo opcional que se muestra como ayuda al pasar el cursor. */
  ayuda?: string;
}

/** Fila de ejemplos para probar con un clic. */
export function FilaChips({
  titulo,
  items,
  alElegir,
  activo,
  ataque = true,
}: {
  titulo: string;
  items: ItemChip[];
  alElegir: (indice: number) => void;
  activo?: number | null;
  ataque?: boolean;
}) {
  return (
    <div className="campo">
      <span className="etiqueta">{titulo}</span>
      <div className="chips">
        {items.map((it, i) => (
          <button
            key={it.etiqueta}
            type="button"
            className={`chip${ataque ? ' chip-ataque' : ''}`}
            title={it.ayuda}
            aria-pressed={activo === i}
            onClick={() => alElegir(i)}
          >
            {it.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
