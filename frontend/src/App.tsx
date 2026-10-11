import { useState } from 'react';
import { analizarCodigo } from './api';
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

export default function App() {
  const [codigo, setCodigo] = useState(CODIGO_EJEMPLO);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarAnalizar() {
    setCargando(true);
    setError(null);
    try {
      const datos = await analizarCodigo(codigo);
      setResultado(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido.');
      setResultado(null);
    } finally {
      setCargando(false);
    }
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
          {resultado.hallazgos.map((hallazgo, indice) => (
            <TarjetaHallazgo key={indice} hallazgo={hallazgo} />
          ))}
        </section>
      )}
    </div>
  );
}
