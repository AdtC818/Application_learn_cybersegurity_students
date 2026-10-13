import LabSql from '../labs/LabSql';

/** Portada: un login de verdad que se puede romper escribiendo en él. */
export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-titulo">
      <div className="hero-texto">
        <h1 id="hero-titulo">Rompe este login.</h1>
        <p className="hero-sub">
          Escribe en el formulario y mira cómo cambia la consulta que recibe la base de datos. Después aprende, con
          laboratorios que puedes tocar, a evitar este y otros once errores comunes de seguridad.
        </p>
        <div className="hero-acciones">
          <a className="boton" href="#analizador" onClick={irAlAnalizador}>
            Analizar mi código
          </a>
          <a className="boton boton-fantasma" href="#/labs">
            Ver los 12 laboratorios
          </a>
        </div>
      </div>

      <div className="lamina hero-demo">
        <div className="rotulo">
          <div className="rotulo-celda crece">
            <span className="rotulo-etiqueta">Pantalla de inicio de sesión</span>
            <span className="rotulo-valor">Tienda en línea</span>
          </div>
          <div className="rotulo-celda">
            <span className="rotulo-etiqueta">Versión</span>
            <span className="rotulo-valor sev" data-nivel="CRITICA">
              Vulnerable
            </span>
          </div>
        </div>
        <div className="lamina-cuerpo">
          <LabSql modo="vulnerable" compacto />
        </div>
      </div>
    </section>
  );
}

function irAlAnalizador(e: React.MouseEvent<HTMLAnchorElement>) {
  // El hash se usa para las rutas, así que el desplazamiento se hace a mano.
  e.preventDefault();
  document.getElementById('analizador')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
