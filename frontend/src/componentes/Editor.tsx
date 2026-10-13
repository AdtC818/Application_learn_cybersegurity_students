import { useId, useRef } from 'react';
import type { UIEvent } from 'react';
import { EJEMPLOS } from '../contenido/ejemplos';

interface Props {
  codigo: string;
  alCambiar: (codigo: string) => void;
  alAnalizar: () => void;
  cargando: boolean;
}

/** Editor de código con números de línea y ejemplos para cargar con un clic. */
export default function Editor({ codigo, alCambiar, alAnalizar, cargando }: Props) {
  const id = useId();
  const numerosRef = useRef<HTMLDivElement>(null);
  const lineas = Math.max(1, codigo.split('\n').length);

  const alDesplazar = (e: UIEvent<HTMLTextAreaElement>) => {
    if (numerosRef.current) numerosRef.current.style.transform = `translateY(${-e.currentTarget.scrollTop}px)`;
  };

  return (
    <section className="lamina editor" aria-labelledby={`${id}-t`}>
      <div className="rotulo">
        <div className="rotulo-celda crece">
          <span className="rotulo-etiqueta">Tu código</span>
          <h2 className="rotulo-valor" id={`${id}-t`}>
            Pega JavaScript o Node.js para analizarlo
          </h2>
        </div>
        <div className="rotulo-celda">
          <span className="rotulo-etiqueta">Líneas</span>
          <span className="rotulo-valor">{lineas}</span>
        </div>
      </div>

      <div className="lamina-cuerpo editor-cuerpo">
        <div className="campo">
          <span className="etiqueta" id={`${id}-ej`}>
            ¿No tienes código a mano? Carga un ejemplo
          </span>
          <div className="chips" role="group" aria-labelledby={`${id}-ej`}>
            {EJEMPLOS.map((e) => (
              <button
                key={e.id}
                type="button"
                className="chip"
                aria-pressed={codigo === e.codigo}
                onClick={() => alCambiar(e.codigo)}
              >
                {e.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div className={`editor-caja${cargando ? ' editor-escaneando' : ''}`}>
          <div className="editor-numeros" aria-hidden="true">
            <div ref={numerosRef}>
              {Array.from({ length: lineas }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          </div>
          <textarea
            className="editor-texto codigo"
            aria-label="Código a analizar"
            value={codigo}
            onChange={(e) => alCambiar(e.target.value)}
            onScroll={alDesplazar}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {cargando && <div className="escaneo" aria-hidden="true" />}
        </div>

        <div className="editor-acciones">
          <button
            type="button"
            className="boton"
            onClick={alAnalizar}
            disabled={cargando || codigo.trim().length === 0}
          >
            {cargando ? 'Analizando…' : 'Analizar código'}
          </button>
          <button
            type="button"
            className="boton boton-fantasma"
            onClick={() => alCambiar('')}
            disabled={cargando || codigo.length === 0}
          >
            Limpiar
          </button>
          <span className="editor-nota">El código se analiza sin ejecutarse: solo se lee su estructura.</span>
        </div>
      </div>
    </section>
  );
}
