import { Fragment, useId, useState } from 'react';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena, type EstadoEscena } from '../componentes/Escena';
import { Lectura, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  filtraciones,
  logSeguro,
  logVulnerable,
  redactarCampo,
  type DatosLogin,
} from './logica/logs';

const INICIAL: DatosLogin = { email: 'ana@correo.com', password: 'mango2024', tarjeta: '4111 1111 1111 1111' };

interface LineaLog {
  texto: string;
  secretos: string[];
}

const escaparRegex = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function LineaResaltada({ linea }: { linea: LineaLog }) {
  if (linea.secretos.length === 0) return <>{linea.texto}</>;
  const partes = linea.texto.split(new RegExp(`(${linea.secretos.map(escaparRegex).join('|')})`));
  return (
    <>
      {partes.map((p, i) =>
        linea.secretos.includes(p) ? (
          <mark key={i} className="dato-secreto">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const ETIQUETA_FUGA: Record<'password' | 'tarjeta' | 'email', string> = {
  password: 'contraseña',
  tarjeta: 'número de tarjeta',
  email: 'correo completo',
};

function LabLogsInterno({ modo }: PropsLab) {
  const id = useId();
  const vulnerable = modo === 'vulnerable';
  const [datos, setDatos] = useState<DatosLogin>(INICIAL);
  const [lineas, setLineas] = useState<LineaLog[]>([]);
  const [ultimo, setUltimo] = useState<DatosLogin | null>(null);
  const [envios, setEnvios] = useState(0);

  const enviar = () => {
    const nuevas = vulnerable ? logVulnerable(datos, new Date()) : logSeguro(datos, new Date());
    const secretos = [datos.password, datos.tarjeta, datos.email].filter((s) => s.length > 0);
    setLineas((l) => [...l, ...nuevas.map((texto) => ({ texto, secretos }))].slice(-6));
    setUltimo({ ...datos });
    setEnvios((n) => n + 1);
  };

  const ultimasLineas = lineas.length ? [lineas[lineas.length - 1].texto] : [];
  const fugas = ultimo ? filtraciones(ultimasLineas, ultimo) : [];
  const graves = fugas.filter((f) => f !== 'email');
  const hayFuga = fugas.length > 0;

  const estadoLectores: EstadoEscena = ultimo ? (hayFuga ? 'ataque' : 'defensa') : 'normal';
  const colorSalida: EstadoEscena = hayFuga ? 'ataque' : 'dato';

  const campo = (nombre: keyof DatosLogin, etiqueta: string) => (
    <div className="campo">
      <label htmlFor={`${id}-${nombre}`}>{etiqueta}</label>
      <input
        id={`${id}-${nombre}`}
        className="entrada"
        value={datos[nombre]}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setDatos((d) => ({ ...d, [nombre]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="lab lab-logs">
      <div className="lab-fila">
        <form
          className="lab-controles"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          {campo('email', 'Correo')}
          {campo('password', 'Contraseña (visible para que veas qué escribes)')}
          {campo('tarjeta', 'Tarjeta (número de prueba)')}
          <div className="atacante-botones">
            <button type="submit" className="boton">
              Iniciar sesión
            </button>
            <button
              type="button"
              className="boton boton-fantasma"
              onClick={() => {
                setLineas([]);
                setUltimo(null);
                setEnvios(0);
              }}
            >
              Vaciar el log
            </button>
          </div>
          <Lectura titulo="Lo que escribe tu código" estado={vulnerable ? 'ataque' : 'defensa'}>
            {vulnerable ? (
              <div className="consulta">
                console.log(&apos;Login recibido:&apos;, <span className="cons-inyectado">email, password, tarjeta</span>)
              </div>
            ) : (
              <div className="consulta">
                logger.info({'{'} evento: &apos;login&apos;, email: <span className="cons-entrada">enmascarar(email)</span> {'}'})
              </div>
            )}
          </Lectura>
        </form>

        <div className="lab-escena">
          <Escena
            ancho={580}
            alto={250}
            titulo="Tu aplicación escribe en un archivo de logs que pueden leer el equipo de soporte, un servicio externo y quien robe una copia"
            reinicio={`${envios}-${modo}`}
          >
            <Enlace d="M104 116 H188" estado={colorSalida} />
            <Enlace d="M272 116 C 340 116 380 36 444 36" estado={ultimo ? colorSalida : 'apagado'} punteada={!ultimo} />
            <Enlace d="M272 116 H444" estado={ultimo ? colorSalida : 'apagado'} punteada={!ultimo} />
            <Enlace d="M272 116 C 340 116 380 196 444 196" estado={ultimo ? colorSalida : 'apagado'} punteada={!ultimo} />
            <Nodo x={62} y={116} glifo="servidor" etiqueta="Tu aplicación" sub="recibe el login" />
            <Nodo x={230} y={116} glifo="registro" etiqueta="app.log" sub="se guarda en texto" estado={ultimo ? (hayFuga ? 'ataque' : 'defensa') : 'normal'} />
            <Nodo x={480} y={36} glifo="persona" etiqueta="Equipo de soporte" ancho={64} alto={40} estado={estadoLectores} />
            <Nodo x={480} y={116} glifo="nube" etiqueta="Servicio de logs externo" ancho={64} alto={40} estado={estadoLectores} />
            <Nodo x={480} y={196} glifo="atacante" etiqueta="Quien robe una copia" ancho={64} alto={40} estado={estadoLectores} />
            {ultimo && (
              <>
                <Paquete
                  d="M104 116 H188"
                  estado={colorSalida}
                  dur={0.9}
                  texto={vulnerable ? ultimo.password.slice(0, 12) : undefined}
                />
                <Paquete d="M272 116 C 340 116 380 36 444 36" estado={colorSalida} dur={1.1} retardo={1} />
                <Paquete d="M272 116 H444" estado={colorSalida} dur={1.1} retardo={1} />
                <Paquete d="M272 116 C 340 116 380 196 444 196" estado={colorSalida} dur={1.1} retardo={1} />
                {hayFuga && <Impacto x={546} y={196} tipo="brecha" retardo={2.1} />}
                {!hayFuga && <Impacto x={546} y={196} tipo="ok" retardo={2.1} />}
              </>
            )}
            <TextoEscena x={290} y={242} estado={vulnerable ? 'ataque' : 'defensa'}>
              {vulnerable ? 'Todo el que lea el log ve la contraseña y la tarjeta' : 'El log solo guarda lo mínimo y enmascarado'}
            </TextoEscena>
          </Escena>
        </div>
      </div>

      <div className="lab-fila lab-fila-igual">
        <div>
          <Lectura titulo="app.log" estado={ultimo ? (hayFuga ? 'ataque' : 'defensa') : 'dato'}>
            {lineas.length === 0 ? (
              <span className="celda-quieta">El archivo está vacío. Inicia sesión para ver qué se escribe.</span>
            ) : (
              <pre className="terminal registro-log">
                {lineas.map((l, i) => (
                  <span key={i}>
                    <LineaResaltada linea={l} />
                    {'\n'}
                  </span>
                ))}
              </pre>
            )}
          </Lectura>
        </div>

        <div className="lab-lecturas">
          {ultimo && (
            <Veredicto
              tipo={hayFuga ? 'brecha' : 'bloqueado'}
              titulo={
                hayFuga
                  ? `${fugas.length} dato${fugas.length === 1 ? '' : 's'} sensible${fugas.length === 1 ? '' : 's'} quedaron escritos en el log`
                  : 'El log no contiene datos sensibles'
              }
            >
              {hayFuga ? (
                <>
                  Quedaron a la vista: {fugas.map((f) => ETIQUETA_FUGA[f]).join(', ')}.{' '}
                  {graves.length > 0
                    ? 'Los logs suelen copiarse, enviarse a servicios externos y guardarse por meses: ese dato ya no está bajo tu control.'
                    : 'Un correo es un dato personal: tampoco debería quedar completo en un log.'}
                </>
              ) : (
                'Solo quedó lo mínimo para investigar un problema: el correo enmascarado. Ni la contraseña ni la tarjeta se escribieron.'
              )}
            </Veredicto>
          )}

          {!vulnerable && (
            <Lectura titulo="Qué hace un logger configurado para redactar" estado="defensa" mono={false}>
              <table className="tabla-datos tabla-redaccion">
                <caption className="solo-lectores">Valor original y valor que quedaría en el log</caption>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Valor</th>
                    <th>En el log</th>
                  </tr>
                </thead>
                <tbody>
                  {(['email', 'password', 'tarjeta'] as const).map((c) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td className="celda-quieta">{datos[c] || '—'}</td>
                      <td className="celda-firme">{datos[c] ? redactarCampo(c, datos[c]) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Lectura>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LabLogs({ modo }: PropsLab) {
  return <LabLogsInterno key={modo} modo={modo} />;
}
