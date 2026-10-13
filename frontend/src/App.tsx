import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { analizarCodigo, guardarAnalisis, listarHistorial } from './api';
import type { Hallazgo, ResultadoAnalisis } from './tipos';

const NOMBRES_VULNERABILIDAD: Record<string, string> = {
  SQL_INJECTION: 'Inyección SQL',
  XSS: 'Cross-Site Scripting (XSS)',
  HARDCODED_SECRETS: 'Credenciales codificadas en el código',
  WEAK_CRYPTO: 'Criptografía débil',
  NOSQL_INJECTION: 'Inyección NoSQL',
  PATH_TRAVERSAL: 'Path Traversal (recorrido de directorios)',
  PROTOTYPE_POLLUTION: 'Prototype Pollution',
  CORS_MISCONFIGURATION: 'Configuración insegura de CORS',
  INSECURE_SESSION_COOKIES: 'Cookies de sesión inseguras',
  SSRF: 'Server-Side Request Forgery (SSRF)',
  DANGEROUS_FUNCTIONS: 'Funciones peligrosas (eval / exec)',
  SENSITIVE_DATA_LOGGING: 'Registro de datos sensibles',
};

const COLORES_SEVERIDAD: Record<string, string> = {
  CRITICA: '#dc2626',
  ALTA: '#ea580c',
  MEDIA: '#ca8a04',
  BAJA: '#2563eb',
};

const CODIGO_EJEMPLO = `function buscarUsuario(id) {
  const password = "SuperSecreta123!";
  return db.query('SELECT * FROM users WHERE id = ' + id);
}`;

const MENSAJE_BD =
  'Revisa que DATABASE_URL esté configurada en backend/.env y que hayas corrido la migración (npx prisma migrate dev).';

function mensajeDe(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido.';
}

function esErrorDeConexion(mensaje: string): boolean {
  return mensaje.startsWith('No se pudo conectar');
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function TarjetaHallazgo({ hallazgo }: { hallazgo: Hallazgo }) {
  const color = COLORES_SEVERIDAD[hallazgo.severidad] ?? '#6b7280';
  return (
    <div className="tarjeta-hallazgo" style={{ borderLeftColor: color }}>
      <div className="tarjeta-encabezado">
        <span className="insignia" style={{ backgroundColor: color }}>
          {hallazgo.severidad}
        </span>
        <strong>{NOMBRES_VULNERABILIDAD[hallazgo.tipo] ?? hallazgo.tipo}</strong>
        <span className="linea">Línea {hallazgo.linea}</span>
      </div>
      <pre className="fragmento-codigo">{hallazgo.codigoFragmento}</pre>
      <p className="explicacion">{hallazgo.explicacion}</p>
      <p className="recomendacion">
        <strong>Recomendación: </strong>
        {hallazgo.recomendacion}
      </p>
    </div>
  );
}

interface PropsPanelGuardar {
  resultado: ResultadoAnalisis;
  nombre: string;
  onCambiarNombre: (nombre: string) => void;
  guardando: boolean;
  error: string | null;
  onGuardar: (evento: FormEvent) => void;
}

function PanelGuardar({
  resultado,
  nombre,
  onCambiarNombre,
  guardando,
  error,
  onGuardar,
}: PropsPanelGuardar) {
  if (resultado.id) {
    return (
      <div className="mensaje-ok">
        ✓ Guardado en el historial
        {resultado.nombreArchivo ? ` como "${resultado.nombreArchivo}"` : ''}.
      </div>
    );
  }

  return (
    <form className="panel-guardar" onSubmit={onGuardar}>
      <label htmlFor="nombre-analisis">Nombre para este análisis (opcional)</label>
      <div className="fila-guardar">
        <input
          id="nombre-analisis"
          type="text"
          maxLength={120}
          value={nombre}
          onChange={(e) => onCambiarNombre(e.target.value)}
          placeholder="Ej: Login del proyecto de Node"
        />
        <button type="submit" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar en el historial'}
        </button>
      </div>
      <p className="ayuda">Se guarda el código que acabas de analizar, junto con sus resultados.</p>
      {error && <div className="banner-error">{error}</div>}
    </form>
  );
}

export default function App() {
  const [codigo, setCodigo] = useState(CODIGO_EJEMPLO);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const [historial, setHistorial] = useState<ResultadoAnalisis[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    setErrorHistorial(null);
    try {
      setHistorial(await listarHistorial());
    } catch (err) {
      const mensaje = mensajeDe(err);
      setHistorial([]);
      setErrorHistorial(
        esErrorDeConexion(mensaje) ? mensaje : `No se pudo leer el historial. ${MENSAJE_BD}`,
      );
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    void cargarHistorial();
  }, [cargarHistorial]);

  async function manejarAnalizar() {
    setCargando(true);
    setError(null);
    setErrorGuardado(null);
    // Un análisis nuevo empieza sin nombre: así no arrastra el de uno guardado antes.
    setNombre('');
    try {
      const datos = await analizarCodigo(codigo);
      setResultado(datos);
    } catch (err) {
      setError(mensajeDe(err));
      setResultado(null);
    } finally {
      setCargando(false);
    }
  }

  async function manejarGuardar(evento: FormEvent) {
    evento.preventDefault();
    if (!resultado) return;

    setGuardando(true);
    setErrorGuardado(null);
    try {
      // Se guarda el código que se analizó (no lo que haya en el cuadro de texto ahora).
      const guardado = await guardarAnalisis(resultado.codigoFuente, nombre);
      setResultado(guardado);
      await cargarHistorial();
    } catch (err) {
      const mensaje = mensajeDe(err);
      setErrorGuardado(
        esErrorDeConexion(mensaje) ? mensaje : `No se pudo guardar en la base de datos. ${MENSAJE_BD}`,
      );
    } finally {
      setGuardando(false);
    }
  }

  function verAnalisisGuardado(item: ResultadoAnalisis) {
    setCodigo(item.codigoFuente);
    setNombre(item.nombreArchivo ?? '');
    setResultado(item);
    setError(null);
    setErrorGuardado(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="contenedor">
      <header>
        <h1>Detector de Vulnerabilidades en JavaScript/Node.js</h1>
        <p className="subtitulo">
          Pega un fragmento de código y la herramienta detecta y explica, de forma pedagógica,
          posibles vulnerabilidades entre 12 categorías comunes de seguridad.
        </p>
      </header>

      <textarea
        className="area-codigo"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        rows={14}
        spellCheck={false}
      />

      <button onClick={manejarAnalizar} disabled={cargando || codigo.trim().length === 0}>
        {cargando ? 'Analizando...' : 'Analizar código'}
      </button>

      {error && <div className="banner-error">{error}</div>}

      {resultado && (
        <section className="resultados">
          <h2>
            {resultado.totalHallazgos === 0
              ? 'No se encontraron vulnerabilidades conocidas en este código.'
              : `Se encontraron ${resultado.totalHallazgos} posible(s) vulnerabilidad(es)`}
          </h2>

          <PanelGuardar
            resultado={resultado}
            nombre={nombre}
            onCambiarNombre={setNombre}
            guardando={guardando}
            error={errorGuardado}
            onGuardar={manejarGuardar}
          />

          {resultado.hallazgos.map((hallazgo, indice) => (
            <TarjetaHallazgo key={indice} hallazgo={hallazgo} />
          ))}
        </section>
      )}

      <section className="historial">
        <div className="historial-encabezado">
          <h2>Historial guardado</h2>
          <button
            type="button"
            className="btn-secundario"
            onClick={() => void cargarHistorial()}
            disabled={cargandoHistorial}
          >
            {cargandoHistorial ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {errorHistorial && <div className="banner-aviso">{errorHistorial}</div>}

        {!errorHistorial && !cargandoHistorial && historial.length === 0 && (
          <p className="vacio">Todavía no has guardado ningún análisis.</p>
        )}

        <ul className="lista-historial">
          {historial.map((item) => (
            <li key={item.id} className="item-historial">
              <div className="item-datos">
                <strong>{item.nombreArchivo || 'Sin nombre'}</strong>
                <span className="item-meta">
                  {formatearFecha(item.creadoEn)} · {item.totalHallazgos} hallazgo(s)
                </span>
              </div>
              <button
                type="button"
                className="btn-secundario"
                onClick={() => verAnalisisGuardado(item)}
              >
                Ver
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
