import { useState } from 'react';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena } from '../componentes/Escena';
import { Glifo } from '../componentes/Glifos';
import { Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';

const CLAVE = "sk_live_51Hf8aKq2Zp0Xw93dL";

interface LineaDiff {
  signo: '+' | '-' | ' ';
  texto: string;
  secreto?: boolean;
}

interface ArchivoDiff {
  nombre: string;
  lineas: LineaDiff[];
}

interface Commit {
  hash: string;
  mensaje: string;
  archivos: ArchivoDiff[];
}

const COMMITS: Record<'vulnerable' | 'seguro', Commit[]> = {
  vulnerable: [
    {
      hash: 'a1f93c2',
      mensaje: 'Conectar con la pasarela de pagos',
      archivos: [
        {
          nombre: 'app.js',
          lineas: [
            { signo: '+', texto: `const apiKey = '${CLAVE}';`, secreto: true },
            { signo: '+', texto: 'const pagos = crearPasarela(apiKey);' },
          ],
        },
      ],
    },
    {
      hash: '7be04d1',
      mensaje: 'Quito la clave del código',
      archivos: [
        {
          nombre: 'app.js',
          lineas: [
            { signo: '-', texto: `const apiKey = '${CLAVE}';`, secreto: true },
            { signo: '+', texto: 'const apiKey = process.env.API_KEY;' },
            { signo: ' ', texto: 'const pagos = crearPasarela(apiKey);' },
          ],
        },
      ],
    },
  ],
  seguro: [
    {
      hash: 'c40d8e5',
      mensaje: 'Conectar con la pasarela de pagos',
      archivos: [
        {
          nombre: 'app.js',
          lineas: [
            { signo: '+', texto: 'const apiKey = process.env.API_KEY;' },
            { signo: '+', texto: 'const pagos = crearPasarela(apiKey);' },
          ],
        },
        { nombre: '.gitignore', lineas: [{ signo: '+', texto: '.env' }] },
      ],
    },
  ],
};

const PASOS: Record<'vulnerable' | 'seguro', string[]> = {
  vulnerable: [
    'Escribo la clave en el código y hago commit',
    'Me doy cuenta y la quito (otro commit)',
    'Subo todo a GitHub (git push)',
  ],
  seguro: [
    'Leo la clave de process.env y pongo .env en .gitignore (commit)',
    'Guardo la clave real en el archivo .env de mi computador',
    'Subo todo a GitHub (git push)',
  ],
};

type Vista = 'actual' | 'historial';

function LineaSecreto({ texto }: { texto: string }) {
  const i = texto.indexOf(CLAVE);
  if (i === -1) return <>{texto}</>;
  return (
    <>
      {texto.slice(0, i)}
      <mark className="dato-secreto">{CLAVE}</mark>
      {texto.slice(i + CLAVE.length)}
    </>
  );
}

function DiffCommit({ commit, nuevo, subido }: { commit: Commit; nuevo: boolean; subido: boolean }) {
  return (
    <li className={`git-commit${nuevo ? ' git-commit-nuevo' : ''}`}>
      <span className="git-punto" aria-hidden="true" />
      <div className="git-tarjeta">
        <div className="git-cabecera">
          <code className="git-hash">{commit.hash}</code>
          <strong>{commit.mensaje}</strong>
          {subido && <span className="git-etiqueta">en GitHub</span>}
        </div>
        {commit.archivos.map((a) => (
          <div key={a.nombre} className="git-archivo">
            <div className="git-archivo-nombre">{a.nombre}</div>
            <pre className="git-diff codigo">
              {a.lineas.map((l, i) => (
                <span
                  key={i}
                  className={`git-linea git-linea-${l.signo === '+' ? 'mas' : l.signo === '-' ? 'menos' : 'igual'}${l.secreto ? ' git-linea-secreta' : ''}`}
                >
                  <span className="git-signo">{l.signo}</span>
                  <LineaSecreto texto={l.texto} />
                  {'\n'}
                </span>
              ))}
            </pre>
          </div>
        ))}
      </div>
    </li>
  );
}

function LabSecretosInterno({ modo }: PropsLab) {
  const vulnerable = modo === 'vulnerable';
  const commits = COMMITS[modo];
  const pasos = PASOS[modo];

  const [hechos, setHechos] = useState(0);
  const [vista, setVista] = useState<Vista | null>(null);
  const [accion, setAccion] = useState(0);
  const [ultima, setUltima] = useState<'push' | Vista | null>(null);

  const subido = hechos >= 3;
  const visibles = commits.slice(0, Math.min(hechos, commits.length));
  const commitsVisibles = [...visibles].reverse();

  const avanzar = () => {
    const siguiente = hechos + 1;
    setHechos(siguiente);
    setVista(null);
    if (siguiente === 3) {
      setUltima('push');
      setAccion((n) => n + 1);
    }
  };

  const mirar = (v: Vista) => {
    setVista(v);
    setUltima(v);
    setAccion((n) => n + 1);
  };

  const filtra = vulnerable && vista === 'historial';

  let veredicto: { tipo: 'brecha' | 'aviso' | 'ok' | 'bloqueado'; titulo: string; texto: string } | null = null;
  if (vista === 'actual') {
    veredicto = vulnerable
      ? {
          tipo: 'aviso',
          titulo: 'En el código de hoy no se ve la clave',
          texto: 'Parece resuelto, pero Git guarda cada versión del archivo. Prueba ahora «Revisar el historial».',
        }
      : {
          tipo: 'ok',
          titulo: 'El código solo dice de dónde leer la clave',
          texto: 'process.env.API_KEY no revela nada: el valor no está escrito en ningún archivo del repositorio.',
        };
  } else if (vista === 'historial') {
    veredicto = vulnerable
      ? {
          tipo: 'brecha',
          titulo: 'La clave sigue en el historial',
          texto:
            'Cualquiera que clone el repositorio puede leerla, aunque ya no esté en el archivo. Hay que revocar esa clave en el proveedor y crear una nueva.',
        }
      : {
          tipo: 'bloqueado',
          titulo: 'No hay nada que robar',
          texto: 'La clave real vive en .env, que Git ignora: nunca entró al repositorio.',
        };
  }

  const reinicio = `${modo}-${accion}`;
  const estadoAtaque = filtra ? 'ataque' : 'dato';

  return (
    <div className="lab lab-secretos">
      <div className="lab-fila">
        <div className="lab-controles">
          <ol className="pasos-git" aria-label="Pasos de la historia">
            {pasos.map((texto, i) => {
              const hecho = hechos > i;
              const siguiente = hechos === i;
              return (
                <li key={texto} className={`paso-git${hecho ? ' paso-git-hecho' : ''}`}>
                  <button
                    type="button"
                    className={`boton${siguiente ? '' : ' boton-fantasma'}`}
                    disabled={!siguiente}
                    onClick={avanzar}
                  >
                    <span className="paso-git-num" aria-hidden="true">
                      {hecho ? '✓' : i + 1}
                    </span>
                    {texto}
                  </button>
                </li>
              );
            })}
          </ol>

          {!vulnerable && hechos >= 2 && (
            <div className="archivo-local" role="note">
              <Glifo nombre="candado" tamano={22} />
              <div>
                <strong>.env</strong> <span className="archivo-local-nota">solo en tu computador, Git lo ignora</span>
                <code className="codigo archivo-local-codigo">API_KEY={CLAVE}</code>
              </div>
            </div>
          )}

          {subido && (
            <div className="atacante-acciones">
              <span className="etiqueta">Ahora eres quien clona el repositorio</span>
              <div className="atacante-botones">
                <button
                  type="button"
                  className="boton boton-fantasma"
                  aria-pressed={vista === 'actual'}
                  onClick={() => mirar('actual')}
                >
                  Mirar el código de hoy
                </button>
                <button
                  type="button"
                  className="boton boton-ataque"
                  aria-pressed={vista === 'historial'}
                  onClick={() => mirar('historial')}
                >
                  Revisar el historial
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lab-escena">
          <Escena
            ancho={520}
            alto={215}
            titulo="Tu computador sube los commits a GitHub y otra persona clona el repositorio"
            reinicio={reinicio}
          >
            <Enlace d="M112 88 H208" estado={subido ? 'dato' : 'apagado'} punteada={!subido} />
            <Enlace d="M312 88 H408" estado={vista ? estadoAtaque : 'apagado'} punteada={!vista} />
            <Nodo
              x={70}
              y={88}
              glifo="persona"
              etiqueta="Tu computador"
              sub={`${visibles.length} commit${visibles.length === 1 ? '' : 's'}`}
            />
            <Nodo
              x={260}
              y={88}
              glifo="repo"
              etiqueta="GitHub"
              sub={subido ? `${commits.length} commit${commits.length === 1 ? '' : 's'}` : 'vacío'}
              estado={filtra ? 'ataque' : subido && !vulnerable ? 'defensa' : 'normal'}
            />
            <Nodo
              x={450}
              y={88}
              glifo="atacante"
              etiqueta="Quien clona el repo"
              estado={filtra ? 'ataque' : 'normal'}
            />
            {ultima === 'push' && <Paquete d="M112 88 H208" estado="dato" dur={1} texto={`${commits.length} commits`} />}
            {(ultima === 'actual' || ultima === 'historial') && (
              <>
                <Paquete d="M312 88 H408" estado={estadoAtaque} dur={1} texto={filtra ? CLAVE.slice(0, 11) + '…' : undefined} />
                {veredicto?.tipo === 'brecha' && <Impacto x={450} y={36} tipo="brecha" retardo={1.1} />}
                {veredicto?.tipo === 'bloqueado' && <Impacto x={450} y={36} tipo="bloqueo" retardo={1.1} />}
                {veredicto?.tipo === 'ok' && <Impacto x={450} y={36} tipo="ok" retardo={1.1} />}
              </>
            )}
            <TextoEscena x={260} y={190} estado={vulnerable ? 'ataque' : 'defensa'}>
              {vulnerable ? 'La clave viaja dentro del repositorio' : 'La clave nunca sale de tu computador'}
            </TextoEscena>
          </Escena>
        </div>
      </div>

      <div className="lab-fila lab-fila-igual">
        <div>
          <h4 className="sub sub-corto">Historial de Git (lo más nuevo arriba)</h4>
          {commitsVisibles.length === 0 ? (
            <p className="vacio-lab">Todavía no hay commits. Empieza por el paso 1.</p>
          ) : (
            <ol className="git-historial" aria-label="Commits del repositorio">
              {commitsVisibles.map((c, i) => (
                <DiffCommit
                  key={c.hash}
                  commit={c}
                  nuevo={i === 0 && !subido}
                  subido={subido}
                />
              ))}
            </ol>
          )}
        </div>

        <div className="lab-lecturas">
          {vista ? (
            <Lectura titulo="Terminal de quien clonó el repositorio" estado={filtra ? 'ataque' : 'defensa'}>
              <pre className="terminal">
                <span className="terminal-cmd">$ git clone https://github.com/tu-usuario/tienda.git{'\n'}</span>
                {vista === 'actual' ? (
                  <>
                    <span className="terminal-cmd">$ cat app.js{'\n'}</span>
                    <span>const apiKey = process.env.API_KEY;{'\n'}</span>
                    <span>const pagos = crearPasarela(apiKey);{'\n'}</span>
                    {!vulnerable && (
                      <>
                        <span className="terminal-cmd">$ ls -a{'\n'}</span>
                        <span>.git  .gitignore  app.js  package.json{'\n'}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="terminal-cmd">$ git log -p{'\n'}</span>
                    {commitsVisibles.map((c) => (
                      <span key={c.hash}>
                        <span className="terminal-hash">commit {c.hash}</span>
                        {'\n'}
                        {'    '}
                        {c.mensaje}
                        {'\n'}
                        {c.archivos.flatMap((a) => [
                          <span key={`${c.hash}-${a.nombre}`} className="terminal-archivo">
                            {`--- ${a.nombre}`}
                            {'\n'}
                          </span>,
                          ...a.lineas.map((l, i) => (
                            <span key={`${c.hash}-${a.nombre}-${i}`}>
                              {l.signo} <LineaSecreto texto={l.texto} />
                              {'\n'}
                            </span>
                          )),
                        ])}
                        {'\n'}
                      </span>
                    ))}
                  </>
                )}
              </pre>
            </Lectura>
          ) : (
            <p className="vacio-lab">
              {subido
                ? 'Elige una de las dos acciones para ver qué encuentra quien clona el repositorio.'
                : 'Completa los tres pasos para subir tu trabajo a GitHub.'}
            </p>
          )}
          {veredicto && (
            <Veredicto tipo={veredicto.tipo} titulo={veredicto.titulo}>
              {veredicto.texto}
            </Veredicto>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LabSecretos({ modo }: PropsLab) {
  // Al cambiar de versión se empieza la historia desde cero.
  return <LabSecretosInterno key={modo} modo={modo} />;
}
