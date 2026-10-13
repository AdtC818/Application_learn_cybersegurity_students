import { CATALOGO, NOMBRE_SEVERIDAD, infoDeSlug } from '../contenido/catalogo';
import { useProgreso } from '../hooks/useProgreso';
import { Glifo } from './Glifos';
import PanelAprendizaje from './PanelAprendizaje';

/** Índice de los 12 laboratorios. */
export function GaleriaLaboratorios() {
  const { completados, reiniciarProgreso } = useProgreso();

  return (
    <section className="vista" aria-labelledby="galeria-titulo">
      <header className="vista-titulo">
        <h1 id="galeria-titulo">Los 12 laboratorios</h1>
        <p>
          En cada uno atacas un código vulnerable de mentira, ves por qué funciona, lo arreglas y te pones a prueba.
          No necesitas escribir nada para empezar.
        </p>
        <p className="vista-progreso">
          Completados: <b>{completados.size}</b> de {CATALOGO.length}
          {completados.size > 0 && (
            <button type="button" className="enlace-boton" onClick={reiniciarProgreso}>
              Empezar de nuevo
            </button>
          )}
        </p>
      </header>

      <ul className="galeria">
        {CATALOGO.map((c) => {
          const hecho = completados.has(c.tipo);
          return (
            <li key={c.tipo}>
              <a className={`lamina ficha${hecho ? ' ficha-hecha' : ''}`} href={`#/labs/${c.slug}`}>
                <span className="ficha-simbolo">
                  <Glifo nombre={c.glifo} tamano={34} />
                </span>
                <span className="ficha-texto">
                  <strong className="ficha-nombre">{c.nombre}</strong>
                  <span className="ficha-gancho">{c.gancho}</span>
                  <span className="ficha-pie">
                    <span className="sev" data-nivel={c.severidad}>
                      {NOMBRE_SEVERIDAD[c.severidad]}
                    </span>
                    <span className={`ficha-estado${hecho ? ' ficha-estado-hecho' : ''}`}>
                      {hecho ? 'Completado' : 'Pendiente'}
                    </span>
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Un laboratorio en su propia página (#/labs/sql). */
export function VistaLaboratorio({ slug }: { slug: string }) {
  const info = infoDeSlug(slug);
  const { completados } = useProgreso();

  if (!info) {
    return (
      <section className="vista">
        <div className="aviso aviso-info">
          No existe un laboratorio llamado «{slug}». <a href="#/labs">Ver todos los laboratorios</a>.
        </div>
      </section>
    );
  }

  const hecho = completados.has(info.tipo);

  return (
    <section className="vista" aria-labelledby="lab-titulo">
      <a className="volver" href="#/labs">
        Volver a los laboratorios
      </a>
      <div className="lamina vista-lab">
        <div className="rotulo">
          <div className="rotulo-celda crece">
            <span className="rotulo-etiqueta">Laboratorio</span>
            <h1 className="rotulo-valor lab-nombre" id="lab-titulo">
              <Glifo nombre={info.glifo} tamano={26} />
              {info.nombre}
            </h1>
          </div>
          <div className="rotulo-celda">
            <span className="rotulo-etiqueta">Severidad habitual</span>
            <span className="rotulo-valor sev" data-nivel={info.severidad}>
              {NOMBRE_SEVERIDAD[info.severidad]}
            </span>
          </div>
          <div className="rotulo-celda">
            <span className="rotulo-etiqueta">Estado</span>
            <span className="rotulo-valor">{hecho ? 'Completado' : 'Pendiente'}</span>
          </div>
        </div>
        <div className="lamina-cuerpo">
          {/* key: al cambiar de laboratorio se reinicia todo el panel */}
          <PanelAprendizaje key={info.tipo} tipo={info.tipo} />
        </div>
      </div>
    </section>
  );
}
