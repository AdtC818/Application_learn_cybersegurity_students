import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Hallazgo, ResultadoAnalisis, Severidad } from '../tipos';
import { NOMBRE_SEVERIDAD, ORDEN_SEVERIDAD, infoDeTipo, ordenarPorGravedad } from '../contenido/catalogo';
import { BloqueCodigo, type MarcaLinea } from './Codigo';
import { Glifo } from './Glifos';
import PanelAprendizaje from './PanelAprendizaje';

const MARCA_POR_SEVERIDAD: Record<Severidad, MarcaLinea> = {
  CRITICA: 'ataque',
  ALTA: 'ataque',
  MEDIA: 'aviso',
  BAJA: 'dato',
};

/* ---------- Resumen: barra segmentada por severidad ---------- */

function ResumenSeveridad({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const cuenta: Record<Severidad, number> = { CRITICA: 0, ALTA: 0, MEDIA: 0, BAJA: 0 };
  for (const h of hallazgos) cuenta[h.severidad] += 1;
  const total = hallazgos.length;

  return (
    <div className="resumen">
      <div
        className="resumen-barra"
        role="img"
        aria-label={ORDEN_SEVERIDAD.map((s) => `${cuenta[s]} ${NOMBRE_SEVERIDAD[s].toLowerCase()}`).join(', ')}
      >
        {ORDEN_SEVERIDAD.filter((s) => cuenta[s] > 0).map((s) => (
          <span
            key={s}
            className="resumen-segmento"
            data-nivel={s}
            style={{ flexGrow: cuenta[s] }}
            title={`${cuenta[s]} de severidad ${NOMBRE_SEVERIDAD[s].toLowerCase()}`}
          />
        ))}
      </div>
      <ul className="resumen-leyenda">
        {ORDEN_SEVERIDAD.map((s) => (
          <li key={s} className={cuenta[s] === 0 ? 'resumen-vacio' : ''}>
            <span className="sev" data-nivel={s}>
              {NOMBRE_SEVERIDAD[s]}
            </span>
            <b>{cuenta[s]}</b>
          </li>
        ))}
      </ul>
      <span className="solo-lectores">{total} hallazgos en total</span>
    </div>
  );
}

/* ---------- Tarjeta de un hallazgo ---------- */

interface PropsTarjeta {
  hallazgo: Hallazgo;
  indice: number;
  abierta: boolean;
  alAlternar: () => void;
}

function TarjetaHallazgo({ hallazgo, indice, abierta, alAlternar }: PropsTarjeta) {
  const id = useId();
  const info = infoDeTipo(hallazgo.tipo);
  const nombre = info?.nombre ?? hallazgo.tipo;

  return (
    <article className="lamina tarjeta" id={`hallazgo-${indice}`} aria-labelledby={`${id}-t`}>
      <div className="rotulo">
        <div className="rotulo-celda crece">
          <span className="rotulo-etiqueta">Vulnerabilidad</span>
          <h3 className="rotulo-valor tarjeta-nombre" id={`${id}-t`}>
            {info && <Glifo nombre={info.glifo} tamano={22} />}
            {nombre}
          </h3>
        </div>
        <div className="rotulo-celda">
          <span className="rotulo-etiqueta">Severidad</span>
          <span className="rotulo-valor sev" data-nivel={hallazgo.severidad}>
            {NOMBRE_SEVERIDAD[hallazgo.severidad]}
          </span>
        </div>
        <div className="rotulo-celda">
          <span className="rotulo-etiqueta">Línea</span>
          <span className="rotulo-valor">{hallazgo.linea}</span>
        </div>
      </div>

      <div className="lamina-cuerpo">
        <BloqueCodigo
          codigo={hallazgo.codigoFragmento}
          desde={hallazgo.linea}
          marcas={{ [hallazgo.linea]: MARCA_POR_SEVERIDAD[hallazgo.severidad] }}
          etiqueta="Línea con el problema"
        />
        {info && <p className="tarjeta-gancho">{info.gancho}</p>}
        <button
          type="button"
          className={`boton ${abierta ? 'boton-fantasma' : ''}`}
          aria-expanded={abierta}
          onClick={alAlternar}
        >
          {abierta ? 'Cerrar el laboratorio' : 'Aprender con un laboratorio'}
        </button>
      </div>

      {abierta && (
        <div className="tarjeta-lab">
          <PanelAprendizaje tipo={hallazgo.tipo} hallazgo={hallazgo} />
        </div>
      )}
    </article>
  );
}

/* ---------- Guardar en el historial ---------- */

interface PropsGuardar {
  resultado: ResultadoAnalisis;
  nombre: string;
  alCambiarNombre: (nombre: string) => void;
  guardando: boolean;
  error: string | null;
  alGuardar: (evento: FormEvent) => void;
}

function PanelGuardar({ resultado, nombre, alCambiarNombre, guardando, error, alGuardar }: PropsGuardar) {
  const id = useId();
  if (resultado.id) {
    return (
      <div className="aviso aviso-ok panel-guardar-ok">
        Guardado en el historial
        {resultado.nombreArchivo ? ` como "${resultado.nombreArchivo}"` : ''}.
      </div>
    );
  }

  return (
    <form className="panel-guardar" onSubmit={alGuardar}>
      <div className="campo panel-guardar-campo">
        <label htmlFor={id}>Nombre para este análisis (opcional)</label>
        <input
          id={id}
          className="entrada"
          type="text"
          maxLength={120}
          value={nombre}
          onChange={(e) => alCambiarNombre(e.target.value)}
          placeholder="Ej: Login del proyecto de Node"
        />
      </div>
      <button type="submit" className="boton boton-fantasma" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar en el historial'}
      </button>
      <p className="panel-guardar-ayuda">Se guarda el código que acabas de analizar, junto con sus resultados.</p>
      {error && <div className="aviso aviso-error panel-guardar-error">{error}</div>}
    </form>
  );
}

/* ---------- Resultados completos ---------- */

interface PropsResultados extends Omit<PropsGuardar, 'resultado'> {
  resultado: ResultadoAnalisis;
}

export default function Resultados({ resultado, ...guardar }: PropsResultados) {
  const [abierta, setAbierta] = useState<number | null>(resultado.hallazgos.length > 0 ? 0 : null);
  // Lo más grave primero: es lo que conviene aprender antes.
  const hallazgos = useMemo(() => ordenarPorGravedad(resultado.hallazgos), [resultado.hallazgos]);

  const marcas: Record<number, MarcaLinea> = {};
  for (const h of hallazgos) {
    const actual = marcas[h.linea];
    const nueva = MARCA_POR_SEVERIDAD[h.severidad];
    if (!actual || nueva === 'ataque') marcas[h.linea] = nueva;
  }

  const irAlHallazgo = (linea: number) => {
    const indice = hallazgos.findIndex((h) => h.linea === linea);
    if (indice === -1) return;
    setAbierta(indice);
    window.setTimeout(() => {
      document.getElementById(`hallazgo-${indice}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  };

  if (hallazgos.length === 0) {
    return (
      <section className="resultados" aria-live="polite">
        <div className="lamina">
          <div className="lamina-cuerpo sin-hallazgos">
            <Glifo nombre="escudo" tamano={44} />
            <div>
              <h2>No se encontraron vulnerabilidades conocidas en este código</h2>
              <p>
                Esto no prueba que sea seguro: el análisis solo busca 12 patrones. Explora los laboratorios para ver
                qué otros problemas existen.
              </p>
              <a className="boton boton-fantasma" href="#/labs">
                Ver los laboratorios
              </a>
            </div>
          </div>
        </div>
        <PanelGuardar resultado={resultado} {...guardar} />
      </section>
    );
  }

  return (
    <section className="resultados" aria-live="polite">
      <div className="resultados-cabecera">
        <h2>
          {hallazgos.length === 1
            ? 'Se encontró 1 posible vulnerabilidad'
            : `Se encontraron ${hallazgos.length} posibles vulnerabilidades`}
        </h2>
        <ResumenSeveridad hallazgos={hallazgos} />
      </div>

      <div className="lamina visor">
        <div className="rotulo">
          <div className="rotulo-celda crece">
            <span className="rotulo-etiqueta">Mapa de tu código</span>
            <span className="rotulo-valor">Pulsa una línea marcada para ir a su laboratorio</span>
          </div>
        </div>
        <div className="visor-cuerpo">
          <BloqueCodigo
            codigo={resultado.codigoFuente}
            marcas={marcas}
            alPulsarLinea={irAlHallazgo}
            etiqueta="Tu código con las líneas problemáticas marcadas"
          />
        </div>
      </div>

      <PanelGuardar resultado={resultado} {...guardar} />

      <div className="tarjetas">
        {hallazgos.map((h, i) => (
          <TarjetaHallazgo
            key={`${h.tipo}-${h.linea}-${i}`}
            hallazgo={h}
            indice={i}
            abierta={abierta === i}
            alAlternar={() => setAbierta(abierta === i ? null : i)}
          />
        ))}
      </div>
    </section>
  );
}
