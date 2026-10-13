import { useMemo, useState } from 'react';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena } from '../componentes/Escena';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  OPCIONES_CORS,
  ORIGEN_ATACANTE,
  ORIGEN_LEGITIMO,
  evaluarCors,
  type ConfigCors,
} from './logica/cors';

const API = 'https://api.banco.example/mi-cuenta';

type Origen = 'legitimo' | 'atacante';

const ORIGENES: Array<{ id: Origen; etiqueta: string; url: string; ayuda: string }> = [
  { id: 'legitimo', etiqueta: 'Tu aplicación', url: ORIGEN_LEGITIMO, ayuda: 'La página que sí debería poder usar la API.' },
  { id: 'atacante', etiqueta: 'Un sitio malicioso', url: ORIGEN_ATACANTE, ayuda: 'Una página que la víctima abre sin saber lo que hace.' },
];

function LabCorsInterno({ modo }: PropsLab) {
  const vulnerable = modo === 'vulnerable';
  const [config, setConfig] = useState<ConfigCors>(vulnerable ? 'refleja' : 'fijo');
  const [origen, setOrigen] = useState<Origen>('atacante');
  const [credenciales, setCredenciales] = useState(true);
  const [envios, setEnvios] = useState(1);

  const url = ORIGENES.find((o) => o.id === origen)!.url;
  const opcion = OPCIONES_CORS.find((o) => o.id === config)!;
  const r = useMemo(() => evaluarCors(config, url, credenciales), [config, url, credenciales]);

  const enviar = () => setEnvios((n) => n + 1);

  const ataque = origen === 'atacante';

  let veredicto: { tipo: 'brecha' | 'bloqueado' | 'ok' | 'aviso'; titulo: string; texto: string };
  if (r.permiteLeer && r.datosPrivados && ataque) {
    veredicto = {
      tipo: 'brecha',
      titulo: 'El sitio malicioso leyó los datos privados de la víctima',
      texto: 'La víctima solo abrió una página, pero su navegador mandó la cookie y entregó la respuesta al otro sitio.',
    };
  } else if (r.permiteLeer && !ataque) {
    veredicto = {
      tipo: 'ok',
      titulo: 'Funciona como debe',
      texto: credenciales
        ? 'Tu aplicación lee la respuesta con la sesión de la persona.'
        : 'Tu aplicación puede leer la respuesta (como visitante anónimo).',
    };
  } else if (r.permiteLeer && ataque) {
    veredicto = {
      tipo: 'aviso',
      titulo: 'Puede leer, pero solo como visitante anónimo',
      texto:
        'Sin cookies no hay sesión que robar: solo ve lo que ya es público. Aun así, cualquier sitio puede consultar tu API.',
    };
  } else if (!ataque) {
    veredicto = {
      tipo: 'aviso',
      titulo: 'El navegador bloqueó incluso a tu propia aplicación',
      texto: 'Esta combinación no la acepta ningún navegador: tu app deja de funcionar y no proteges nada.',
    };
  } else {
    veredicto = {
      tipo: 'bloqueado',
      titulo: 'El navegador no entregó la respuesta al sitio malicioso',
      texto: 'La petición pudo llegar al servidor, pero la página ajena no puede leer lo que contestó.',
    };
  }

  const fuga = r.permiteLeer && r.datosPrivados && ataque;
  const bloqueada = !r.permiteLeer;
  const colorRespuesta = fuga ? 'ataque' : bloqueada ? 'apagado' : 'dato';

  return (
    <div className="lab lab-cors">
      <div className="lab-fila">
        <div className="lab-controles">
          <div className="campo">
            <span className="etiqueta" id="cors-config">
              Configuración de CORS en la API
            </span>
            <div className="opciones-cors" role="group" aria-labelledby="cors-config">
              {OPCIONES_CORS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="opcion-cors"
                  aria-pressed={config === o.id}
                  onClick={() => {
                    setConfig(o.id);
                    enviar();
                  }}
                >
                  <code className="codigo">{o.codigo}</code>
                  <span>{o.descripcion}</span>
                </button>
              ))}
            </div>
          </div>

          <FilaChips
            titulo="Página desde la que se hace la petición"
            ataque={false}
            items={ORIGENES.map((o) => ({ etiqueta: o.etiqueta, ayuda: o.ayuda }))}
            activo={ORIGENES.findIndex((o) => o.id === origen)}
            alElegir={(i) => {
              setOrigen(ORIGENES[i].id);
              enviar();
            }}
          />

          <label className="casilla">
            <input
              type="checkbox"
              checked={credenciales}
              onChange={(e) => {
                setCredenciales(e.target.checked);
                enviar();
              }}
            />
            <span>
              Enviar con las cookies de la víctima <code className="codigo">credentials: 'include'</code>
            </span>
          </label>
        </div>

        <div className="lab-escena">
          <Escena
            ancho={520}
            alto={215}
            titulo="Una página hace una petición a la API; el navegador decide si le deja leer la respuesta"
            reinicio={envios}
          >
            <Enlace d="M112 74 H208" estado="dato" />
            <Enlace d="M312 74 H408" estado="dato" />
            <Enlace d="M408 102 H312" estado="dato" />
            <Enlace d="M208 102 H112" estado={colorRespuesta} punteada={bloqueada} />
            <Nodo
              x={70}
              y={88}
              glifo="navegador"
              etiqueta={ataque ? 'Sitio malicioso' : 'Tu aplicación'}
              sub={ataque ? 'otro origen' : 'origen permitido'}
              estado={fuga ? 'ataque' : ataque ? 'ataque' : 'normal'}
            />
            <Nodo
              x={260}
              y={88}
              glifo="muro"
              etiqueta="Navegador"
              sub="aplica CORS"
              estado={bloqueada ? 'defensa' : fuga ? 'ataque' : 'normal'}
            />
            <Nodo x={450} y={88} glifo="servidor" etiqueta="API del banco" sub="mi-cuenta" />
            <Paquete d="M112 74 H208" estado="dato" dur={0.8} texto={credenciales ? 'GET + cookie' : 'GET'} />
            <Paquete d="M312 74 H408" estado="dato" dur={0.8} retardo={0.9} />
            <Paquete d="M408 102 H312" estado="dato" dur={0.8} retardo={1.9} />
            {!bloqueada && (
              <Paquete
                d="M208 102 H112"
                estado={fuga ? 'ataque' : 'dato'}
                dur={0.8}
                retardo={2.8}
                texto={fuga ? 'saldo, titular…' : undefined}
              />
            )}
            {bloqueada && <Impacto x={260} y={36} tipo="bloqueo" retardo={2.8} />}
            {fuga && <Impacto x={70} y={36} tipo="brecha" retardo={3.7} />}
            <TextoEscena x={260} y={190} estado={vulnerable ? 'ataque' : 'defensa'}>
              {bloqueada ? 'La respuesta llegó al navegador, pero no pasa a la página' : 'El navegador entrega la respuesta a la página'}
            </TextoEscena>
          </Escena>
        </div>
      </div>

      <div className="lab-fila lab-fila-igual">
        <div className="lab-lecturas">
          <Lectura titulo="Lo que hace la página">
            <div>
              <span className="esc-dato-codigo">fetch</span>({"'"}
              {API}
              {"'"}
              {credenciales ? ", { credentials: 'include' }" : ''})
            </div>
            <div className="leyenda">
              <span className="leyenda-item">
                Origen de la página: <code className="codigo">{url}</code>
              </span>
            </div>
          </Lectura>
          <Lectura titulo="Cabeceras con las que responde la API" estado={fuga ? 'ataque' : bloqueada ? 'defensa' : 'dato'}>
            <div>
              <span className="cabecera-nombre">Access-Control-Allow-Origin:</span>{' '}
              <span className={r.acao === '*' || r.acao === ORIGEN_ATACANTE ? 'dato-filtrado' : ''}>{r.acao}</span>
            </div>
            <div>
              <span className="cabecera-nombre">Access-Control-Allow-Credentials:</span> {r.acac ? 'true' : '(no la envía)'}
            </div>
            <div className="leyenda">
              <span className="leyenda-item">
                Configuración activa: <code className="codigo">{opcion.codigo}</code>
              </span>
            </div>
          </Lectura>
        </div>

        <div className="lab-lecturas">
          <Veredicto tipo={veredicto.tipo} titulo={veredicto.titulo}>
            {veredicto.texto}
          </Veredicto>
          <Lectura
            titulo="Lo que recibe el JavaScript de la página"
            estado={fuga ? 'ataque' : bloqueada ? 'defensa' : 'dato'}
          >
            {bloqueada ? (
              <span className="consola-error">
                Access to fetch at &apos;{API}&apos; from origin &apos;{url}&apos; has been blocked by CORS policy.
              </span>
            ) : fuga ? (
              <pre className="terminal dato-filtrado">{'{ "titular": "Ana Pérez",\n  "saldo": 4250000 }'}</pre>
            ) : (
              <pre className="terminal">{credenciales ? '{ "titular": "Ana Pérez",\n  "saldo": 4250000 }' : '{ "mensaje": "Inicia sesión para ver tu cuenta" }'}</pre>
            )}
          </Lectura>
          {bloqueada && ataque && (
            <p className="nota-lab">
              Ojo: CORS decide quién puede <b>leer</b> la respuesta, no quién puede <b>enviar</b> la petición. El servidor la
              recibió igual.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LabCors({ modo }: PropsLab) {
  return <LabCorsInterno key={modo} modo={modo} />;
}
