import { useId, useMemo, useState, type CSSProperties } from 'react';
import { Glifo } from '../componentes/Glifos';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import { ARCHIVOS, BASE, recorrido, servirArchivo, type RespuestaArchivo } from './logica/rutas';

interface ItemArbol {
  ruta: string;
  nombre: string;
  nivel: number;
  carpeta: boolean;
}

const ARBOL: ItemArbol[] = [
  { ruta: '/', nombre: '/', nivel: 0, carpeta: true },
  { ruta: '/app', nombre: 'app', nivel: 1, carpeta: true },
  { ruta: '/app/uploads', nombre: 'uploads', nivel: 2, carpeta: true },
  { ruta: '/app/uploads/foto.png', nombre: 'foto.png', nivel: 3, carpeta: false },
  { ruta: '/app/uploads/informe.pdf', nombre: 'informe.pdf', nivel: 3, carpeta: false },
  { ruta: '/app/config', nombre: 'config', nivel: 2, carpeta: true },
  { ruta: '/app/config/secretos.env', nombre: 'secretos.env', nivel: 3, carpeta: false },
  { ruta: '/etc', nombre: 'etc', nivel: 1, carpeta: true },
  { ruta: '/etc/passwd', nombre: 'passwd', nivel: 2, carpeta: false },
];

const PEDIDOS = [
  { etiqueta: 'foto.png', valor: 'foto.png', ayuda: 'Una descarga normal.' },
  { etiqueta: 'informe.pdf', valor: 'informe.pdf', ayuda: 'Otra descarga normal.' },
  { etiqueta: '../config/secretos.env', valor: '../config/secretos.env', ayuda: 'Sube un nivel y entra a config.' },
  { etiqueta: '../../etc/passwd', valor: '../../etc/passwd', ayuda: 'Sube dos niveles hasta la raíz del sistema.' },
  { etiqueta: '/etc/passwd', valor: '/etc/passwd', ayuda: 'Una ruta absoluta.' },
];

function esAbsoluta(nombre: string) {
  return nombre.startsWith('/');
}

/** La ruta del navegador, con cada «../» resaltado. */
function RutaConSubidas({ texto }: { texto: string }) {
  const partes = texto.split(/(\.\.\/)/);
  return (
    <>
      {partes.map((p, i) =>
        p === '../' ? (
          <mark key={i} className="cons-inyectado">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

type TipoFinal = 'brecha' | 'ok' | 'bloqueo' | 'noexiste';

function claseFinal(resp: RespuestaArchivo): TipoFinal {
  if (resp.tipo === 'ok') return resp.fueraDeBase ? 'brecha' : 'ok';
  if (resp.tipo === 'prohibido') return 'bloqueo';
  return 'noexiste';
}

export default function LabRutas({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [nombre, setNombre] = useState('foto.png');
  const [pedido, setPedido] = useState<string | null>(null);
  const [envios, setEnvios] = useState(0);
  const [elegido, setElegido] = useState<number | null>(0);

  const pedir = (valor: string) => {
    setPedido(valor);
    setEnvios((n) => n + 1);
  };

  const resp = useMemo(() => (pedido === null ? null : servirArchivo(pedido, modo)), [pedido, modo]);

  // Carpetas y archivos por los que "pasa" la ruta, en orden
  const paseo = useMemo(() => {
    if (pedido === null || !resp) return [] as string[];
    const camino = esAbsoluta(pedido) && !vulnerable ? [BASE, resp.ruta] : recorrido(BASE, pedido);
    // Si la ruta final no es un nodo del dibujo (no existe), el camino termina en la última carpeta que sí existe
    return camino;
  }, [pedido, resp, vulnerable]);

  const orden = new Map<string, number>();
  paseo.forEach((r) => {
    if (!orden.has(r)) orden.set(r, orden.size);
  });
  const rutaFinal = resp ? resp.ruta : null;
  const tipoFinal = resp ? claseFinal(resp) : null;

  let veredicto: { tipo: 'brecha' | 'bloqueado' | 'ok' | 'neutro'; titulo: string; texto: string } | null = null;
  if (resp) {
    if (resp.tipo === 'ok' && resp.fueraDeBase) {
      veredicto = {
        tipo: 'brecha',
        titulo: 'Salió de la carpeta pública y leyó un archivo privado',
        texto: `El servidor entregó ${resp.ruta}, que no está dentro de ${BASE}.`,
      };
    } else if (resp.tipo === 'ok') {
      veredicto = { tipo: 'ok', titulo: 'Descarga normal', texto: `Se entregó ${resp.ruta}, dentro de la carpeta pública.` };
    } else if (resp.tipo === 'prohibido') {
      veredicto = {
        tipo: 'bloqueado',
        titulo: 'Ataque bloqueado: fuera de la carpeta permitida',
        texto: `La ruta resuelta fue ${resp.ruta}. No empieza por ${BASE}/, así que el servidor responde 403 sin abrir nada.`,
      };
    } else {
      veredicto = {
        tipo: 'neutro',
        titulo: 'No existe ese archivo',
        texto: `El servidor buscó ${resp.ruta} y no encontró nada (responde 404).`,
      };
    }
  }

  const contenido =
    resp?.tipo === 'ok' ? (ARCHIVOS.find((a) => a.ruta === resp.ruta)?.contenido ?? resp.contenido) : null;

  return (
    <div className="lab lab-rutas">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setElegido(null);
            pedir(nombre);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-n`}>Archivo que se pide en la dirección</label>
            <div className="barra-direccion">
              <span className="barra-direccion-fija">tienda.example/descargar?archivo=</span>
              <input
                id={`${id}-n`}
                className="entrada barra-direccion-entrada"
                value={nombre}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="boton">
            Pedir archivo
          </button>
          <FilaChips
            titulo="O prueba una dirección con un clic"
            items={PEDIDOS.map((p) => ({ etiqueta: p.etiqueta, ayuda: p.ayuda }))}
            activo={elegido}
            alElegir={(i) => {
              setElegido(i);
              setNombre(PEDIDOS[i].valor);
              pedir(PEDIDOS[i].valor);
            }}
          />
          {pedido !== null && (
            <Lectura titulo="Cómo la entiende el servidor" estado={tipoFinal === 'brecha' ? 'ataque' : tipoFinal === 'bloqueo' ? 'defensa' : 'dato'}>
              <div className="pasos-ruta">
                <div>
                  <span className="paso-ruta-etiqueta">{vulnerable ? 'Se arma' : 'Se resuelve'}</span>
                  <span>
                    {vulnerable ? (
                      <>
                        {BASE}/<RutaConSubidas texto={pedido} />
                      </>
                    ) : (
                      <>
                        path.resolve(<span className="cons-entrada">{BASE}</span>, <RutaConSubidas texto={pedido} />)
                      </>
                    )}
                  </span>
                </div>
                <div>
                  <span className="paso-ruta-etiqueta">Ruta final</span>
                  <span className={tipoFinal === 'brecha' ? 'dato-filtrado' : undefined}>{rutaFinal}</span>
                </div>
                {!vulnerable && (
                  <div>
                    <span className="paso-ruta-etiqueta">¿Dentro de {BASE}?</span>
                    <span className={tipoFinal === 'bloqueo' ? 'celda-firme' : undefined}>
                      {tipoFinal === 'bloqueo' ? 'No: se rechaza' : 'Sí: se permite'}
                    </span>
                  </div>
                )}
              </div>
            </Lectura>
          )}
        </form>

        <div className="lab-escena arbol-envoltura">
          <ul key={`${envios}-${modo}`} className="arbol" aria-label="Carpetas y archivos del servidor">
            {ARBOL.map((it) => {
              const o = orden.get(it.ruta);
              const visitado = o !== undefined;
              const esFinal = rutaFinal === it.ruta;
              const enBase = it.ruta === BASE || it.ruta.startsWith(BASE + '/');
              const clases = [
                'arbol-fila',
                enBase ? 'arbol-en-base' : '',
                visitado ? 'arbol-visita' : '',
                visitado && esFinal && tipoFinal ? `arbol-final-${tipoFinal}` : '',
              ]
                .filter(Boolean)
                .join(' ');
              const estilo = {
                paddingLeft: `${0.5 + it.nivel * 1.25}rem`,
                '--orden': o ?? 0,
              } as CSSProperties;
              return (
                <li key={it.ruta} className={clases} style={estilo}>
                  <Glifo nombre={it.carpeta ? 'carpeta' : 'archivo'} tamano={18} />
                  <span className="arbol-nombre">{it.nombre}</span>
                  {it.ruta === BASE && <span className="arbol-nota">carpeta pública</span>}
                  {it.ruta === '/app/config/secretos.env' && <span className="arbol-nota arbol-nota-secreta">privado</span>}
                  {it.ruta === '/etc/passwd' && <span className="arbol-nota arbol-nota-secreta">del sistema</span>}
                  {visitado && esFinal && tipoFinal === 'brecha' && <span className="arbol-marca arbol-marca-mal">leído</span>}
                  {visitado && esFinal && tipoFinal === 'ok' && <span className="arbol-marca arbol-marca-bien">entregado</span>}
                </li>
              );
            })}
          </ul>
          {resp?.tipo === 'no-existe' && (
            <p className="arbol-aviso">
              Esa ruta ({resp.ruta}) no aparece en el árbol porque no existe.
            </p>
          )}
          {resp?.tipo === 'prohibido' && (
            <p className="arbol-aviso arbol-aviso-bien">
              La ruta resuelta ({resp.ruta}) quedó fuera de la carpeta pública y se rechazó antes de abrir nada.
            </p>
          )}
          <div className="leyenda arbol-leyenda">
            <span className="leyenda-item">
              <i className="muestra muestra-base" /> carpeta que debería ser lo único alcanzable
            </span>
          </div>
        </div>
      </div>

      {veredicto && (
        <div className="lab-fila lab-fila-igual">
          <Veredicto tipo={veredicto.tipo} titulo={veredicto.titulo}>
            {veredicto.texto}
          </Veredicto>
          {contenido && resp?.tipo === 'ok' && (
            <Lectura titulo={`Contenido que se envió al navegador (${resp.ruta})`} estado={resp.fueraDeBase ? 'ataque' : 'dato'}>
              <pre className="terminal">{contenido}</pre>
            </Lectura>
          )}
        </div>
      )}
    </div>
  );
}
