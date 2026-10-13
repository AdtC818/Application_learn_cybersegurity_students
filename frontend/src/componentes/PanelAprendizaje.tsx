import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Hallazgo } from '../tipos';
import { infoDeTipo, type TipoVuln } from '../contenido/catalogo';
import { contenidoDe } from '../labs/indice';
import type { ContenidoLab, Modo, PasoFlujo } from '../labs/tipos';
import { AlternadorModo } from '../labs/piezas';
import { useProgreso } from '../hooks/useProgreso';
import { BloqueCodigo, type MarcaLinea } from './Codigo';
import { Glifo } from './Glifos';

const ETAPAS = ['Entiende', 'Ataca', 'Arregla', 'Demuestra'] as const;

function marcasDe(lineas: number[], notas: Record<number, string>, color: MarcaLinea): Record<number, MarcaLinea> {
  const marcas: Record<number, MarcaLinea> = {};
  for (const n of Object.keys(notas)) marcas[Number(n)] = 'dato';
  for (const n of lineas) marcas[n] = color;
  return marcas;
}

/* ---------- Etapa 1: la historia en tres pasos ---------- */

function FlujoTres({ pasos }: { pasos: [PasoFlujo, PasoFlujo, PasoFlujo] }) {
  return (
    <ol className="flujo" aria-label="Cómo ocurre, en tres pasos">
      {pasos.map((p, i) => (
        <li key={p.titulo} className={`flujo-paso flujo-paso-${i}`}>
          <span className="flujo-icono">
            <Glifo nombre={p.glifo} tamano={34} />
          </span>
          <strong>{p.titulo}</strong>
          <span className="flujo-texto">{p.texto}</span>
          {i < pasos.length - 1 && (
            <svg className="flujo-flecha" viewBox="0 0 40 16" aria-hidden="true">
              <path d="M2 8h32M28 2l8 6-8 6" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Etapa 3: comparación ---------- */

function CodigoComparado({ contenido }: { contenido: ContenidoLab }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contenido.codigoSeguro);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* sin permiso para el portapapeles: no pasa nada */
    }
  };

  return (
    <div className="comparado">
      <section className="comparado-lado comparado-mal" aria-label="Versión vulnerable">
        <h4 className="comparado-titulo">
          <Glifo nombre="atacante" tamano={20} />
          Vulnerable
        </h4>
        <BloqueCodigo
          codigo={contenido.codigoVulnerable}
          marcas={marcasDe(contenido.lineasVulnerables, contenido.notasVulnerable, 'ataque')}
          notas={contenido.notasVulnerable}
          etiqueta="Código vulnerable"
        />
      </section>
      <section className="comparado-lado comparado-bien" aria-label="Versión segura">
        <h4 className="comparado-titulo">
          <Glifo nombre="escudo" tamano={20} />
          Seguro
          <button type="button" className="boton boton-fantasma boton-chico comparado-copiar" onClick={copiar}>
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </h4>
        <BloqueCodigo
          codigo={contenido.codigoSeguro}
          marcas={marcasDe(contenido.lineasSeguras, contenido.notasSeguro, 'defensa')}
          notas={contenido.notasSeguro}
          etiqueta="Código seguro"
        />
      </section>
    </div>
  );
}

/* ---------- Etapa 4: el reto ---------- */

function RetoVista({
  contenido,
  completado,
  alAcertar,
}: {
  contenido: ContenidoLab;
  completado: boolean;
  alAcertar: () => void;
}) {
  const { reto } = contenido;
  const [elegida, setElegida] = useState<number | null>(null);

  const elegir = (i: number) => {
    setElegida(i);
    if (i === reto.correcta) alAcertar();
  };

  const acierto = elegida === reto.correcta;

  return (
    <div className="reto">
      <p className="reto-pregunta">{reto.pregunta}</p>
      <div className="reto-opciones" role="group" aria-label="Opciones">
        {reto.opciones.map((o, i) => {
          const estado = elegida === i ? (i === reto.correcta ? 'bien' : 'mal') : '';
          return (
            <button
              key={i}
              type="button"
              className={`reto-opcion ${estado}`}
              aria-pressed={elegida === i}
              onClick={() => elegir(i)}
            >
              <span className="reto-letra" aria-hidden="true">
                {'ABC'[i]}
              </span>
              <span className="reto-contenido">
                <code className="codigo reto-codigo">{o.codigo}</code>
                {elegida === i && (
                  <span className="reto-comentario" role="status">
                    <strong>{i === reto.correcta ? 'Correcto. ' : 'Todavía no. '}</strong>
                    {o.comentario}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {elegida !== null && !acierto && <p className="reto-pista">Prueba con otra opción.</p>}
      {(acierto || completado) && (
        <div className="reto-regla">
          <Glifo nombre="escudo" tamano={22} />
          <span>
            <strong>Para llevarte: </strong>
            {contenido.regla}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Panel completo ---------- */

interface Props {
  tipo: TipoVuln | string;
  /** Si el estudiante llegó desde un análisis, se muestra lo que dijo el detector. */
  hallazgo?: Hallazgo;
}

export default function PanelAprendizaje({ tipo, hallazgo }: Props) {
  const idBase = useId();
  const contenido = contenidoDe(tipo);
  const info = infoDeTipo(tipo);
  const { completados, marcarCompletado } = useProgreso();

  const [etapa, setEtapa] = useState(0);
  const [visitadas, setVisitadas] = useState<Set<number>>(new Set([0]));
  const [modo, setModo] = useState<Modo>('vulnerable');
  const [recien, setRecien] = useState(false);
  const refsTab = useRef<Array<HTMLButtonElement | null>>([]);

  if (!contenido || !info) {
    return <div className="aviso aviso-info">Este laboratorio todavía no está disponible.</div>;
  }

  const completado = completados.has(contenido.tipo);

  const ir = (i: number) => {
    setEtapa(i);
    setVisitadas((v) => new Set(v).add(i));
  };

  const alTeclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let destino = i;
    if (e.key === 'ArrowRight') destino = (i + 1) % ETAPAS.length;
    else if (e.key === 'ArrowLeft') destino = (i + ETAPAS.length - 1) % ETAPAS.length;
    else if (e.key === 'Home') destino = 0;
    else if (e.key === 'End') destino = ETAPAS.length - 1;
    else return;
    e.preventDefault();
    ir(destino);
    refsTab.current[destino]?.focus();
  };

  const Laboratorio = contenido.Laboratorio;

  return (
    <div className="aprendizaje">
      {(completado || recien) && (
        <div className={`sello${recien ? ' sello-nuevo' : ''}`} aria-label="Laboratorio completado">
          <Glifo nombre="escudo" tamano={20} />
          Laboratorio completado
        </div>
      )}

      <div className="etapas" role="tablist" aria-label="Etapas del laboratorio">
        {ETAPAS.map((nombre, i) => (
          <button
            key={nombre}
            ref={(el) => {
              refsTab.current[i] = el;
            }}
            id={`${idBase}-tab-${i}`}
            role="tab"
            type="button"
            className={`etapa${etapa === i ? ' etapa-activa' : ''}${visitadas.has(i) && etapa !== i ? ' etapa-hecha' : ''}`}
            aria-selected={etapa === i}
            aria-controls={`${idBase}-panel-${i}`}
            tabIndex={etapa === i ? 0 : -1}
            onClick={() => ir(i)}
            onKeyDown={(e) => alTeclado(e, i)}
          >
            <span className="etapa-num" aria-hidden="true">
              {visitadas.has(i) && etapa !== i ? '✓' : i + 1}
            </span>
            {nombre}
          </button>
        ))}
      </div>

      <div
        id={`${idBase}-panel-${etapa}`}
        role="tabpanel"
        aria-labelledby={`${idBase}-tab-${etapa}`}
        className="etapa-panel"
      >
        {etapa === 0 && (
          <div className="etapa-entiende">
            <p className="gancho">{info.gancho}</p>
            <FlujoTres pasos={contenido.flujo} />
            <h4 className="sub">El recorrido del dato en el código</h4>
            <BloqueCodigo
              codigo={contenido.codigoVulnerable}
              marcas={marcasDe(contenido.lineasVulnerables, contenido.notasVulnerable, 'ataque')}
              notas={contenido.notasVulnerable}
              etiqueta="Código vulnerable con notas"
            />
            {hallazgo && (
              <details className="detalle-analisis">
                <summary>Lo que dijo el análisis de tu código</summary>
                <p>{hallazgo.explicacion}</p>
                <p>
                  <strong>Recomendación: </strong>
                  {hallazgo.recomendacion}
                </p>
              </details>
            )}
            <div className="etapa-pie">
              <button type="button" className="boton boton-ataque" onClick={() => ir(1)}>
                Probar el ataque
              </button>
            </div>
          </div>
        )}

        {etapa === 1 && (
          <div className="etapa-ataca">
            <div className="etapa-barra">
              <AlternadorModo modo={modo} alCambiar={setModo} />
              <p className="etapa-ayuda">
                Haz lo mismo en las dos versiones y compara qué cambia.
              </p>
            </div>
            <Laboratorio modo={modo} />
            <div className="etapa-pie">
              <button type="button" className="boton boton-defensa" onClick={() => ir(2)}>
                Ver cómo se arregla
              </button>
            </div>
          </div>
        )}

        {etapa === 2 && (
          <div className="etapa-arregla">
            <CodigoComparado contenido={contenido} />
            <div className="regla">
              <Glifo nombre="escudo" tamano={22} />
              <span>{contenido.regla}</span>
            </div>
            <div className="etapa-pie">
              <button type="button" className="boton" onClick={() => ir(3)}>
                Ponerme a prueba
              </button>
            </div>
          </div>
        )}

        {etapa === 3 && (
          <RetoVista
            contenido={contenido}
            completado={completado}
            alAcertar={() => {
              if (!completado) setRecien(true);
              marcarCompletado(contenido.tipo);
            }}
          />
        )}
      </div>
    </div>
  );
}
