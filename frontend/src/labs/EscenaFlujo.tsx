import type { NombreGlifo } from '../contenido/catalogo';
import { Enlace, Escena, Impacto, Nodo, Paquete, TextoEscena, type EstadoEscena } from '../componentes/Escena';

export interface NodoFlujo {
  glifo: NombreGlifo;
  etiqueta: string;
  sub?: string;
  estado?: EstadoEscena;
}

export type ResultadoEscena = 'brecha' | 'bloqueado' | 'ok' | null;

interface Props {
  titulo: string;
  /** Cada vez que cambia, la escena se redibuja y el paquete vuelve a viajar. 0 = sin envíos todavía. */
  envios: number;
  izquierda: NodoFlujo;
  centro: NodoFlujo;
  derecha: NodoFlujo;
  /** El paquete que sale de la izquierda es un ataque (se pinta de rojo). */
  ataque: boolean;
  /** Qué ocurrió al final, en el nodo de la derecha. */
  resultado: ResultadoEscena;
  /** Línea de texto bajo el diagrama. */
  nota?: string;
  notaEstado?: EstadoEscena;
  /** Texto breve que viaja junto al primer paquete. */
  carga?: string;
  /** Si el centro frena el ataque, el segundo tramo no se recorre. */
  frenaEnCentro?: boolean;
}

/**
 * El esquema más usado por los laboratorios:
 * quien envía → la aplicación → el recurso que se ve afectado.
 */
export default function EscenaFlujo({
  titulo,
  envios,
  izquierda,
  centro,
  derecha,
  ataque,
  resultado,
  nota,
  notaEstado,
  carga,
  frenaEnCentro,
}: Props) {
  const color: EstadoEscena = ataque ? 'ataque' : 'dato';
  const colorSegundo: EstadoEscena = ataque && resultado === 'brecha' ? 'ataque' : resultado === 'bloqueado' ? 'defensa' : 'dato';
  const estadoDerecha: EstadoEscena =
    derecha.estado ?? (resultado === 'brecha' ? 'ataque' : resultado === 'bloqueado' ? 'defensa' : 'normal');

  return (
    <Escena ancho={520} alto={215} titulo={titulo} reinicio={envios}>
      <Enlace d="M112 88 H208" estado={color} />
      <Enlace d="M312 88 H408" estado={frenaEnCentro ? 'apagado' : colorSegundo} punteada={frenaEnCentro} />
      <Nodo
        x={70}
        y={88}
        glifo={izquierda.glifo}
        etiqueta={izquierda.etiqueta}
        sub={izquierda.sub}
        estado={izquierda.estado ?? (ataque ? 'ataque' : 'normal')}
      />
      <Nodo
        x={260}
        y={88}
        glifo={centro.glifo}
        etiqueta={centro.etiqueta}
        sub={centro.sub}
        estado={centro.estado ?? (frenaEnCentro ? 'defensa' : 'normal')}
      />
      <Nodo x={450} y={88} glifo={derecha.glifo} etiqueta={derecha.etiqueta} sub={derecha.sub} estado={estadoDerecha} />
      {envios > 0 && (
        <>
          <Paquete d="M112 88 H208" estado={color} dur={1} texto={carga} />
          {!frenaEnCentro && <Paquete d="M312 88 H408" estado={colorSegundo} dur={1} retardo={1.1} />}
          {frenaEnCentro && <Impacto x={260} y={36} tipo="bloqueo" retardo={1.1} />}
          {!frenaEnCentro && resultado === 'brecha' && <Impacto x={450} y={36} tipo="brecha" retardo={2.1} />}
          {!frenaEnCentro && resultado === 'bloqueado' && <Impacto x={450} y={36} tipo="bloqueo" retardo={2.1} />}
          {!frenaEnCentro && resultado === 'ok' && <Impacto x={450} y={36} tipo="ok" retardo={2.1} />}
        </>
      )}
      {nota && (
        <TextoEscena x={260} y={190} estado={notaEstado}>
          {nota}
        </TextoEscena>
      )}
    </Escena>
  );
}
