import type { ResultadoAnalisis } from '../tipos';

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

interface Props {
  historial: ResultadoAnalisis[];
  cargando: boolean;
  error: string | null;
  alActualizar: () => void;
  alVer: (item: ResultadoAnalisis) => void;
}

export default function Historial({ historial, cargando, error, alActualizar, alVer }: Props) {
  return (
    <section className="lamina historial" aria-labelledby="historial-titulo">
      <div className="rotulo">
        <div className="rotulo-celda crece">
          <span className="rotulo-etiqueta">Guardado en la base de datos</span>
          <h2 className="rotulo-valor" id="historial-titulo">
            Historial de análisis
          </h2>
        </div>
        <div className="rotulo-celda rotulo-accion">
          <button type="button" className="boton boton-fantasma boton-chico" onClick={alActualizar} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <div className="lamina-cuerpo">
        {error && <div className="aviso aviso-info">{error}</div>}

        {!error && !cargando && historial.length === 0 && (
          <p className="vacio">Todavía no has guardado ningún análisis. Analiza un código y pulsa «Guardar en el historial».</p>
        )}

        <ul className="lista-historial">
          {historial.map((item) => (
            <li key={item.id} className="item-historial">
              <div className="item-datos">
                <strong>{item.nombreArchivo || 'Sin nombre'}</strong>
                <span className="item-meta">
                  {formatearFecha(item.creadoEn)}, {item.totalHallazgos} hallazgo(s)
                </span>
              </div>
              <button type="button" className="boton boton-fantasma boton-chico" onClick={() => alVer(item)}>
                Ver
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
