import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import EscenaFlujo from './EscenaFlujo';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import { DOCUMENTOS, ErrorMongo, buscarTodos, iniciarSesion, type ResultadoLogin } from './logica/nosql';

const CUERPO_NORMAL = '{ "usuario": "ana", "clave": "mango2024" }';

const PAYLOADS = [
  { etiqueta: 'Login normal', cuerpo: CUERPO_NORMAL, ayuda: 'Un usuario que sí conoce su clave.' },
  {
    etiqueta: 'Cualquier clave',
    cuerpo: '{ "usuario": "admin", "clave": { "$ne": null } }',
    ayuda: '$ne significa «distinto de»: la clave de admin es distinta de null.',
  },
  {
    etiqueta: 'Sin saber el usuario',
    cuerpo: '{ "usuario": { "$ne": null }, "clave": { "$ne": null } }',
    ayuda: 'Todos los usuarios cumplen; findOne devuelve el primero.',
  },
  {
    etiqueta: 'Adivinar con regex',
    cuerpo: '{ "usuario": "admin", "clave": { "$regex": "^S" } }',
    ayuda: '¿La clave de admin empieza por S? La respuesta delata la letra.',
  },
  {
    etiqueta: 'Operador inventado',
    cuerpo: '{ "usuario": "admin", "clave": { "$hack": 1 } }',
    ayuda: 'Un operador que no existe: la base protesta y filtra información.',
  },
];

const ALFABETO = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-!_.@#';

const escaparRegex = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const esperar = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function tieneOperador(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  return Object.entries(v).some(([k, x]) => k.startsWith('$') || tieneOperador(x));
}

function cuerpoTieneOperador(texto: string): boolean {
  try {
    return tieneOperador(JSON.parse(texto));
  } catch {
    return false;
  }
}

/** Muestra el JSON del filtro con los operadores ($ne, $regex…) resaltados. */
function JsonFiltro({ filtro }: { filtro: Record<string, unknown> }) {
  const texto = JSON.stringify(filtro, null, 2);
  const partes = texto.split(/("\$[A-Za-z]+")/);
  return (
    <pre className="json-filtro">
      {partes.map((p, i) =>
        /^"\$/.test(p) ? (
          <mark key={i} className="cons-inyectado">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </pre>
  );
}

type EstadoExtraccion = 'quieta' | 'extrayendo' | 'completa' | 'rechazada';

function LabNosqlInterno({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [cuerpo, setCuerpo] = useState(CUERPO_NORMAL);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [elegido, setElegido] = useState<number | null>(0);

  const [extraccion, setExtraccion] = useState<EstadoExtraccion>('quieta');
  const [revelada, setRevelada] = useState('');
  const [candidata, setCandidata] = useState('');
  const [peticiones, setPeticiones] = useState(0);
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;
    return () => {
      cancelado.current = true;
    };
  }, []);

  const enviar = (texto: string) => {
    setEnviado(texto);
    setEnvios((n) => n + 1);
  };

  const resultado: ResultadoLogin | null = useMemo(
    () => (enviado === null ? null : iniciarSesion(enviado, modo)),
    [enviado, modo],
  );

  const filtro = resultado && 'filtro' in resultado ? resultado.filtro : undefined;
  const coincidentes = useMemo(() => {
    if (!filtro) return [];
    try {
      return buscarTodos(filtro).map((d) => d._id);
    } catch (e) {
      if (e instanceof ErrorMongo) return [];
      throw e;
    }
  }, [filtro]);

  const ataque = enviado !== null && cuerpoTieneOperador(enviado);

  let estado: 'brecha' | 'bloqueado' | 'ok' | 'aviso' | 'neutro' | null = null;
  let titulo = '';
  let detalle = '';
  if (resultado) {
    switch (resultado.tipo) {
      case 'json-invalido':
        estado = 'aviso';
        titulo = 'La petición no es JSON válido';
        detalle = resultado.mensaje;
        break;
      case 'rechazado':
        estado = 'bloqueado';
        titulo = 'Ataque bloqueado antes de llegar a la base';
        detalle = resultado.motivo;
        break;
      case 'error':
        estado = 'aviso';
        titulo = 'La base de datos protestó';
        detalle = `Error de la base: ${resultado.mensaje}. Un mensaje así le confirma al atacante que su objeto llegó hasta la consulta.`;
        break;
      case 'sin-coincidencia':
        estado = 'neutro';
        titulo = 'Usuario o clave incorrectos';
        detalle = 'Ningún documento cumple el filtro.';
        break;
      case 'entro':
        if (resultado.legitimo) {
          estado = 'ok';
          titulo = 'Inicio de sesión normal';
          detalle = `Coincide el usuario «${resultado.documento.usuario}» con su clave.`;
        } else {
          estado = 'brecha';
          titulo = `Entró como «${resultado.documento.usuario}» sin conocer la clave`;
          detalle = `El filtro cumplió con ${coincidentes.length} documento${coincidentes.length === 1 ? '' : 's'} y findOne devolvió el primero.`;
        }
        break;
    }
  }

  const frena = resultado?.tipo === 'rechazado';
  const resultadoEscena =
    estado === 'brecha' ? 'brecha' : estado === 'bloqueado' ? 'bloqueado' : estado === 'ok' ? 'ok' : null;

  const extraer = async () => {
    if (extraccion === 'extrayendo') return;
    setExtraccion('extrayendo');
    setRevelada('');
    setCandidata('');
    setPeticiones(0);
    let prefijo = '';
    let n = 0;

    const consultar = (patron: string) => {
      n++;
      setPeticiones(n);
      return iniciarSesion(JSON.stringify({ usuario: 'admin', clave: { $regex: patron } }), modo);
    };

    // La primera petición decide si el servidor deja pasar el objeto
    const prueba = consultar('^');
    if (prueba.tipo === 'rechazado') {
      setExtraccion('rechazada');
      return;
    }

    for (let pos = 0; pos < 40; pos++) {
      let hallada = false;
      for (const c of ALFABETO) {
        if (cancelado.current) return;
        const intento = prefijo + c;
        setCandidata(intento);
        const r = consultar('^' + escaparRegex(intento));
        await esperar(4);
        if (r.tipo === 'entro') {
          prefijo = intento;
          setRevelada(prefijo);
          hallada = true;
          break;
        }
      }
      if (!hallada) break;
      if (consultar('^' + escaparRegex(prefijo) + '$').tipo === 'entro') break;
    }
    setCandidata('');
    setExtraccion('completa');
  };

  return (
    <div className="lab lab-nosql">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegido(null);
            enviar(cuerpo);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-c`}>Cuerpo JSON de la petición POST /login</label>
            <textarea
              id={`${id}-c`}
              className="entrada"
              rows={3}
              value={cuerpo}
              spellCheck={false}
              onChange={(e) => setCuerpo(e.target.value)}
            />
          </div>
          <button type="submit" className="boton">
            Enviar petición
          </button>
          <FilaChips
            titulo="O prueba un ataque con un clic"
            items={PAYLOADS.map((p) => ({ etiqueta: p.etiqueta, ayuda: p.ayuda }))}
            activo={elegido}
            alElegir={(i) => {
              setElegido(i);
              setCuerpo(PAYLOADS[i].cuerpo);
              enviar(PAYLOADS[i].cuerpo);
            }}
          />
        </form>

        <div className="lab-escena">
          <EscenaFlujo
            titulo="Quien envía el JSON habla con la API de login, que consulta la colección de usuarios"
            envios={enviado === null ? 0 : envios * 2 + (vulnerable ? 0 : 1)}
            izquierda={{ glifo: ataque ? 'atacante' : 'persona', etiqueta: 'Quien envía el JSON' }}
            centro={{
              glifo: 'servidor',
              etiqueta: 'API de login',
              sub: vulnerable ? 'findOne(req.body)' : 'valida y arma el filtro',
              estado: frena ? 'defensa' : 'normal',
            }}
            derecha={{ glifo: 'base', etiqueta: 'MongoDB', sub: 'colección usuarios' }}
            ataque={ataque}
            resultado={resultadoEscena}
            frenaEnCentro={frena}
            carga={ataque ? '{ $ne: null }' : undefined}
            nota={vulnerable ? 'El cuerpo entero se usa como filtro' : 'Solo se aceptan textos'}
            notaEstado={vulnerable ? 'ataque' : 'defensa'}
          />
        </div>
      </div>

      {resultado && estado && (
        <div className="lab-fila lab-fila-igual">
          <div className="lab-lecturas">
            <Lectura
              titulo="Filtro que recibe la base de datos"
              estado={frena ? 'defensa' : ataque ? 'ataque' : 'dato'}
            >
              {filtro ? (
                <JsonFiltro filtro={filtro} />
              ) : (
                <span className="celda-quieta">Nada llegó a la base de datos.</span>
              )}
            </Lectura>
            <Veredicto tipo={estado} titulo={titulo}>
              {detalle}
            </Veredicto>
          </div>

          <div>
            <h4 className="sub sub-corto">Colección «usuarios»</h4>
            <ul className="docs-lista">
              {DOCUMENTOS.map((d) => {
                const primero = resultado.tipo === 'entro' && resultado.documento._id === d._id;
                const coincide = coincidentes.includes(d._id);
                const clase = primero
                  ? resultado.legitimo
                    ? 'doc-ok'
                    : 'doc-brecha'
                  : coincide
                    ? 'doc-coincide'
                    : '';
                return (
                  <li key={d._id} className={`doc ${clase}`}>
                    <div className="doc-cabecera">
                      <code className="codigo">_id: {d._id}</code>
                      {primero && <span className="doc-etiqueta">devuelto por findOne</span>}
                      {!primero && coincide && <span className="doc-etiqueta doc-etiqueta-suave">también coincide</span>}
                    </div>
                    <code className="codigo">usuario: «{d.usuario}»</code>
                    <code className="codigo">rol: «{d.rol}»</code>
                    <code className="codigo">clave: ••••••••</code>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="extractor">
        <div className="etapa-barra">
          <div>
            <h4 className="sub sub-corto">Ahora el truco que de verdad da miedo</h4>
            <p className="etapa-ayuda">
              Con $regex se puede preguntar «¿la clave empieza por…?». Cada respuesta delata una letra. Un programa lo
              repite hasta sacar la clave completa.
            </p>
          </div>
          <button type="button" className="boton boton-ataque" onClick={extraer} disabled={extraccion === 'extrayendo'}>
            {extraccion === 'extrayendo' ? 'Extrayendo…' : 'Sacar la clave de admin'}
          </button>
        </div>
        {extraccion !== 'quieta' && (
          <div className={`extractor-pantalla${extraccion === 'rechazada' ? ' extractor-pantalla-bien' : ''}`} aria-live="polite">
            <div className="extractor-clave" aria-label="Clave descubierta hasta ahora">
              {extraccion === 'rechazada' ? (
                <span className="celda-firme">—</span>
              ) : (
                <>
                  <span className="extractor-fijo">{revelada}</span>
                  {extraccion === 'extrayendo' && (
                    <span className="extractor-probando">{candidata.slice(revelada.length)}</span>
                  )}
                </>
              )}
            </div>
            <div className="extractor-datos">
              <span>
                Peticiones: <b>{peticiones}</b>
              </span>
              {extraccion === 'completa' && (
                <span className="extractor-fin">
                  Clave completa: «{revelada}» sin haberla sabido nunca.
                </span>
              )}
              {extraccion === 'rechazada' && (
                <span className="extractor-fin extractor-fin-bien">
                  El servidor rechazó el objeto en la primera petición: no hay letras que adivinar.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LabNosql({ modo }: PropsLab) {
  return <LabNosqlInterno key={modo} modo={modo} />;
}
