import { useId, useState } from 'react';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena } from '../componentes/Escena';
import { FilaChips, Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  consultaSegura,
  consultaVulnerable,
  ejecutarConsulta,
  hayInyeccion,
  marcarConsulta,
  textoDe,
  type FilaResultado,
} from './logica/sql';

const EJEMPLOS = [
  { etiqueta: 'Comilla suelta', usuario: "'", clave: 'x', ayuda: 'Una sola comilla rompe la consulta: así se tantea.' },
  { etiqueta: 'Saltar la clave', usuario: "admin'--", clave: 'x', ayuda: "Todo lo que sigue a -- es un comentario." },
  { etiqueta: 'Siempre verdadero', usuario: 'x', clave: "' OR '1'='1", ayuda: "Una condición que siempre se cumple." },
  {
    etiqueta: 'Robar la tabla',
    usuario: "x' UNION SELECT id, usuario, clave, rol FROM usuarios --",
    clave: 'x',
    ayuda: 'UNION pega los datos de otra consulta.',
  },
  { etiqueta: 'Borrar la tabla', usuario: "x'; DROP TABLE usuarios; --", clave: 'x', ayuda: 'Una segunda sentencia después del punto y coma.' },
];

function celda(v: FilaResultado[keyof FilaResultado]): string {
  return v === null ? 'NULL' : String(v);
}

interface PropsLabSql extends PropsLab {
  /** Versión reducida para la portada: solo formulario, consulta y veredicto. */
  compacto?: boolean;
}

export default function LabSql({ modo, compacto = false }: PropsLabSql) {
  const id = useId();
  const [usuario, setUsuario] = useState('ana');
  const [clave, setClave] = useState('mango2024');
  const [envios, setEnvios] = useState(0);

  const segmentos = consultaVulnerable(usuario, clave);
  const piezas = marcarConsulta(segmentos);
  const inyecta = hayInyeccion(segmentos);

  // Resultado según la versión del código
  const vulnerable = modo === 'vulnerable';
  const resultado = vulnerable ? ejecutarConsulta(textoDe(segmentos)) : null;
  const filasSeguras = vulnerable ? [] : consultaSegura(usuario, clave);
  const filas: FilaResultado[] =
    resultado?.tipo === 'filas' ? resultado.filas : filasSeguras.map((f) => ({ ...f }));
  const extras = resultado?.tipo === 'filas' ? resultado.extras : [];
  const legitimo = filas.length === 1 && filas[0].usuario === usuario && filas[0].clave === clave;

  type Estado = 'brecha' | 'bloqueado' | 'ok' | 'aviso' | 'neutro';
  let estado: Estado = 'neutro';
  let titulo = '';
  let detalle = '';
  if (resultado?.tipo === 'error') {
    estado = 'aviso';
    titulo = 'La consulta se rompió';
    detalle = `La base responde: ${resultado.mensaje}. Un error así le confirma al atacante que su texto llegó al SQL.`;
  } else if (extras.length > 0) {
    estado = 'brecha';
    titulo = 'Se ejecutó otra sentencia que tú no escribiste';
    detalle = `Además de la consulta, la base ejecutó: ${extras.join('; ')}.`;
  } else if (filas.length > 0 && !legitimo) {
    estado = 'brecha';
    titulo = 'Entró sin conocer la clave';
    detalle = `La base devolvió ${filas.length} fila(s) y la aplicación inició sesión como «${celda(filas[0].usuario)}».`;
  } else if (legitimo) {
    estado = 'ok';
    titulo = 'Inicio de sesión normal';
    detalle = `Coincide exactamente un usuario: ${celda(filas[0].usuario)}.`;
  } else if (!vulnerable && inyecta) {
    estado = 'bloqueado';
    titulo = 'Ataque bloqueado';
    detalle = 'La base comparó ese texto como un nombre de usuario cualquiera. Nadie se llama así, así que no hay filas.';
  } else {
    estado = 'neutro';
    titulo = 'Usuario o clave incorrectos';
    detalle = 'No coincide ninguna fila.';
  }

  const hayAtaque = inyecta && vulnerable && (estado === 'brecha' || estado === 'aviso');
  const colorEnlace = hayAtaque ? 'ataque' : vulnerable ? 'dato' : 'defensa';

  const elegir = (i: number) => {
    setUsuario(EJEMPLOS[i].usuario);
    setClave(EJEMPLOS[i].clave);
    setEnvios((n) => n + 1);
  };

  return (
    <div className={`lab lab-sql${compacto ? ' lab-compacto' : ''}`}>
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            setEnvios((n) => n + 1);
          }}
        >
          <div className="campo">
            <label htmlFor={`${id}-u`}>Usuario</label>
            <input
              id={`${id}-u`}
              className="entrada"
              value={usuario}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor={`${id}-c`}>Contraseña (visible para que veas qué escribes)</label>
            <input
              id={`${id}-c`}
              className="entrada"
              value={clave}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>
          <button type="submit" className="boton">
            Iniciar sesión
          </button>
          <FilaChips
            titulo={compacto ? 'Prueba con' : 'O prueba un ataque con un clic'}
            items={(compacto ? EJEMPLOS.slice(0, 3) : EJEMPLOS).map((e) => ({ etiqueta: e.etiqueta, ayuda: e.ayuda }))}
            alElegir={elegir}
          />
          {!compacto && (
            <button
              type="button"
              className="boton boton-fantasma boton-chico"
              onClick={() => {
                setUsuario('ana');
                setClave('mango2024');
                setEnvios((n) => n + 1);
              }}
            >
              Volver al inicio de sesión normal
            </button>
          )}
        </form>

        {!compacto && (
          <div className="lab-escena">
            <Escena ancho={520} alto={215} titulo="La persona envía usuario y clave a la aplicación, que consulta la base de datos" reinicio={envios}>
              <Enlace d="M112 88 H208" estado={hayAtaque ? 'ataque' : 'dato'} />
              <Enlace d="M312 88 H408" estado={colorEnlace} />
              <Nodo x={70} y={88} glifo={hayAtaque ? 'atacante' : 'persona'} etiqueta="Quien escribe" estado={hayAtaque ? 'ataque' : 'normal'} />
              <Nodo x={260} y={88} glifo="servidor" etiqueta="Aplicación" sub="arma la consulta" />
              <Nodo
                x={450}
                y={88}
                glifo="base"
                etiqueta="Base de datos"
                sub="tabla usuarios"
                estado={estado === 'brecha' ? 'ataque' : !vulnerable ? 'defensa' : 'normal'}
              />
              {envios > 0 && (
                <>
                  <Paquete d="M112 88 H208" estado={hayAtaque ? 'ataque' : 'dato'} dur={1} />
                  <Paquete d="M312 88 H408" estado={colorEnlace} dur={1} retardo={1.1} />
                  {estado === 'brecha' && <Impacto x={450} y={36} tipo="brecha" retardo={2.1} />}
                  {estado === 'bloqueado' && <Impacto x={450} y={36} tipo="bloqueo" retardo={2.1} />}
                  {estado === 'ok' && <Impacto x={450} y={36} tipo="ok" retardo={2.1} />}
                </>
              )}
              <TextoEscena x={260} y={180} estado={vulnerable ? 'ataque' : 'defensa'}>
                {vulnerable
                  ? 'El texto se pega dentro de la consulta'
                  : 'El texto viaja aparte, solo como dato'}
              </TextoEscena>
            </Escena>
          </div>
        )}
      </div>

      <div className="lab-lecturas">
        {vulnerable ? (
          <Lectura titulo="Consulta que recibe la base de datos" estado={inyecta ? 'ataque' : 'dato'}>
            <div className="consulta">
              {piezas.map((p, i) => (
                <span
                  key={i}
                  className={`${p.entrada ? 'cons-entrada' : ''}${p.inyectado ? ' cons-inyectado' : ''}`}
                >
                  {p.texto}
                </span>
              ))}
            </div>
            <div className="leyenda">
              <span className="leyenda-item">
                <i className="muestra muestra-entrada" /> lo que escribiste
              </span>
              <span className="leyenda-item">
                <i className="muestra muestra-inyectado" /> se volvió parte del SQL
              </span>
            </div>
          </Lectura>
        ) : (
          <Lectura titulo="Consulta que recibe la base de datos" estado="defensa">
            <div className="consulta">SELECT * FROM usuarios WHERE usuario = $1 AND clave = $2</div>
            <div className="parametros">
              <span>
                <b>$1</b> = <span className="cons-entrada">{JSON.stringify(usuario)}</span>
              </span>
              <span>
                <b>$2</b> = <span className="cons-entrada">{JSON.stringify(clave)}</span>
              </span>
            </div>
            <div className="leyenda">
              <span className="leyenda-item">La estructura va por un lado y los valores por otro: nunca se mezclan.</span>
            </div>
          </Lectura>
        )}

        {envios > 0 && (
          <div className="lab-resultado">
            <Veredicto tipo={estado} titulo={titulo}>
              {detalle}
            </Veredicto>
            {!compacto && filas.length > 0 && (
              <div className="tabla-envoltura">
                <table className="tabla-datos">
                  <caption className="solo-lectores">Filas que devolvió la base de datos</caption>
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>usuario</th>
                      <th>clave</th>
                      <th>rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i}>
                        <td>{celda(f.id)}</td>
                        <td>{celda(f.usuario)}</td>
                        <td className={estado === 'brecha' ? 'dato-filtrado' : ''}>{celda(f.clave)}</td>
                        <td>{celda(f.rol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
