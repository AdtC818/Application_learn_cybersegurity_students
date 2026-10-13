import LabLogs from '../LabLogs';
import type { ContenidoLab } from '../tipos';

const contenido: ContenidoLab = {
  tipo: 'SENSITIVE_DATA_LOGGING',
  flujo: [
    {
      glifo: 'servidor',
      titulo: 'Para depurar, se imprime todo',
      texto: 'console.log con lo que llega es lo más rápido para ver qué falla.',
    },
    {
      glifo: 'registro',
      titulo: 'Los logs se guardan como texto',
      texto: 'Quedan en archivos, en copias de seguridad y en servicios externos, por meses.',
    },
    {
      glifo: 'ojo',
      titulo: 'Los lee mucha más gente de la que crees',
      texto: 'Soporte, proveedores, quien robe una copia: todos ven la contraseña o la tarjeta.',
    },
  ],
  codigoVulnerable: `app.post('/login', (req, res) => {
  const { email, password, tarjeta } = req.body;
  console.log('Login recibido:', email, password, tarjeta);
  res.json({ ok: true });
});`,
  lineasVulnerables: [3],
  notasVulnerable: {
    2: 'Entrada: datos que la persona confió a tu aplicación.',
    3: 'Cada dato se escribe tal cual en el log: la contraseña y la tarjeta quedan en texto legible.',
  },
  codigoSeguro: `app.post('/login', (req, res) => {
  const { email } = req.body;
  logger.info({ evento: 'login', email: enmascarar(email) });
  res.json({ ok: true });
});`,
  lineasSeguras: [3],
  notasSeguro: {
    2: 'Solo se lee lo que hace falta para el registro.',
    3: 'Se registra qué pasó y quién (enmascarado). La contraseña y la tarjeta nunca llegan al log.',
  },
  regla: 'No registres contraseñas, tokens ni tarjetas. Si necesitas rastro, guarda lo mínimo y enmascara el resto.',
  reto: {
    pregunta: '¿Cuál de estas líneas es segura de dejar en producción?',
    opciones: [
      {
        codigo: "logger.info({ evento: 'login', usuarioId: usuario.id })",
        comentario: 'Registra qué pasó y un identificador interno, sin ningún dato secreto.',
      },
      {
        codigo: "console.log('Intento de login:', req.body)",
        comentario: 'req.body incluye la contraseña. Aunque no la nombres, se escribe entera en el log.',
      },
      {
        codigo: "console.error('Fallo de pago', tarjeta)",
        comentario: 'El número de tarjeta no debe aparecer en ningún registro, ni siquiera cuando algo falla.',
      },
    ],
    correcta: 0,
  },
  Laboratorio: LabLogs,
};

export default contenido;
