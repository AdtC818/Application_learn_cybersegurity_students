import { useEffect, useMemo, useRef, useState } from 'react';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  DICCIONARIO,
  ITERACIONES_PBKDF2,
  USUARIOS_CLAVES,
  crackearMd5,
  duracionLegible,
  md5,
  medirVelocidades,
  pbkdf2Hex,
  type Medicion,
} from './logica/cripto';

const SAL_TUYA = 'v5Ne';

const CLAVES_EJEMPLO = ['123456', 'password', 'mango2024', 'Verde-Lluvia-Tunja-82!'];

const ESPACIOS = [
  { etiqueta: '6 dígitos', combinaciones: 1e6, texto: '1 millón' },
  { etiqueta: '8 letras minúsculas', combinaciones: 26 ** 8, texto: '209 mil millones' },
  { etiqueta: '8 caracteres variados', combinaciones: 95 ** 8, texto: '6.600 billones' },
  { etiqueta: '4 palabras al azar', combinaciones: 7776 ** 4, texto: '3.600 billones' },
];

let medicionCache: Promise<Medicion> | null = null;
function medirUnaVez(): Promise<Medicion> {
  medicionCache ??= medirVelocidades();
  return medicionCache;
}

const esperar = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function formatoNumero(n: number): string {
  return Math.round(n).toLocaleString('es-CO');
}

function tiempoLargo(segundos: number): string {
  const anios = segundos / (86400 * 365);
  if (anios > 1e6) return 'millones de años';
  if (anios > 1000) return 'miles de años';
  return duracionLegible(segundos);
}

function colorTiempo(segundos: number): string {
  if (segundos < 86400) return 'tiempo-malo';
  if (segundos < 86400 * 365) return 'tiempo-medio';
  return 'tiempo-bueno';
}

type EstadoFila = 'espera' | 'probando' | 'roto' | 'fallo';

interface Resultado {
  estado: EstadoFila;
  intentos: number;
  clave?: string;
}

interface Fila {
  nombre: string;
  sal: string;
  hash: string;
  esTuya?: boolean;
}

function corto(hash: string): string {
  return hash.length > 22 ? `${hash.slice(0, 22)}…` : hash;
}

function GraficoVelocidad({ medicion }: { medicion: Medicion | null }) {
  const md5s = medicion?.md5PorSegundo ?? 0;
  const pbk = medicion ? 1000 / medicion.pbkdf2Ms : 0;
  const maxLog = Math.max(Math.log10(md5s || 10), 1);
  const pct = (v: number) => (v > 0 ? Math.max(2, (Math.log10(Math.max(v, 1)) / maxLog) * 100) : 0);
  const marcas = [1, 10, 100, 1e3, 1e4, 1e5, 1e6].filter((m) => Math.log10(m) <= maxLog + 0.2);
  const textoMarca = (m: number) => (m >= 1e6 ? '1 M' : m >= 1e3 ? `${m / 1e3} mil` : String(m));

  const fila = (nombre: string, detalle: string, valor: number, clase: 'mala' | 'buena') => (
    <div className="grafico-fila">
      <div className="grafico-etiqueta">
        <strong>{nombre}</strong>
        <span>{detalle}</span>
      </div>
      <div className="grafico-pista">
        {marcas.map((m) => (
          <i key={m} className="grafico-guia" style={{ left: `${(Math.log10(m) / maxLog) * 100}%` }} />
        ))}
        <div className={`grafico-barra grafico-barra-${clase}`} style={{ width: `${pct(valor)}%` }} />
      </div>
      <div className={`grafico-valor ${clase === 'mala' ? 'esc-ataque' : 'esc-defensa'}`}>
        {medicion ? `≈ ${formatoNumero(valor)}` : '…'}
      </div>
    </div>
  );

  return (
    <div
      className="grafico"
      role="img"
      aria-label={
        medicion
          ? `Claves por segundo en tu navegador: MD5 unas ${formatoNumero(md5s)}, PBKDF2 unas ${formatoNumero(pbk)}. Escala logarítmica.`
          : 'Midiendo cuántas claves por segundo se pueden probar con MD5 y con PBKDF2.'
      }
    >
      <p className="grafico-titulo">Claves que se pueden probar por segundo (escala logarítmica)</p>
      {fila('MD5', 'un solo paso', md5s, 'mala')}
      {fila('PBKDF2', `${formatoNumero(ITERACIONES_PBKDF2)} vueltas`, pbk, 'buena')}
      <div className="grafico-fila grafico-eje-fila" aria-hidden="true">
        <div />
        <div className="grafico-eje">
          {marcas.map((m) => (
            <span key={m} style={{ left: `${(Math.log10(m) / maxLog) * 100}%` }}>
              {textoMarca(m)}
            </span>
          ))}
        </div>
        <div />
      </div>
    </div>
  );
}

function LabCriptoInterno({ modo }: PropsLab) {
  const vulnerable = modo === 'vulnerable';
  const [clave, setClave] = useState('mango2024');
  const [elegida, setElegida] = useState<number | null>(2);
  const [medicion, setMedicion] = useState<Medicion | null>(null);
  const [hashesSeguros, setHashesSeguros] = useState<Record<string, string>>({});
  const [hashTuyoSeguro, setHashTuyoSeguro] = useState('');
  const [resultados, setResultados] = useState<Record<string, Resultado>>({});
  const [atacando, setAtacando] = useState(false);
  const [computoMs, setComputoMs] = useState<number | null>(null);
  const cancelado = useRef(false);

  useEffect(() => {
    cancelado.current = false;
    return () => {
      cancelado.current = true;
    };
  }, []);

  useEffect(() => {
    let vivo = true;
    medirUnaVez().then((m) => vivo && setMedicion(m));
    return () => {
      vivo = false;
    };
  }, []);

  // Hashes lentos y con sal de los usuarios de ejemplo (solo en la versión segura)
  useEffect(() => {
    if (vulnerable) return;
    let vivo = true;
    Promise.all(USUARIOS_CLAVES.map((u) => pbkdf2Hex(u.clave, u.sal))).then((hs) => {
      if (vivo) setHashesSeguros(Object.fromEntries(USUARIOS_CLAVES.map((u, i) => [u.nombre, hs[i]])));
    });
    return () => {
      vivo = false;
    };
  }, [vulnerable]);

  useEffect(() => {
    if (vulnerable) return;
    let vivo = true;
    setHashTuyoSeguro('…');
    const t = window.setTimeout(() => {
      pbkdf2Hex(clave, SAL_TUYA).then((h) => vivo && setHashTuyoSeguro(h));
    }, 180);
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
  }, [clave, vulnerable]);

  const hashMd5Tuyo = useMemo(() => md5(clave), [clave]);
  const hashTuyo = vulnerable ? hashMd5Tuyo : hashTuyoSeguro;

  const filas: Fila[] = useMemo(() => {
    const base: Fila[] = USUARIOS_CLAVES.map((u) => ({
      nombre: u.nombre,
      sal: vulnerable ? '' : u.sal,
      hash: vulnerable ? md5(u.clave) : (hashesSeguros[u.nombre] ?? '…'),
    }));
    base.push({ nombre: 'tú', sal: vulnerable ? '' : SAL_TUYA, hash: hashTuyo, esTuya: true });
    return base;
  }, [vulnerable, hashesSeguros, hashTuyo]);

  // Quiénes comparten hash (misma contraseña, mismo hash)
  const repetidos = useMemo(() => {
    const cuenta = new Map<string, string[]>();
    for (const f of filas) {
      if (f.hash === '…') continue;
      cuenta.set(f.hash, [...(cuenta.get(f.hash) ?? []), f.nombre]);
    }
    return filas.map((f) => (cuenta.get(f.hash)?.length ?? 0) > 1 ? cuenta.get(f.hash)!.filter((n) => n !== f.nombre) : []);
  }, [filas]);

  const atacar = async () => {
    if (atacando) return;
    setAtacando(true);
    setComputoMs(null);
    const inicial: Record<string, Resultado> = {};
    for (const f of filas) inicial[f.nombre] = { estado: 'espera', intentos: 0 };
    setResultados(inicial);
    let computo = 0;

    for (const f of filas) {
      if (cancelado.current) return;
      setResultados((r) => ({ ...r, [f.nombre]: { estado: 'probando', intentos: 0 } }));
      if (vulnerable) {
        const t0 = performance.now();
        const r = crackearMd5(f.hash);
        computo += performance.now() - t0;
        await esperar(420);
        if (cancelado.current) return;
        setResultados((rs) => ({
          ...rs,
          [f.nombre]: { estado: r.encontrada ? 'roto' : 'fallo', intentos: r.intentos, clave: r.encontrada ?? undefined },
        }));
      } else {
        let encontrada: string | undefined;
        let intentos = 0;
        for (const palabra of DICCIONARIO) {
          intentos++;
          setResultados((rs) => ({ ...rs, [f.nombre]: { estado: 'probando', intentos } }));
          const t0 = performance.now();
          const h = await pbkdf2Hex(palabra, f.sal);
          computo += performance.now() - t0;
          if (cancelado.current) return;
          if (h === f.hash) {
            encontrada = palabra;
            break;
          }
        }
        setResultados((rs) => ({
          ...rs,
          [f.nombre]: { estado: encontrada ? 'roto' : 'fallo', intentos, clave: encontrada },
        }));
      }
    }
    setComputoMs(computo);
    setAtacando(false);
  };

  const terminado = computoMs !== null;
  const rotas = Object.values(resultados).filter((r) => r.estado === 'roto').length;

  const tiempoTexto =
    computoMs === null
      ? ''
      : computoMs < 1000
        ? `${computoMs.toLocaleString('es-CO', { maximumFractionDigits: 1 })} milisegundos`
        : `${(computoMs / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} segundos`;

  const md5s = medicion?.md5PorSegundo ?? 0;
  const pbkdf2s = medicion ? 1000 / medicion.pbkdf2Ms : 0;

  return (
    <div className="lab lab-cripto">
      <div className="lab-fila">
        <div className="lab-controles">
          <div className="campo">
            <label htmlFor="cripto-clave">Contraseña que elige una persona al registrarse</label>
            <input
              id="cripto-clave"
              className="entrada"
              value={clave}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setClave(e.target.value);
                setElegida(null);
                setResultados({});
                setComputoMs(null);
              }}
            />
          </div>
          <FilaChips
            titulo="O elige una de estas"
            items={CLAVES_EJEMPLO.map((c) => ({ etiqueta: c }))}
            ataque={false}
            activo={elegida}
            alElegir={(i) => {
              setElegida(i);
              setClave(CLAVES_EJEMPLO[i]);
              setResultados({});
              setComputoMs(null);
            }}
          />
          <Lectura titulo={vulnerable ? 'Lo que guarda la base de datos (MD5)' : 'Lo que guarda la base de datos (sal + PBKDF2)'} estado={vulnerable ? 'ataque' : 'defensa'}>
            {vulnerable ? (
              <>
                <div>
                  MD5(<span className="cons-entrada">{clave || '(vacío)'}</span>)
                </div>
                <div className="hash-largo">{hashMd5Tuyo}</div>
                <div className="leyenda">
                  <span className="leyenda-item">Siempre sale el mismo resultado para la misma contraseña.</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  sal <span className="cons-entrada">{SAL_TUYA}</span> + <span className="cons-entrada">{clave || '(vacío)'}</span>
                </div>
                <div className="hash-largo">{hashTuyoSeguro || '…'}</div>
                <div className="leyenda">
                  <span className="leyenda-item">
                    Cada persona tiene su propia sal y cada intento cuesta {formatoNumero(ITERACIONES_PBKDF2)} vueltas.
                  </span>
                </div>
              </>
            )}
          </Lectura>
        </div>

        <div className="lab-escena">
          <GraficoVelocidad medicion={medicion} />
          <p className="grafico-nota">
            Medido ahora mismo en tu navegador, con un solo núcleo. Una tarjeta gráfica actual prueba más de 100.000
            millones de MD5 por segundo: la distancia real es todavía mayor.
          </p>
        </div>
      </div>

      <div className="cripto-ataque">
        <div className="etapa-barra">
          <h4 className="sub sub-corto">La base de datos se filtró. Esto es lo que ve quien la robó.</h4>
          <button type="button" className="boton boton-ataque" onClick={atacar} disabled={atacando}>
            {atacando ? 'Probando contraseñas…' : 'Atacar con 12 contraseñas comunes'}
          </button>
        </div>

        <div className="tabla-envoltura">
          <table className="tabla-datos tabla-hashes">
            <caption className="solo-lectores">Usuarios, su hash guardado y el resultado del ataque</caption>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Hash guardado</th>
                <th>Resultado del ataque</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const r = resultados[f.nombre];
                const iguales = repetidos[i];
                return (
                  <tr key={f.nombre} className={f.esTuya ? 'fila-tuya' : undefined}>
                    <td>{f.nombre}</td>
                    <td>
                      <code className={`codigo hash-corto${iguales.length ? ' hash-igual' : ''}`} title={f.hash}>
                        {corto(f.hash)}
                      </code>
                      {iguales.length > 0 && <span className="hash-aviso">igual que {iguales.join(', ')}</span>}
                    </td>
                    <td>
                      {!r || r.estado === 'espera' ? (
                        <span className="celda-quieta">—</span>
                      ) : r.estado === 'probando' ? (
                        <span className="celda-probando">
                          probando{r.intentos ? ` (${r.intentos}/${DICCIONARIO.length})` : '…'}
                        </span>
                      ) : r.estado === 'roto' ? (
                        <span className="celda-rota">
                          Era «<b>{r.clave}</b>» · intento {r.intentos}
                        </span>
                      ) : (
                        <span className="celda-firme">No está en el diccionario</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {terminado && (
          <Veredicto
            tipo={vulnerable ? 'brecha' : 'aviso'}
            titulo={
              vulnerable
                ? `Rompió ${rotas} de ${filas.length} contraseñas en ${tiempoTexto}`
                : `Rompió ${rotas} de ${filas.length} contraseñas, pero tardó ${tiempoTexto}`
            }
          >
            {vulnerable
              ? 'El hash es tan rápido que probar todo el diccionario es instantáneo. Además, quienes comparten contraseña comparten hash: romper uno rompe a todos.'
              : 'Un hash lento no vuelve fuerte una contraseña débil: «123456» sigue cayendo. Lo que cambia es el costo de cada intento (mira la tabla de abajo) y que cada hash lleva su sal.'}
          </Veredicto>
        )}
      </div>

      <div className="cripto-tiempos">
        <h4 className="sub">Cuánto tardaría en probar todas las combinaciones posibles</h4>
        <div className="tabla-envoltura">
          <table className="tabla-datos">
            <caption className="solo-lectores">Tiempo para agotar todas las combinaciones según el tipo de contraseña y el hash</caption>
            <thead>
              <tr>
                <th>Si la contraseña es…</th>
                <th>Combinaciones</th>
                <th>Con MD5</th>
                <th>Con PBKDF2</th>
              </tr>
            </thead>
            <tbody>
              {ESPACIOS.map((e) => {
                const sMd5 = md5s ? e.combinaciones / md5s : null;
                const sPbk = pbkdf2s ? e.combinaciones / pbkdf2s : null;
                return (
                  <tr key={e.etiqueta}>
                    <td>{e.etiqueta}</td>
                    <td>{e.texto}</td>
                    <td className={sMd5 === null ? '' : colorTiempo(sMd5)}>{sMd5 === null ? '…' : tiempoLargo(sMd5)}</td>
                    <td className={sPbk === null ? '' : colorTiempo(sPbk)}>{sPbk === null ? '…' : tiempoLargo(sPbk)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="grafico-nota">
          Tiempos en tu navegador, con un solo núcleo. Quien ataca de verdad usa tarjetas gráficas (más de 100.000
          millones de MD5 por segundo): con MD5, esos «900 años» se vuelven horas o pocos días. Con un hash lento, cada
          intento sigue costando muchísimo más.
        </p>
      </div>
    </div>
  );
}

export default function LabCripto({ modo }: PropsLab) {
  return <LabCriptoInterno key={modo} modo={modo} />;
}
