import { describe, expect, it } from 'vitest';
import {
  consultaSegura,
  consultaVulnerable,
  ejecutarConsulta,
  hayInyeccion,
  marcarConsulta,
  textoDe,
} from './sql';
import { buscarTodos, iniciarSesion } from './nosql';
import { crearMundo, fusionar, leerCarga, leerPropiedad, nuevoObjeto } from './prototipos';
import { normalizar, recorrido, servirArchivo, unir } from './rutas';
import { analizarUrl, pedirVistaPrevia, zonaDeIp } from './ssrf';
import { calcular, descomponerShell, evaluarExpresion, hacerPing } from './ejecucion';
import { enmascararEmail, enmascararTarjeta, filtraciones, logSeguro, logVulnerable } from './logs';
import {
  DICCIONARIO,
  USUARIOS_CLAVES,
  crackearMd5,
  duracionLegible,
  md5,
  pbkdf2Hex,
} from './cripto';
import { advertencias, cabeceraSetCookie, simularAtaque } from './cookies';
import { ORIGEN_ATACANTE, ORIGEN_LEGITIMO, evaluarCors } from './cors';

function consulta(usuario: string, clave: string) {
  return ejecutarConsulta(textoDe(consultaVulnerable(usuario, clave)));
}

describe('SQL: motor de juguete', () => {
  it('un inicio de sesión legítimo devuelve solo a esa persona', () => {
    const r = consulta('ana', 'mango2024');
    expect(r.tipo).toBe('filas');
    if (r.tipo === 'filas') expect(r.filas.map((f) => f.usuario)).toEqual(['ana']);
  });

  it('una clave incorrecta no devuelve filas', () => {
    const r = consulta('ana', 'otra');
    expect(r.tipo === 'filas' && r.filas.length).toBe(0);
  });

  it('una comilla suelta rompe la sintaxis (así los atacantes tantean)', () => {
    const r = consulta("'", 'x');
    expect(r.tipo).toBe('error');
  });

  it("admin'-- comenta la comprobación de la clave", () => {
    const r = consulta("admin'--", 'cualquiera');
    expect(r.tipo === 'filas' && r.filas.map((f) => f.usuario)).toEqual(['admin']);
  });

  it("' OR '1'='1 en la clave devuelve a todos (precedencia AND antes que OR)", () => {
    const r = consulta('x', "' OR '1'='1");
    expect(r.tipo === 'filas' && r.filas.length).toBe(3);
  });

  it('UNION SELECT vuelca la tabla completa', () => {
    const r = consulta("x' UNION SELECT id, usuario, clave, rol FROM usuarios --", 'x');
    expect(r.tipo).toBe('filas');
    if (r.tipo === 'filas') expect(r.filas.map((f) => f.clave)).toContain('Sup3r-S3creta!');
  });

  it('UNION con otro número de columnas da error', () => {
    const r = consulta("x' UNION SELECT 1, 2 --", 'x');
    expect(r.tipo).toBe('error');
  });

  it('las sentencias apiladas quedan registradas como ejecutadas', () => {
    const r = consulta("x'; DROP TABLE usuarios; --", 'x');
    expect(r.tipo === 'filas' && r.extras).toEqual(['DROP TABLE usuarios']);
  });

  it('una columna que no existe da error', () => {
    const r = consulta("x' OR secreto = 1 --", 'x');
    expect(r.tipo).toBe('error');
  });

  it('marca como inyectado lo que se volvió estructura SQL', () => {
    expect(hayInyeccion(consultaVulnerable('ana', 'mango2024'))).toBe(false);
    expect(hayInyeccion(consultaVulnerable("admin'--", 'x'))).toBe(true);
    const piezas = marcarConsulta(consultaVulnerable("admin'--", 'x'));
    expect(piezas.some((p) => p.inyectado && p.texto.includes('--'))).toBe(true);
  });

  it('la consulta parametrizada trata el ataque como un nombre raro', () => {
    expect(consultaSegura("admin'--", 'x')).toEqual([]);
    expect(consultaSegura('x', "' OR '1'='1")).toEqual([]);
    expect(consultaSegura('ana', 'mango2024').length).toBe(1);
  });
});

describe('NoSQL', () => {
  it('login legítimo', () => {
    const r = iniciarSesion('{"usuario":"ana","clave":"mango2024"}', 'vulnerable');
    expect(r.tipo).toBe('entro');
    if (r.tipo === 'entro') expect(r.legitimo).toBe(true);
  });

  it('{ "$ne": null } deja entrar sin saber la clave', () => {
    const r = iniciarSesion('{"usuario":"admin","clave":{"$ne":null}}', 'vulnerable');
    expect(r.tipo).toBe('entro');
    if (r.tipo === 'entro') {
      expect(r.legitimo).toBe(false);
      expect(r.documento.usuario).toBe('admin');
    }
  });

  it('la versión segura descarta objetos', () => {
    const r = iniciarSesion('{"usuario":"admin","clave":{"$ne":null}}', 'seguro');
    expect(r.tipo).toBe('rechazado');
  });

  it('operadores regex y gt', () => {
    expect(buscarTodos({ usuario: { $regex: '^a' } }).map((d) => d.usuario)).toEqual(['admin', 'ana']);
    expect(buscarTodos({ clave: { $gt: '' } }).length).toBe(3);
  });

  it('JSON inválido y operadores desconocidos', () => {
    expect(iniciarSesion('{usuario', 'vulnerable').tipo).toBe('json-invalido');
    expect(iniciarSesion('{"usuario":{"$raro":1},"clave":"x"}', 'vulnerable').tipo).toBe('error');
  });
});

describe('Prototype pollution (modelo)', () => {
  it('__proto__ contamina a los objetos que se creen después', () => {
    const mundo = crearMundo();
    const carga = leerCarga('{"__proto__":{"isAdmin":true}}');
    expect(carga.ok).toBe(true);
    if (!carga.ok) return;
    const pasos = fusionar(mundo, mundo.config, carga.valor, false);
    expect(pasos.some((p) => p.accion === 'contaminar')).toBe(true);
    const visitante = nuevoObjeto(mundo, 'visitante', { nombre: 'ana' });
    expect(leerPropiedad(visitante, 'isAdmin')).toBe(true);
  });

  it('constructor.prototype es otro camino al mismo prototipo', () => {
    const mundo = crearMundo();
    const carga = leerCarga('{"constructor":{"prototype":{"isAdmin":true}}}');
    if (!carga.ok) throw new Error('JSON esperado');
    fusionar(mundo, mundo.config, carga.valor, false);
    expect(leerPropiedad(nuevoObjeto(mundo, 'v'), 'isAdmin')).toBe(true);
  });

  it('la versión segura bloquea las claves peligrosas', () => {
    const mundo = crearMundo();
    for (const texto of ['{"__proto__":{"isAdmin":true}}', '{"constructor":{"prototype":{"isAdmin":true}}}']) {
      const carga = leerCarga(texto);
      if (!carga.ok) throw new Error('JSON esperado');
      const pasos = fusionar(mundo, mundo.config, carga.valor, true);
      expect(pasos.every((p) => p.accion === 'bloquear')).toBe(true);
    }
    expect(leerPropiedad(nuevoObjeto(mundo, 'v'), 'isAdmin')).toBeUndefined();
  });

  it('un merge normal solo cambia ese objeto', () => {
    const mundo = crearMundo();
    fusionar(mundo, mundo.config, { tema: 'oscuro' }, false);
    expect(leerPropiedad(mundo.config, 'tema')).toBe('oscuro');
    expect(leerPropiedad(nuevoObjeto(mundo, 'v'), 'tema')).toBeUndefined();
  });

  it('cargas inválidas', () => {
    expect(leerCarga('[1,2]').ok).toBe(false);
    expect(leerCarga('{no json').ok).toBe(false);
  });
});

describe('Path traversal', () => {
  it('normaliza . y ..', () => {
    expect(normalizar('/app/uploads/../config/./x')).toBe('/app/config/x');
    expect(normalizar('/../../etc')).toBe('/etc');
    expect(unir('/app/uploads', '/etc/passwd')).toBe('/app/uploads/etc/passwd');
  });

  it('la versión vulnerable sale de la carpeta', () => {
    const r = servirArchivo('../config/secretos.env', 'vulnerable');
    expect(r.tipo).toBe('ok');
    if (r.tipo === 'ok') {
      expect(r.fueraDeBase).toBe(true);
      expect(r.secreto).toBe(true);
    }
    expect(servirArchivo('../../etc/passwd', 'vulnerable').tipo).toBe('ok');
  });

  it('la versión segura prohíbe salir de la base, incluso con ruta absoluta', () => {
    expect(servirArchivo('../config/secretos.env', 'seguro').tipo).toBe('prohibido');
    expect(servirArchivo('/etc/passwd', 'seguro').tipo).toBe('prohibido');
    expect(servirArchivo('foto.png', 'seguro').tipo).toBe('ok');
    expect(servirArchivo('nada.txt', 'seguro').tipo).toBe('no-existe');
  });

  it('el recorrido muestra cada carpeta visitada', () => {
    expect(recorrido('/app/uploads', '../config/secretos.env')).toEqual([
      '/app/uploads',
      '/app',
      '/app/config',
      '/app/config/secretos.env',
    ]);
  });
});

describe('SSRF', () => {
  it('normaliza formas raras de escribir 127.0.0.1', () => {
    const a = analizarUrl('http://2130706433/admin');
    expect(a.host).toBe('127.0.0.1');
    expect(a.zona).toBe('loopback');
    expect(analizarUrl('http://[::1]:8080/').zona).toBe('loopback');
  });

  it('reconoce redes privadas y metadatos', () => {
    expect(zonaDeIp('10.1.2.3')).toBe('privada');
    expect(zonaDeIp('172.20.0.1')).toBe('privada');
    expect(zonaDeIp('172.32.0.1')).toBe('publica');
    expect(zonaDeIp('192.168.1.10')).toBe('privada');
    expect(analizarUrl('http://169.254.169.254/latest/meta-data/').zona).toBe('metadatos');
  });

  it('un nombre público puede apuntar a una IP interna', () => {
    const a = analizarUrl('http://127.0.0.1.nip.io/admin');
    expect(a.zona).toBe('loopback');
    expect(a.nota).toBeTruthy();
  });

  it('vulnerable: el servidor llega a la red interna', () => {
    const r = pedirVistaPrevia('http://169.254.169.254/latest/meta-data/iam/', 'vulnerable');
    expect(r.tipo).toBe('respondio');
    if (r.tipo === 'respondio') expect(r.sensible).toBe(true);
  });

  it('seguro: solo https hacia dominios permitidos', () => {
    expect(pedirVistaPrevia('https://api.clima.example/tiempo', 'seguro').tipo).toBe('respondio');
    expect(pedirVistaPrevia('http://localhost:8080/admin', 'seguro').tipo).toBe('bloqueada');
    expect(pedirVistaPrevia('https://interno.empresa.local/', 'seguro').tipo).toBe('bloqueada');
    expect(pedirVistaPrevia('texto cualquiera', 'seguro').tipo).toBe('invalida');
  });
});

describe('exec / eval', () => {
  it('separa comandos encadenados', () => {
    expect(descomponerShell('ping -c 1 8.8.8.8; cat /etc/passwd')).toEqual(['ping -c 1 8.8.8.8', 'cat /etc/passwd']);
    expect(descomponerShell('ping -c 1 a && whoami || id')).toEqual(['ping -c 1 a', 'whoami', 'id']);
    expect(descomponerShell('ping -c 1 $(whoami)')[0]).toBe('whoami');
    expect(descomponerShell('echo "a;b"')).toEqual(['echo "a;b"']);
  });

  it('vulnerable: aparecen comandos colados', () => {
    const r = hacerPing('8.8.8.8; cat /etc/passwd', 'vulnerable');
    expect(r.tipo).toBe('ejecutado');
    if (r.tipo === 'ejecutado') {
      expect(r.comandos.filter((c) => c.colado).map((c) => c.texto)).toEqual(['cat /etc/passwd']);
    }
  });

  it('seguro: valida y no encadena', () => {
    expect(hacerPing('8.8.8.8; cat /etc/passwd', 'seguro').tipo).toBe('rechazado');
    const ok = hacerPing('example.com', 'seguro');
    expect(ok.tipo === 'ejecutado' && ok.argumentos).toEqual(['-c', '1', 'example.com']);
  });

  it('la calculadora segura no usa eval', () => {
    expect(calcular('2+3*4')).toBe(14);
    expect(calcular('(1+2)*3')).toBe(9);
    expect(calcular('-4 + 10 % 3')).toBe(-3);
    expect(calcular('process.exit()')).toBeNull();
    expect(calcular('1/0')).toBeNull();
    expect(calcular('2 +')).toBeNull();
  });

  it('clasifica expresiones peligrosas sin ejecutarlas', () => {
    const r = evaluarExpresion("require('fs').readFileSync('/etc/passwd')", 'vulnerable');
    expect(r.tipo).toBe('codigo');
    if (r.tipo === 'codigo') expect(r.hallazgos.join(' ')).toMatch(/módulos|archivos/);
    expect(evaluarExpresion('process.exit()', 'seguro').tipo).toBe('rechazado');
    expect(evaluarExpresion('7*6', 'vulnerable')).toEqual({ tipo: 'numero', valor: 42 });
  });
});

describe('Logs', () => {
  const datos = { email: 'ana@correo.co', password: 'mango2024', tarjeta: '4111 1111 1111 1111' };
  const hora = new Date('2026-01-01T10:20:30');

  it('el log vulnerable filtra todo', () => {
    expect(filtraciones(logVulnerable(datos, hora), datos)).toEqual(['password', 'tarjeta', 'email']);
  });

  it('el log seguro no deja datos sensibles', () => {
    expect(filtraciones(logSeguro(datos, hora), datos)).toEqual([]);
  });

  it('enmascara correo y tarjeta', () => {
    expect(enmascararEmail('ana@correo.co')).toBe('a***@correo.co');
    expect(enmascararTarjeta('4111 1111 1111 1234')).toBe('**** **** **** 1234');
  });
});

describe('Criptografía', () => {
  it('MD5 coincide con los vectores de prueba del RFC 1321', () => {
    const vectores: Array<[string, string]> = [
      ['', 'd41d8cd98f00b204e9800998ecf8427e'],
      ['a', '0cc175b9c0f1b6a831c399e269772661'],
      ['abc', '900150983cd24fb0d6963f7d28e17f72'],
      ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
      ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
      ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
      [
        '12345678901234567890123456789012345678901234567890123456789012345678901234567890',
        '57edf4a22be3c955ac49da2e2107b67a',
      ],
      ['password', '5f4dcc3b5aa765d61d8327deb882cf99'],
      ['123456', 'e10adc3949ba59abbe56e057f20f883e'],
    ];
    for (const [entrada, esperado] of vectores) expect(md5(entrada)).toBe(esperado);
  });

  it('dos personas con la misma clave tienen el mismo hash MD5, y con sal ya no', () => {
    const [ana, beto] = USUARIOS_CLAVES;
    expect(md5(ana.clave)).toBe(md5(beto.clave));
    expect(md5(ana.sal + ana.clave)).not.toBe(md5(beto.sal + beto.clave));
  });

  it('el diccionario rompe claves comunes al instante y no la clave larga', () => {
    expect(crackearMd5(md5('123456'))).toEqual({ encontrada: '123456', intentos: 1 });
    expect(crackearMd5(md5('password')).encontrada).toBe('password');
    const dani = USUARIOS_CLAVES[3];
    expect(DICCIONARIO).not.toContain(dani.clave);
    expect(crackearMd5(md5(dani.clave)).encontrada).toBeNull();
  });

  it('con sal conocida, el diccionario igual funciona con MD5', () => {
    const ana = USUARIOS_CLAVES[0];
    expect(crackearMd5(md5(ana.sal + ana.clave), ana.sal).encontrada).toBe('123456');
  });

  it('PBKDF2 es determinista y depende de la sal', async () => {
    const a = await pbkdf2Hex('123456', 'sal-a', 1000);
    const b = await pbkdf2Hex('123456', 'sal-a', 1000);
    const c = await pbkdf2Hex('123456', 'sal-b', 1000);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64);
  });

  it('duraciones legibles', () => {
    expect(duracionLegible(0.2)).toBe('menos de 1 segundo');
    expect(duracionLegible(30)).toBe('30 segundos');
    expect(duracionLegible(600)).toBe('10 minutos');
    expect(duracionLegible(3600 * 5)).toBe('5 horas');
    expect(duracionLegible(86400 * 40)).toBe('40 días');
    expect(duracionLegible(86400 * 365 * 5)).toBe('5 años');
  });
});

describe('Cookies', () => {
  const base = { httpOnly: false, secure: false, sameSite: 'sin' as const };

  it('cada bandera frena un ataque distinto', () => {
    expect(simularAtaque(base, 'xss').exito).toBe(true);
    expect(simularAtaque({ ...base, httpOnly: true }, 'xss').exito).toBe(false);
    expect(simularAtaque(base, 'espia').exito).toBe(true);
    expect(simularAtaque({ ...base, secure: true }, 'espia').exito).toBe(false);
    expect(simularAtaque({ ...base, sameSite: 'Lax' }, 'csrf').exito).toBe(false);
    expect(simularAtaque({ ...base, sameSite: 'Strict' }, 'csrf').exito).toBe(false);
    expect(simularAtaque({ ...base, sameSite: 'None', secure: true }, 'csrf').exito).toBe(true);
    expect(simularAtaque(base, 'csrf').exito).toBe('incierto');
  });

  it('SameSite=None sin Secure se advierte', () => {
    expect(advertencias({ ...base, sameSite: 'None' })).toHaveLength(1);
    expect(advertencias({ httpOnly: true, secure: true, sameSite: 'Lax' })).toHaveLength(0);
  });

  it('arma la cabecera Set-Cookie', () => {
    expect(cabeceraSetCookie({ httpOnly: true, secure: true, sameSite: 'Lax' })).toBe(
      'Set-Cookie: sid=a91f3c0e7b; Path=/; HttpOnly; Secure; SameSite=Lax',
    );
    expect(cabeceraSetCookie(base)).toBe('Set-Cookie: sid=a91f3c0e7b; Path=/');
  });
});

describe('CORS', () => {
  it('reflejar el origen con cookies deja leer datos privados al sitio malicioso', () => {
    const r = evaluarCors('refleja', ORIGEN_ATACANTE, true);
    expect(r.permiteLeer).toBe(true);
    expect(r.datosPrivados).toBe(true);
  });

  it('origen fijo: el atacante no lee, la app legítima sí', () => {
    expect(evaluarCors('fijo', ORIGEN_ATACANTE, true).permiteLeer).toBe(false);
    expect(evaluarCors('fijo', ORIGEN_LEGITIMO, true).datosPrivados).toBe(true);
  });

  it('el comodín con cookies lo bloquea el navegador (y rompe tu propia app)', () => {
    expect(evaluarCors('asterisco-credenciales', ORIGEN_ATACANTE, true).permiteLeer).toBe(false);
    expect(evaluarCors('asterisco-credenciales', ORIGEN_LEGITIMO, true).permiteLeer).toBe(false);
  });

  it('el comodín sin cookies se puede leer pero sin datos privados', () => {
    const r = evaluarCors('asterisco', ORIGEN_ATACANTE, false);
    expect(r.permiteLeer).toBe(true);
    expect(r.datosPrivados).toBe(false);
  });
});
