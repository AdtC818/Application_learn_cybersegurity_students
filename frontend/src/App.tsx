import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { analizarCodigo, guardarAnalisis, listarHistorial } from './api';
import type { ResultadoAnalisis } from './tipos';
import { CODIGO_INICIAL } from './contenido/ejemplos';
import { useRuta } from './hooks/useRuta';
import { MarcadoresSvg } from './componentes/Escena';
import Encabezado from './componentes/Encabezado';
import Hero from './componentes/Hero';
import Editor from './componentes/Editor';
import Resultados from './componentes/Resultados';
import Historial from './componentes/Historial';
import { GaleriaLaboratorios, VistaLaboratorio } from './componentes/Laboratorios';

const MENSAJE_BD =
  'Revisa que DATABASE_URL esté configurada en backend/.env y que hayas corrido la migración (npx prisma migrate dev).';

function mensajeDe(err: unknown): string {
  return err instanceof Error ? err.message : 'Error desconocido.';
}

function esErrorDeConexion(mensaje: string): boolean {
  return mensaje.startsWith('No se pudo conectar');
}

export default function App() {
  const ruta = useRuta();
  const principalRef = useRef<HTMLElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);
  const debeDesplazar = useRef(false);

  const [codigo, setCodigo] = useState(CODIGO_INICIAL);
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

  // Tras un análisis nuevo, lleva la vista a los resultados.
  useEffect(() => {
    if (debeDesplazar.current && resultado) {
      debeDesplazar.current = false;
      resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [resultado]);

  async function manejarAnalizar() {
    setCargando(true);
    setError(null);
    setErrorGuardado(null);
    // Un análisis nuevo empieza sin nombre: así no arrastra el de uno guardado antes.
    setNombre('');
    try {
      const datos = await analizarCodigo(codigo);
      debeDesplazar.current = true;
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
    debeDesplazar.current = true;
  }

  const saltarAlContenido = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    principalRef.current?.focus();
  };

  return (
    <>
      <MarcadoresSvg />
      <a href="#contenido-principal" className="saltar" onClick={saltarAlContenido}>
        Saltar al contenido
      </a>
      <Encabezado ruta={ruta} />

      <main id="contenido-principal" ref={principalRef} tabIndex={-1} className="principal">
        {ruta.vista === 'analizar' && (
          <>
            <Hero />

            <div id="analizador" className="bloque-analizador">
              <Editor codigo={codigo} alCambiar={setCodigo} alAnalizar={manejarAnalizar} cargando={cargando} />
              {error && <div className="aviso aviso-error">{error}</div>}
            </div>

            <div ref={resultadosRef} className="ancla-resultados">
              {resultado && (
                <Resultados
                  key={resultado.codigoFuente}
                  resultado={resultado}
                  nombre={nombre}
                  alCambiarNombre={setNombre}
                  guardando={guardando}
                  error={errorGuardado}
                  alGuardar={manejarGuardar}
                />
              )}
            </div>

            <Historial
              historial={historial}
              cargando={cargandoHistorial}
              error={errorHistorial}
              alActualizar={() => void cargarHistorial()}
              alVer={verAnalisisGuardado}
            />
          </>
        )}

        {ruta.vista === 'labs' && <GaleriaLaboratorios />}
        {ruta.vista === 'lab' && <VistaLaboratorio slug={ruta.slug} />}
      </main>

      <footer className="pie">
        <p>
          Herramienta educativa. El código que pegas se analiza sin ejecutarse, y los laboratorios son simulaciones
          que no tocan ningún sistema real.
        </p>
      </footer>
    </>
  );
}
