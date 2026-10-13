import { CATALOGO } from '../contenido/catalogo';
import type { Ruta } from '../hooks/useRuta';
import { useProgreso } from '../hooks/useProgreso';

function Marca() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
      <path
        d="M16 2.500l11 4v9c0 7-4.500 11.500-11 14.500C9.500 27 5 22.500 5 15.500v-9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9.500 15h13" stroke="var(--ataque)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="15" r="3.200" fill="var(--lamina)" stroke="var(--defensa)" strokeWidth="2" />
    </svg>
  );
}

export default function Encabezado({ ruta }: { ruta: Ruta }) {
  const { completados } = useProgreso();
  const enLabs = ruta.vista === 'labs' || ruta.vista === 'lab';

  return (
    <header className="encabezado">
      <div className="encabezado-interior">
        <a href="#/" className="marca">
          <Marca />
          <span>Laboratorio de vulnerabilidades</span>
        </a>
        <nav aria-label="Principal" className="nav">
          <a href="#/" className="nav-enlace" aria-current={ruta.vista === 'analizar' ? 'page' : undefined}>
            Analizar código
          </a>
          <a href="#/labs" className="nav-enlace" aria-current={enLabs ? 'page' : undefined}>
            Laboratorios
            <span className="nav-progreso" title="Laboratorios completados">
              {completados.size}/{CATALOGO.length}
            </span>
          </a>
        </nav>
      </div>
    </header>
  );
}
