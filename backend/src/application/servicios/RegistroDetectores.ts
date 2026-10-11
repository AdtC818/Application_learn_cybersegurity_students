import { DetectorVulnerabilidad } from '../../domain/ports/DetectorVulnerabilidad';
import { SqlInjectionDetector } from '../../domain/detectores/SqlInjectionDetector';
import { XssDetector } from '../../domain/detectores/XssDetector';
import { HardcodedSecretsDetector } from '../../domain/detectores/HardcodedSecretsDetector';
import { WeakCryptoDetector } from '../../domain/detectores/WeakCryptoDetector';
import { NoSqlInjectionDetector } from '../../domain/detectores/NoSqlInjectionDetector';
import { PathTraversalDetector } from '../../domain/detectores/PathTraversalDetector';
import { PrototypePollutionDetector } from '../../domain/detectores/PrototypePollutionDetector';
import { CorsMisconfigurationDetector } from '../../domain/detectores/CorsMisconfigurationDetector';
import { InsecureSessionCookiesDetector } from '../../domain/detectores/InsecureSessionCookiesDetector';
import { SsrfDetector } from '../../domain/detectores/SsrfDetector';
import { DangerousFunctionsDetector } from '../../domain/detectores/DangerousFunctionsDetector';
import { SensitiveDataLoggingDetector } from '../../domain/detectores/SensitiveDataLoggingDetector';

/**
 * RegistroDetectores (Factory / Registry)
 *
 * The single place in the codebase that knows about all 12 concrete
 * detector classes. Everything else (the use case, the HTTP layer, tests)
 * only ever sees `DetectorVulnerabilidad[]` and never imports a concrete
 * detector directly. Adding a 13th vulnerability category means writing
 * one new class and adding one line here — nothing else changes.
 */
export class RegistroDetectores {
  private static instancia: RegistroDetectores;
  private readonly detectores: DetectorVulnerabilidad[];

  private constructor() {
    this.detectores = [
      new SqlInjectionDetector(),
      new XssDetector(),
      new HardcodedSecretsDetector(),
      new WeakCryptoDetector(),
      new NoSqlInjectionDetector(),
      new PathTraversalDetector(),
      new PrototypePollutionDetector(),
      new CorsMisconfigurationDetector(),
      new InsecureSessionCookiesDetector(),
      new SsrfDetector(),
      new DangerousFunctionsDetector(),
      new SensitiveDataLoggingDetector(),
    ];
  }

  static obtenerInstancia(): RegistroDetectores {
    if (!RegistroDetectores.instancia) {
      RegistroDetectores.instancia = new RegistroDetectores();
    }
    return RegistroDetectores.instancia;
  }

  obtenerTodos(): DetectorVulnerabilidad[] {
    return this.detectores;
  }
}
