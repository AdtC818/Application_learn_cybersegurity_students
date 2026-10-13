import { useId, useState } from 'react';
import { Enlace, Escena, Impacto, Paquete, TextoEscena, type EstadoEscena } from '../componentes/Escena';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  crearMundo,
  fusionar,
  leerCarga,
  leerPropiedad,
  nuevoObjeto,
  propiedadesVisibles,
  type Mundo,
  type ObjModelo,
  type PasoMerge,
} from './logica/prototipos';

const PAYLOADS = [
  { etiqueta: 'Tema oscuro', texto: '{ "tema": "oscuro" }', ayuda: 'Una preferencia normal.' },
  {
    etiqueta: 'Contaminar con __proto__',
    texto: '{ "__proto__": { "esAdmin": true } }',
    ayuda: '__proto__ apunta al prototipo de todos los objetos.',
  },
  {
    etiqueta: 'Por constructor',
    texto: '{ "constructor": { "prototype": { "esAdmin": true } } }',
    ayuda: 'Otro camino hasta el mismo prototipo.',
  },
];

interface Mundial {
  mundo: Mundo;
  usuario: ObjModelo;
}

function crear(): Mundial {
  const mundo = crearMundo();
  return { mundo, usuario: nuevoObjeto(mundo, 'usuario', { nombre: 'Ana' }) };
}

function formato(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  return String(v);
}

interface PropsCaja {
  x: number;
  y: number;
  ancho: number;
  titulo: string;
  nota?: string;
  lineas: Array<{ clave: string; valor: unknown; heredada?: boolean; contaminada?: boolean }>;
  estado?: EstadoEscena;
}

function altoCaja(n: number) {
  return 38 + Math.max(1, n) * 18;
}

function Caja({ x, y, ancho, titulo, nota, lineas, estado = 'normal' }: PropsCaja) {
  const visibles = lineas.slice(0, 5);
  return (
    <g className={`nodo nodo-${estado} caja-obj`}>
      <rect x={x} y={y} width={ancho} height={altoCaja(visibles.length)} rx={5} />
      <text x={x + 12} y={y + 21} className="esc-texto">
        {titulo}
      </text>
      {nota && (
        <text x={x + ancho - 12} y={y + 21} textAnchor="end" className="esc-sub">
          {nota}
        </text>
      )}
      {visibles.length === 0 && (
        <text x={x + 12} y={y + 41} className="esc-sub">
          (sin propiedades propias)
        </text>
      )}
      {visibles.map((l, i) => (
        <text
          key={l.clave}
          x={x + 12}
          y={y + 41 + i * 18}
          className={`esc-mono${l.contaminada ? ' esc-ataque' : l.heredada ? ' esc-ataque caja-heredada' : ''}`}
        >
          {l.clave}: {formato(l.valor)}
          {l.heredada ? '  ← heredada' : ''}
        </text>
      ))}
    </g>
  );
}

function iconoPaso(p: PasoMerge) {
  return p.accion === 'contaminar' ? '✖' : p.accion === 'bloquear' ? '🛡' : '·';
}

function LabPrototiposInterno({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [m, setM] = useState<Mundial>(crear);
  const [texto, setTexto] = useState(PAYLOADS[0].texto);
  const [elegido, setElegido] = useState<number | null>(0);
  const [pasos, setPasos] = useState<PasoMerge[] | null>(null);
  const [errorJson, setErrorJson] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [, setTick] = useState(0);

  const aplicar = (cuerpo: string) => {
    const carga = leerCarga(cuerpo);
    if (!carga.ok) {
      setErrorJson(carga.error);
      setPasos(null);
      return;
    }
    setErrorJson(null);
    const nuevos = fusionar(m.mundo, m.mundo.config, carga.valor, !vulnerable);
    setPasos(nuevos);
    setEnvios((n) => n + 1);
    setTick((t) => t + 1);
  };

  const reiniciar = () => {
    setM(crear());
    setPasos(null);
    setErrorJson(null);
    setEnvios(0);
  };

  const { mundo, usuario } = m;
  const propiasProto = Object.entries(mundo.objectPrototype.propias).map(([clave, valor]) => ({
    clave,
    valor,
    contaminada: true,
  }));
  const contaminado = propiasProto.length > 0;
  const visiblesConfig = propiedadesVisibles(mundo.config);
  const visiblesUsuario = propiedadesVisibles(usuario);
  const esAdmin = leerPropiedad(usuario, 'esAdmin');

  const contamino = pasos?.some((p) => p.accion === 'contaminar') ?? false;
  const bloqueo = pasos?.some((p) => p.accion === 'bloquear') ?? false;

  let estado: 'brecha' | 'bloqueado' | 'ok' | null = null;
  if (pasos) estado = contamino ? 'brecha' : bloqueo ? 'bloqueado' : 'ok';

  // Geometría del dibujo
  const altoProto = altoCaja(propiasProto.length);
  const yBase = 14 + altoProto + 62;
  const xProto = 130;
  const anchoProto = 260;
  const arriba = 14 + altoProto;
  const subidaConfig = `M129 ${yBase} L 200 ${arriba + 2}`;
  const subidaUsuario = `M391 ${yBase} L 320 ${arriba + 2}`;
  const alto = yBase + Math.max(altoCaja(visiblesConfig.length), altoCaja(visiblesUsuario.length)) + 14;
  const colorHerencia: EstadoEscena = contaminado ? 'ataque' : 'dato';

  return (
    <div className="lab lab-prototipos">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegido(null);
            aplicar(texto);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-t`}>Preferencias que envía el usuario (JSON)</label>
            <textarea
              id={`${id}-t`}
              className="entrada"
              rows={3}
              value={texto}
              spellCheck={false}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <div className="atacante-botones">
            <button type="submit" className="boton">
              Guardar preferencias
            </button>
            <button type="button" className="boton boton-fantasma" onClick={reiniciar}>
              Reiniciar la aplicación
            </button>
          </div>
          <FilaChips
            titulo="O prueba un ataque con un clic"
            items={PAYLOADS.map((p) => ({ etiqueta: p.etiqueta, ayuda: p.ayuda }))}
            activo={elegido}
            alElegir={(i) => {
              setElegido(i);
              setTexto(PAYLOADS[i].texto);
              aplicar(PAYLOADS[i].texto);
            }}
          />
          {errorJson && <p className="aviso aviso-info">{errorJson}</p>}
          <Lectura titulo="En otro lugar de la aplicación" estado={esAdmin ? 'ataque' : 'dato'}>
            <div>
              if (<span className="cons-entrada">usuario.esAdmin</span>) {'{ mostrarPanelAdmin(); }'}
            </div>
            <div className="comprobacion">
              <span>usuario.esAdmin vale</span>
              <b className={esAdmin ? 'dato-filtrado' : ''}>{esAdmin === undefined ? 'undefined' : String(esAdmin)}</b>
              <span className={`insignia ${esAdmin ? 'insignia-mala' : 'insignia-buena'}`}>
                {esAdmin ? 'entra al panel de administración' : 'no entra'}
              </span>
            </div>
          </Lectura>
        </form>

        <div className="lab-escena">
          <Escena
            ancho={520}
            alto={alto}
            titulo="Los objetos config y usuario heredan de Object.prototype; una fusión insegura puede escribir en él"
            reinicio={`${envios}-${modo}`}
          >
            <Enlace d={subidaConfig} estado={colorHerencia} punteada={!contaminado} />
            <Enlace d={subidaUsuario} estado={colorHerencia} punteada={!contaminado} />
            <TextoEscena x={150} y={yBase - 22} anclaje="end" estado={contaminado ? 'ataque' : 'apagado'}>
              hereda de
            </TextoEscena>
            <TextoEscena x={370} y={yBase - 22} anclaje="start" estado={contaminado ? 'ataque' : 'apagado'}>
              hereda de
            </TextoEscena>
            <Caja
              x={xProto}
              y={14}
              ancho={anchoProto}
              titulo="Object.prototype"
              nota="de todos los objetos"
              lineas={propiasProto}
              estado={contaminado ? 'ataque' : 'normal'}
            />
            <Caja
              x={14}
              y={yBase}
              ancho={240}
              titulo="config"
              nota="la configuración"
              lineas={visiblesConfig}
              estado={bloqueo && !contamino ? 'defensa' : 'dato'}
            />
            <Caja
              x={266}
              y={yBase}
              ancho={240}
              titulo="usuario"
              nota="objeto nuevo"
              lineas={visiblesUsuario}
              estado={esAdmin ? 'ataque' : 'normal'}
            />
            {contamino && (
              <>
                <Paquete d={subidaConfig} estado="ataque" dur={1} texto="__proto__" />
                <Paquete d={`M320 ${arriba + 2} L 391 ${yBase}`} estado="ataque" dur={1} retardo={1.1} />
                <Impacto x={xProto + anchoProto + 4} y={arriba - 8} tipo="brecha" retardo={1} />
                <Impacto x={500} y={yBase - 14} tipo="brecha" retardo={2.1} />
              </>
            )}
            {bloqueo && !contamino && <Impacto x={xProto + anchoProto + 4} y={arriba - 8} tipo="bloqueo" retardo={0.4} />}
          </Escena>
        </div>
      </div>

      {pasos && estado && (
        <div className="lab-fila lab-fila-igual">
          <Veredicto
            tipo={estado}
            titulo={
              estado === 'brecha'
                ? 'Se contaminó el prototipo: todos los objetos cambiaron'
                : estado === 'bloqueado'
                  ? 'Ataque bloqueado: se ignoraron las claves peligrosas'
                  : 'Preferencias guardadas'
            }
          >
            {estado === 'brecha'
              ? 'El objeto «usuario» nunca recibió esAdmin, pero ahora lo hereda de Object.prototype. Lo mismo le pasa a cualquier objeto que se cree después.'
              : estado === 'bloqueado'
                ? 'Las claves peligrosas (__proto__ y constructor) se descartaron, así que Object.prototype quedó intacto.'
                : 'Solo se copiaron las propiedades pedidas en el objeto config.'}
          </Veredicto>
          <Lectura titulo="Lo que hizo la función de fusión, paso a paso" mono={false}>
            <ul className="lista-merge">
              {pasos.map((p, i) => (
                <li key={i} className={`merge-${p.accion}`}>
                  <span className="merge-icono" aria-hidden="true">
                    {iconoPaso(p)}
                  </span>
                  <span>
                    <code className="codigo">{p.ruta}</code> — {p.detalle}
                  </span>
                </li>
              ))}
            </ul>
          </Lectura>
        </div>
      )}
    </div>
  );
}

export default function LabPrototipos({ modo }: PropsLab) {
  return <LabPrototiposInterno key={modo} modo={modo} />;
}
