import { useId, useMemo, useState } from 'react';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena, type EstadoEscena } from '../componentes/Escena';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import { DOMINIOS_PERMITIDOS, pedirVistaPrevia, type ZonaRed } from './logica/ssrf';

const DIRECCIONES = [
  { etiqueta: 'Clima público', url: 'https://api.clima.example/ciudad/tunja', ayuda: 'Un destino legítimo y público.' },
  { etiqueta: 'Panel interno', url: 'http://localhost/admin', ayuda: 'Un panel que solo escucha dentro del servidor.' },
  {
    etiqueta: 'Metadatos de la nube',
    url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    ayuda: 'La dirección que guarda las llaves temporales de la nube.',
  },
  { etiqueta: 'Servidor interno', url: 'http://10.0.0.5/backups', ayuda: 'Una máquina de la red privada.' },
  { etiqueta: 'IP en decimal', url: 'http://2130706433/admin', ayuda: '2130706433 es 127.0.0.1 escrito de otra forma.' },
  { etiqueta: 'Dominio engañoso', url: 'http://127.0.0.1.nip.io/admin', ayuda: 'Parece un dominio, pero su DNS apunta a 127.0.0.1.' },
  { etiqueta: 'file://', url: 'file:///etc/passwd', ayuda: 'Otro esquema distinto de http.' },
];

type Destino = 'clima' | 'admin' | 'metadatos' | 'backups' | null;

const NOMBRE_ZONA: Record<ZonaRed, string> = {
  publica: 'pública',
  loopback: 'interna (este mismo servidor)',
  privada: 'interna (red privada)',
  metadatos: 'interna (metadatos de la nube)',
  invalida: 'no válida',
};

function destinoDe(zona: ZonaRed, host: string, ip: string | undefined, ruta: string): Destino {
  if (zona === 'publica') return host === 'api.clima.example' ? 'clima' : null;
  if (zona === 'loopback') return ruta.startsWith('/admin') ? 'admin' : null;
  if (zona === 'metadatos') return ip === '169.254.169.254' ? 'metadatos' : null;
  if (zona === 'privada') return ip === '10.0.0.5' ? 'backups' : null;
  return null;
}

const SERVIDOR = { x: 205, y: 135 };

const NODOS: Record<Exclude<Destino, null>, { x: number; y: number; ruta: string }> = {
  clima: { x: 480, y: 52, ruta: 'M247 126 L 438 60' },
  admin: { x: 372, y: 195, ruta: 'M247 148 L 355 168' },
  metadatos: { x: 450, y: 195, ruta: 'M247 148 C 330 122 420 130 450 168' },
  backups: { x: 528, y: 195, ruta: 'M247 148 C 340 112 500 112 528 168' },
};

function invertir(ruta: string): string {
  // Los trazados de este laboratorio son de la forma «M x y L x y» o «M x y C x y x y x y».
  const nums = ruta.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const puntos: Array<[number, number]> = [];
  for (let i = 0; i < nums.length; i += 2) puntos.push([nums[i], nums[i + 1]]);
  const rev = [...puntos].reverse();
  if (ruta.includes('C')) {
    return `M${rev[0][0]} ${rev[0][1]} C ${rev[1][0]} ${rev[1][1]} ${rev[2][0]} ${rev[2][1]} ${rev[3][0]} ${rev[3][1]}`;
  }
  return `M${rev[0][0]} ${rev[0][1]} L ${rev[1][0]} ${rev[1][1]}`;
}

function LabSsrfInterno({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [url, setUrl] = useState(DIRECCIONES[0].url);
  const [pedida, setPedida] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [elegida, setElegida] = useState<number | null>(0);

  const pedir = (valor: string) => {
    setPedida(valor);
    setEnvios((n) => n + 1);
  };

  const r = useMemo(() => (pedida === null ? null : pedirVistaPrevia(pedida, modo)), [pedida, modo]);

  const analisis = r?.analisis;
  const destino: Destino =
    r && r.tipo === 'respondio' && analisis
      ? destinoDe(analisis.zona, analisis.host, analisis.ip, analisis.ruta)
      : null;
  const interna = analisis ? analisis.zona !== 'publica' && analisis.zona !== 'invalida' : false;

  let veredicto: { tipo: 'brecha' | 'bloqueado' | 'ok' | 'aviso' | 'neutro'; titulo: string; texto: string } | null = null;
  if (r) {
    if (r.tipo === 'invalida') {
      veredicto = { tipo: 'aviso', titulo: 'Dirección no válida', texto: r.motivo };
    } else if (r.tipo === 'bloqueada') {
      veredicto = { tipo: 'bloqueado', titulo: 'Ataque bloqueado antes de salir', texto: r.motivo };
    } else if (r.sensible) {
      veredicto = {
        tipo: 'brecha',
        titulo: 'Tu servidor llamó a un lugar interno y se lo mostró al atacante',
        texto: `${r.titulo}. Desde fuera no habría podido llegar ahí: usó a tu servidor como mensajero.`,
      };
    } else if (r.titulo === 'Sin respuesta') {
      veredicto = { tipo: 'neutro', titulo: 'Nadie contestó', texto: 'La dirección no corresponde a ninguna máquina conocida.' };
    } else {
      veredicto = { tipo: 'ok', titulo: 'Vista previa normal', texto: `${r.titulo}: un destino público, como se esperaba.` };
    }
  }

  const brecha = veredicto?.tipo === 'brecha';
  const bloqueado = veredicto?.tipo === 'bloqueado';
  const colorAtaque: EstadoEscena = interna ? 'ataque' : 'dato';
  const nodoDestino = destino ? NODOS[destino] : null;
  const estadoDestino = (d: Exclude<Destino, null>): EstadoEscena =>
    destino === d ? (brecha ? 'ataque' : 'dato') : 'normal';

  return (
    <div className="lab lab-ssrf">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegida(null);
            pedir(url);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-u`}>Dirección de la que quieres una vista previa</label>
            <input
              id={`${id}-u`}
              className="entrada"
              value={url}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button type="submit" className="boton">
            Generar vista previa
          </button>
          <FilaChips
            titulo="O prueba una dirección con un clic"
            items={DIRECCIONES.map((d) => ({ etiqueta: d.etiqueta, ayuda: d.ayuda }))}
            activo={elegida}
            alElegir={(i) => {
              setElegida(i);
              setUrl(DIRECCIONES[i].url);
              pedir(DIRECCIONES[i].url);
            }}
          />
          {!vulnerable && (
            <div className="campo">
              <span className="etiqueta">Destinos que permite el servidor (solo https)</span>
              <div className="chips">
                {DOMINIOS_PERMITIDOS.map((d) => (
                  <span key={d} className="chip chip-permitido">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
          {analisis && analisis.ok && (
            <Lectura titulo="Cómo entendió el servidor la dirección" estado={interna ? 'ataque' : 'dato'} mono={false}>
              <dl className="datos-url">
                <div>
                  <dt>Esquema</dt>
                  <dd className="codigo">{analisis.esquema}</dd>
                </div>
                <div>
                  <dt>Servidor al que iría</dt>
                  <dd className="codigo">{analisis.host}</dd>
                </div>
                {analisis.ip && analisis.ip !== analisis.host && (
                  <div>
                    <dt>Su dirección real</dt>
                    <dd className="codigo dato-filtrado">{analisis.ip}</dd>
                  </div>
                )}
                <div>
                  <dt>Zona de red</dt>
                  <dd className={interna ? 'zona-interna' : 'zona-publica'}>{NOMBRE_ZONA[analisis.zona]}</dd>
                </div>
              </dl>
              {analisis.nota && <p className="nota-lab">{analisis.nota}</p>}
            </Lectura>
          )}
        </form>

        <div className="lab-escena">
          <Escena
            ancho={580}
            alto={272}
            titulo="El atacante pide una vista previa a tu servidor, que puede llamar a destinos públicos y a la red interna"
            reinicio={`${envios}-${modo}`}
          >
            <rect x={335} y={140} width={236} height={124} rx={6} className="zona-interna-caja" />
            <text x={347} y={256} className="esc-sub">
              Red interna (cerrada desde fuera)
            </text>
            <Enlace d="M107 135 H163" estado={bloqueado ? 'apagado' : colorAtaque} />
            <Nodo x={62} y={135} glifo="atacante" etiqueta="Atacante" sub="solo tiene internet" estado={brecha ? 'ataque' : 'normal'} />
            <Nodo
              x={SERVIDOR.x}
              y={SERVIDOR.y}
              glifo="servidor"
              etiqueta="Tu servidor"
              sub={vulnerable ? 'llama a cualquier URL' : 'solo a destinos permitidos'}
              estado={bloqueado ? 'defensa' : brecha ? 'ataque' : 'normal'}
            />
            <Nodo x={480} y={52} glifo="nube" etiqueta="api.clima.example" ancho={70} alto={52} estado={estadoDestino('clima')} />
            <Nodo x={372} y={195} glifo="terminal" etiqueta="Panel admin" ancho={64} alto={52} estado={estadoDestino('admin')} />
            <Nodo x={450} y={195} glifo="llave" etiqueta="Metadatos" ancho={64} alto={52} estado={estadoDestino('metadatos')} />
            <Nodo x={528} y={195} glifo="base" etiqueta="Backups" ancho={64} alto={52} estado={estadoDestino('backups')} />

            {Object.entries(NODOS).map(([clave, n]) => (
              <Enlace
                key={clave}
                d={n.ruta}
                estado={destino === clave ? colorAtaque : 'apagado'}
                punteada={destino !== clave}
                sinFlecha={destino !== clave}
              />
            ))}

            {r && (
              <>
                <Paquete d="M107 135 H163" estado={colorAtaque} dur={0.9} texto={interna ? 'url interna' : 'url'} />
                {bloqueado && <Impacto x={SERVIDOR.x} y={80} tipo="bloqueo" retardo={0.9} />}
                {nodoDestino && destino && (
                  <>
                    <Paquete d={NODOS[destino].ruta} estado={colorAtaque} dur={1} retardo={1} />
                    <Paquete d={invertir(NODOS[destino].ruta)} estado={brecha ? 'ataque' : 'dato'} dur={1} retardo={2.1} />
                    <Paquete
                      d="M163 135 H107"
                      estado={brecha ? 'ataque' : 'dato'}
                      dur={0.9}
                      retardo={3.2}
                      texto={brecha ? 'datos internos' : undefined}
                    />
                    {brecha && <Impacto x={62} y={80} tipo="brecha" retardo={4.1} />}
                    {!brecha && veredicto?.tipo === 'ok' && <Impacto x={62} y={80} tipo="ok" retardo={4.1} />}
                  </>
                )}
              </>
            )}
            <TextoEscena x={160} y={34} anclaje="middle" estado={vulnerable ? 'ataque' : 'defensa'}>
              {vulnerable ? 'El servidor obedece a cualquier dirección' : 'El servidor revisa el destino primero'}
            </TextoEscena>
          </Escena>
        </div>
      </div>

      {veredicto && r && (
        <div className="lab-fila lab-fila-igual">
          <Veredicto tipo={veredicto.tipo} titulo={veredicto.titulo}>
            {veredicto.texto}
          </Veredicto>
          {r.tipo === 'respondio' && (
            <Lectura
              titulo="Lo que respondió ese destino"
              estado={r.sensible ? 'ataque' : 'dato'}
            >
              <div className="respuesta-titulo">{r.titulo}</div>
              <pre className={`terminal${r.sensible ? ' dato-filtrado' : ''}`}>{r.cuerpo}</pre>
            </Lectura>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabSsrf({ modo }: PropsLab) {
  return <LabSsrfInterno key={modo} modo={modo} />;
}
