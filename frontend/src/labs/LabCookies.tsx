import { useState } from 'react';
import { Glifo } from '../componentes/Glifos';
import EscenaFlujo, { type NodoFlujo } from './EscenaFlujo';
import { FilaChips, Veredicto } from './piezas';
import type { PropsLab } from './tipos';
import {
  advertencias,
  cuantasProtecciones,
  simularAtaque,
  type Ataque,
  type BanderasCookie,
} from './logica/cookies';

const SAME_SITE: Array<{ valor: BanderasCookie['sameSite']; etiqueta: string; ayuda: string }> = [
  { valor: 'sin', etiqueta: 'Sin declarar', ayuda: 'No se escribe SameSite: cada navegador hace lo que quiere.' },
  { valor: 'None', etiqueta: 'None', ayuda: 'La cookie viaja también en peticiones que vienen de otros sitios.' },
  { valor: 'Lax', etiqueta: 'Lax', ayuda: 'No viaja en formularios ni peticiones automáticas desde otros sitios.' },
  { valor: 'Strict', etiqueta: 'Strict', ayuda: 'Solo viaja si la petición nace en tu propio sitio.' },
];

const ATAQUES: Array<{ id: Ataque; nombre: string; resumen: string }> = [
  { id: 'xss', nombre: 'Un script inyectado lee la cookie', resumen: 'XSS + document.cookie' },
  { id: 'espia', nombre: 'Alguien espía la WiFi pública', resumen: 'La cookie viaja por http://' },
  { id: 'csrf', nombre: 'Otro sitio manda una orden con tu sesión', resumen: 'CSRF desde un sitio malicioso' },
];

interface DatosEscena {
  izquierda: NodoFlujo;
  centro: NodoFlujo;
  derecha: NodoFlujo;
  carga: string;
  nota: string;
}

const ESCENAS: Record<Ataque, DatosEscena> = {
  xss: {
    izquierda: { glifo: 'navegador', etiqueta: 'Navegador', sub: 'con la sesión abierta', estado: 'normal' },
    centro: { glifo: 'terminal', etiqueta: 'Script inyectado', sub: 'document.cookie' },
    derecha: { glifo: 'atacante', etiqueta: 'Atacante', sub: 'recibe lo que lea el script' },
    carga: 'document.cookie',
    nota: 'El script corre dentro de tu página y pregunta por la cookie',
  },
  espia: {
    izquierda: { glifo: 'navegador', etiqueta: 'Navegador', sub: 'en un café', estado: 'normal' },
    centro: { glifo: 'ojo', etiqueta: 'WiFi pública', sub: 'alguien está mirando' },
    derecha: { glifo: 'atacante', etiqueta: 'Atacante', sub: 'copia lo que pasa' },
    carga: 'sid=a91f…',
    nota: 'Por http:// los datos viajan sin cifrar',
  },
  csrf: {
    izquierda: { glifo: 'navegador', etiqueta: 'Sitio malicioso', sub: 'formulario oculto' },
    centro: { glifo: 'persona', etiqueta: 'Víctima', sub: 'con su sesión abierta' },
    derecha: { glifo: 'servidor', etiqueta: 'Tu sitio', sub: 'POST /transferir' },
    carga: 'POST + cookie',
    nota: 'La víctima solo tiene que abrir la página ajena',
  },
};

function Interruptor({
  activo,
  alCambiar,
  titulo,
  ayuda,
}: {
  activo: boolean;
  alCambiar: (v: boolean) => void;
  titulo: string;
  ayuda: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      className="interruptor"
      onClick={() => alCambiar(!activo)}
    >
      <span className="interruptor-pista" aria-hidden="true">
        <span className="interruptor-bola" />
      </span>
      <span className="interruptor-texto">
        <strong>{titulo}</strong>
        <span>{ayuda}</span>
      </span>
    </button>
  );
}

function LabCookiesInterno({ modo }: PropsLab) {
  const vulnerable = modo === 'vulnerable';
  const [banderas, setBanderas] = useState<BanderasCookie>(
    vulnerable ? { httpOnly: false, secure: false, sameSite: 'sin' } : { httpOnly: true, secure: true, sameSite: 'Lax' },
  );
  const [ataque, setAtaque] = useState<Ataque>('xss');
  const [envios, setEnvios] = useState(1);

  const cambiar = (parte: Partial<BanderasCookie>) => {
    setBanderas((b) => ({ ...b, ...parte }));
    setEnvios((n) => n + 1);
  };

  const lanzar = (a: Ataque) => {
    setAtaque(a);
    setEnvios((n) => n + 1);
  };

  const r = simularAtaque(banderas, ataque);
  const exito = r.exito === true;
  const incierto = r.exito === 'incierto';
  const avisos = advertencias(banderas);
  const protecciones = cuantasProtecciones(banderas);
  const escena = ESCENAS[ataque];

  const resultadoEscena = exito ? 'brecha' : incierto ? null : 'bloqueado';

  const tokens: Array<{ texto: string; activo: boolean }> = [
    { texto: 'HttpOnly', activo: banderas.httpOnly },
    { texto: 'Secure', activo: banderas.secure },
    {
      texto: banderas.sameSite === 'sin' ? 'SameSite=Lax' : `SameSite=${banderas.sameSite}`,
      activo: banderas.sameSite !== 'sin',
    },
  ];

  return (
    <div className="lab lab-cookies">
      <div className="lab-fila">
        <div className="lab-controles">
          <div className="campo">
            <span className="etiqueta">Banderas de tu cookie de sesión</span>
            <div className="interruptores">
              <Interruptor
                activo={banderas.httpOnly}
                alCambiar={(v) => cambiar({ httpOnly: v })}
                titulo="HttpOnly"
                ayuda="Los scripts de la página no pueden leerla."
              />
              <Interruptor
                activo={banderas.secure}
                alCambiar={(v) => cambiar({ secure: v })}
                titulo="Secure"
                ayuda="Solo viaja por conexiones cifradas (https)."
              />
            </div>
          </div>
          <FilaChips
            titulo="SameSite: ¿se envía desde otros sitios?"
            ataque={false}
            items={SAME_SITE.map((s) => ({ etiqueta: s.etiqueta, ayuda: s.ayuda }))}
            activo={SAME_SITE.findIndex((s) => s.valor === banderas.sameSite)}
            alElegir={(i) => cambiar({ sameSite: SAME_SITE[i].valor })}
          />

          <div className="cabecera-set-cookie" aria-label="Cabecera que envía tu servidor">
            <div className="cabecera-set-cookie-titulo">Lo que envía tu servidor</div>
            <code className="codigo cabecera-set-cookie-linea">
              <span className="cabecera-nombre">Set-Cookie:</span> sid=a91f3c0e7b; Path=/
              {tokens.map((t) => (
                <span key={t.texto}>
                  {'; '}
                  <span className={t.activo ? 'bandera-puesta' : 'bandera-falta'}>{t.texto}</span>
                </span>
              ))}
            </code>
            <div className="leyenda">
              <span className="leyenda-item">
                <i className="muestra muestra-defensa" /> bandera puesta
              </span>
              <span className="leyenda-item">
                <i className="muestra muestra-falta" /> bandera que falta
              </span>
            </div>
          </div>

          <div className="protecciones" aria-label={`${protecciones} de 3 protecciones activas`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < protecciones ? 'proteccion-on' : 'proteccion-off'}>
                <Glifo nombre="escudo" tamano={26} />
              </span>
            ))}
            <span className="protecciones-texto">{protecciones} de 3 protecciones activas</span>
          </div>
          {avisos.map((a) => (
            <p key={a} className="nota-lab">
              {a}
            </p>
          ))}
        </div>

        <div className="lab-escena escena-doble">
          <EscenaFlujo
            titulo={`Ataque: ${ATAQUES.find((a) => a.id === ataque)!.nombre}`}
            envios={envios}
            izquierda={escena.izquierda}
            centro={escena.centro}
            derecha={escena.derecha}
            ataque={true}
            frenaEnCentro={r.exito === false}
            resultado={resultadoEscena}
            carga={escena.carga}
            nota={escena.nota}
            notaEstado={exito ? 'ataque' : 'defensa'}
          />
          <div className="ataques-lista" role="group" aria-label="Ataques posibles">
            {ATAQUES.map((a) => {
              const res = simularAtaque(banderas, a.id);
              const clase = res.exito === true ? 'ataque-funciona' : res.exito === 'incierto' ? 'ataque-depende' : 'ataque-bloqueado';
              const texto = res.exito === true ? 'Funciona' : res.exito === 'incierto' ? 'Depende' : 'Bloqueado';
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`ataque-fila ${clase}`}
                  aria-pressed={ataque === a.id}
                  onClick={() => lanzar(a.id)}
                >
                  <span className="ataque-nombre">
                    <strong>{a.nombre}</strong>
                    <span>{a.resumen}</span>
                  </span>
                  <span className="ataque-estado">{texto}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Veredicto
        tipo={exito ? 'brecha' : incierto ? 'aviso' : 'bloqueado'}
        titulo={exito ? 'El ataque funciona' : incierto ? 'Depende del navegador' : 'El navegador frena el ataque'}
      >
        {r.porque}
      </Veredicto>
    </div>
  );
}

export default function LabCookies({ modo }: PropsLab) {
  return <LabCookiesInterno key={modo} modo={modo} />;
}
