import { useId, useMemo, useState, type CSSProperties } from 'react';
import EscenaFlujo from './EscenaFlujo';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import { evaluarExpresion, hacerPing, type ResultadoEval, type ResultadoExec } from './logica/ejecucion';

type Parte = 'exec' | 'eval';

const HOSTS = [
  { etiqueta: 'Host normal', valor: 'ejemplo.com', ayuda: 'Lo que escribiría cualquier persona.' },
  { etiqueta: 'Un comando extra', valor: 'ejemplo.com; whoami', ayuda: 'El punto y coma separa un segundo comando.' },
  { etiqueta: 'Leer archivos', valor: 'ejemplo.com && cat /etc/passwd', ayuda: '&& ejecuta el siguiente si el primero salió bien.' },
  { etiqueta: 'Sustitución', valor: '$(whoami).ejemplo.com', ayuda: '$( ) ejecuta lo de adentro y pega el resultado.' },
  { etiqueta: 'Borrar archivos', valor: 'x; rm -rf /app', ayuda: 'Una orden destructiva (en el laboratorio no se ejecuta nada).' },
];

const FORMULAS = [
  { etiqueta: 'Operación normal', valor: '2 + 3 * 4', ayuda: 'Lo que escribiría cualquier persona.' },
  { etiqueta: 'Variables del servidor', valor: 'process.env', ayuda: 'Accede a las variables de entorno: claves, contraseñas.' },
  { etiqueta: 'Leer un archivo', valor: "require('fs').readFileSync('/etc/passwd')", ayuda: 'Carga el módulo de archivos de Node.' },
  { etiqueta: 'Ejecutar un comando', valor: "require('child_process').execSync('whoami')", ayuda: 'De eval se pasa al sistema operativo.' },
  { etiqueta: 'Bucle infinito', valor: 'while(true){}', ayuda: 'Deja el servidor ocupado para siempre.' },
];

function SelectorParte({ parte, alCambiar }: { parte: Parte; alCambiar: (p: Parte) => void }) {
  return (
    <div className="alternador alternador-neutro" role="group" aria-label="Qué función peligrosa probar">
      <button type="button" className="alternador-opcion" aria-pressed={parte === 'exec'} onClick={() => alCambiar('exec')}>
        exec: ejecutar un comando
      </button>
      <button type="button" className="alternador-opcion" aria-pressed={parte === 'eval'} onClick={() => alCambiar('eval')}>
        eval: ejecutar código
      </button>
    </div>
  );
}

/* ---------- exec ---------- */

function PruebaExec({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [host, setHost] = useState(HOSTS[0].valor);
  const [pedido, setPedido] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [elegido, setElegido] = useState<number | null>(0);

  const lanzar = (valor: string) => {
    setPedido(valor);
    setEnvios((n) => n + 1);
  };

  const r: ResultadoExec | null = useMemo(() => (pedido === null ? null : hacerPing(pedido, modo)), [pedido, modo]);

  const colados = r?.tipo === 'ejecutado' ? r.comandos.filter((c) => c.colado) : [];
  const ataque = colados.length > 0 || r?.tipo === 'rechazado';
  const hayInyeccion = colados.length > 0;

  let veredicto: { tipo: 'brecha' | 'bloqueado' | 'ok'; titulo: string; texto: string } | null = null;
  if (r) {
    if (r.tipo === 'rechazado') {
      veredicto = { tipo: 'bloqueado', titulo: 'Ataque bloqueado antes de ejecutar nada', texto: r.motivo };
    } else if (hayInyeccion) {
      veredicto = {
        tipo: 'brecha',
        titulo: `Se ejecutaron ${colados.length} comando${colados.length === 1 ? '' : 's'} que tú no escribiste`,
        texto: 'El shell no distingue entre tu comando y lo que se coló: ejecuta todo con los permisos de tu servidor.',
      };
    } else {
      veredicto = {
        tipo: 'ok',
        titulo: 'Un solo comando, el que esperabas',
        texto: vulnerable ? 'Esta vez no se coló nada.' : 'El host se pasó como argumento, nunca como parte de una línea de shell.',
      };
    }
  }

  return (
    <div className="lab-parte">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegido(null);
            lanzar(host);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-h`}>Host al que hacer ping</label>
            <input
              id={`${id}-h`}
              className="entrada"
              value={host}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setHost(e.target.value)}
            />
          </div>
          <button type="submit" className="boton">
            Hacer ping
          </button>
          <FilaChips
            titulo="O prueba un ataque con un clic"
            items={HOSTS.map((h) => ({ etiqueta: h.etiqueta, ayuda: h.ayuda }))}
            activo={elegido}
            alElegir={(i) => {
              setElegido(i);
              setHost(HOSTS[i].valor);
              lanzar(HOSTS[i].valor);
            }}
          />
        </form>

        <div className="lab-escena">
          <EscenaFlujo
            titulo="El host viaja a tu servidor, que lo pega en una línea de comandos y se la da al shell"
            envios={pedido === null ? 0 : envios * 2 + (vulnerable ? 0 : 1)}
            izquierda={{ glifo: hayInyeccion ? 'atacante' : 'persona', etiqueta: 'Quien escribe el host' }}
            centro={{
              glifo: 'servidor',
              etiqueta: 'Tu servidor',
              sub: vulnerable ? "exec('ping ' + host)" : "execFile('ping', [host])",
              estado: r?.tipo === 'rechazado' ? 'defensa' : 'normal',
            }}
            derecha={{ glifo: 'terminal', etiqueta: 'Shell del servidor', sub: 'ejecuta órdenes' }}
            ataque={ataque}
            frenaEnCentro={r?.tipo === 'rechazado'}
            resultado={veredicto?.tipo ?? null}
            carga={ataque ? '; whoami' : undefined}
            nota={vulnerable ? 'Todo el texto llega al shell como una sola línea' : 'El host viaja como argumento, separado'}
            notaEstado={vulnerable ? 'ataque' : 'defensa'}
          />
        </div>
      </div>

      {r && veredicto && (
        <div className="lab-fila lab-fila-igual">
          <div className="lab-lecturas">
            {vulnerable ? (
              <Lectura titulo="La línea que recibe el shell" estado={hayInyeccion ? 'ataque' : 'dato'}>
                <div className="consulta">
                  ping -c 1{' '}
                  <span className={hayInyeccion ? 'cons-inyectado' : 'cons-entrada'}>{pedido}</span>
                </div>
                <div className="leyenda">
                  <span className="leyenda-item">
                    <i className="muestra muestra-entrada" /> lo que escribiste
                  </span>
                  <span className="leyenda-item">
                    <i className="muestra muestra-inyectado" /> se volvió una orden más
                  </span>
                </div>
              </Lectura>
            ) : (
              <Lectura titulo="Lo que recibe el sistema operativo" estado="defensa">
                <div className="consulta">
                  execFile(<span className="cons-entrada">&apos;ping&apos;</span>, [
                </div>
                <div className="argumentos">
                  {['-c', '1', pedido ?? ''].map((a, i) => (
                    <span key={i} className={i === 2 ? 'argumento argumento-usuario' : 'argumento'}>
                      {JSON.stringify(a)}
                    </span>
                  ))}
                </div>
                <div className="consulta">])</div>
                <div className="leyenda">
                  <span className="leyenda-item">Cada argumento va por separado: un «;» es solo una letra.</span>
                </div>
              </Lectura>
            )}
            <Veredicto tipo={veredicto.tipo} titulo={veredicto.titulo}>
              {veredicto.texto}
            </Veredicto>
          </div>

          <div>
            {r.tipo === 'ejecutado' ? (
              <>
                <h4 className="sub sub-corto">
                  {vulnerable ? `El shell la lee como ${r.comandos.length} comando${r.comandos.length === 1 ? '' : 's'}` : 'Lo que se ejecuta'}
                </h4>
                <ol key={`${envios}-${modo}`} className="cmd-lista">
                  {r.comandos.map((c, i) => (
                    <li
                      key={i}
                      className={`cmd${c.colado ? ' cmd-colado' : ''}`}
                      style={{ '--i': i } as CSSProperties}
                    >
                      <div className="cmd-linea">
                        <code className="codigo">$ {c.texto}</code>
                        <span className="cmd-etiqueta">{c.colado ? 'colado' : 'el que querías'}</span>
                      </div>
                      <div className="cmd-salida">{c.salida}</div>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="vacio-lab">No se ejecutó ningún comando.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- eval ---------- */

function PruebaEval({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [formula, setFormula] = useState(FORMULAS[0].valor);
  const [pedida, setPedida] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [elegida, setElegida] = useState<number | null>(0);

  const lanzar = (valor: string) => {
    setPedida(valor);
    setEnvios((n) => n + 1);
  };

  const r: ResultadoEval | null = useMemo(() => (pedida === null ? null : evaluarExpresion(pedida, modo)), [pedida, modo]);

  const codigo = r?.tipo === 'codigo';
  const rechazado = r?.tipo === 'rechazado';
  const ataque = codigo || rechazado;
  const resultadoEscena = codigo ? 'brecha' : rechazado ? 'bloqueado' : r ? 'ok' : null;

  return (
    <div className="lab-parte">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegida(null);
            lanzar(formula);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-f`}>Operación para la calculadora</label>
            <input
              id={`${id}-f`}
              className="entrada"
              value={formula}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setFormula(e.target.value)}
            />
          </div>
          <button type="submit" className="boton">
            Calcular
          </button>
          <FilaChips
            titulo="O prueba un ataque con un clic"
            items={FORMULAS.map((f) => ({ etiqueta: f.etiqueta, ayuda: f.ayuda }))}
            activo={elegida}
            alElegir={(i) => {
              setElegida(i);
              setFormula(FORMULAS[i].valor);
              lanzar(FORMULAS[i].valor);
            }}
          />
        </form>

        <div className="lab-escena">
          <EscenaFlujo
            titulo="La operación viaja a tu servidor, que se la entrega al motor de JavaScript"
            envios={pedida === null ? 0 : envios * 2 + (vulnerable ? 0 : 1)}
            izquierda={{ glifo: codigo ? 'atacante' : 'persona', etiqueta: 'Quien escribe la operación' }}
            centro={{
              glifo: 'servidor',
              etiqueta: 'Tu servidor',
              sub: vulnerable ? 'eval(formula)' : 'calcular(formula)',
              estado: rechazado ? 'defensa' : 'normal',
            }}
            derecha={{ glifo: 'terminal', etiqueta: 'Motor de JavaScript', sub: 'con tus permisos' }}
            ataque={ataque}
            frenaEnCentro={rechazado}
            resultado={resultadoEscena}
            carga={codigo ? 'process.env' : undefined}
            nota={vulnerable ? 'El texto se ejecuta como programa' : 'Solo se aceptan números y operadores'}
            notaEstado={vulnerable ? 'ataque' : 'defensa'}
          />
        </div>
      </div>

      {r && (
        <div className="lab-fila lab-fila-igual">
          <div className="lab-lecturas">
            <Lectura titulo="Lo que hace el servidor con ese texto" estado={codigo ? 'ataque' : rechazado ? 'defensa' : 'dato'}>
              {vulnerable ? (
                <div className="consulta">
                  eval(<span className={codigo ? 'cons-inyectado' : 'cons-entrada'}>{pedida}</span>)
                </div>
              ) : (
                <div className="consulta">
                  calcular(<span className="cons-entrada">{pedida}</span>)
                </div>
              )}
            </Lectura>
            {r.tipo === 'numero' && (
              <Veredicto tipo="ok" titulo={`Resultado: ${r.valor}`}>
                Una operación normal funciona igual en las dos versiones.
              </Veredicto>
            )}
            {r.tipo === 'codigo' && (
              <Veredicto tipo="brecha" titulo="Tu servidor ejecutaría código de otra persona">
                En este laboratorio no se ejecuta nada de verdad; esto es lo que haría una aplicación real.
              </Veredicto>
            )}
            {r.tipo === 'rechazado' && (
              <Veredicto tipo="bloqueado" titulo="Ataque bloqueado">
                {r.motivo}
              </Veredicto>
            )}
          </div>

          {r.tipo === 'codigo' && (
            <div>
              <h4 className="sub sub-corto">Lo que conseguiría con ese texto</h4>
              <ul className="hallazgos-lista">
                {r.hallazgos.map((h) => (
                  <li key={h}>
                    <span aria-hidden="true">✖</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LabEjecucionInterno({ modo }: PropsLab) {
  const [parte, setParte] = useState<Parte>('exec');
  return (
    <div className="lab lab-ejecucion">
      <SelectorParte parte={parte} alCambiar={setParte} />
      {parte === 'exec' ? <PruebaExec modo={modo} /> : <PruebaEval modo={modo} />}
    </div>
  );
}

export default function LabEjecucion({ modo }: PropsLab) {
  return <LabEjecucionInterno key={modo} modo={modo} />;
}
