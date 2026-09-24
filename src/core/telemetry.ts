/**
 * Real-Time Telemetry and Security Circuit Breaker
 * Monitors CSP violations, runtime rejections, and state anomalies.
 */

export interface SecurityViolationLog {
  timestamp: number;
  type: 'csp-violation' | 'unhandled-rejection' | 'recording-anomaly';
  details: string;
}

export class TelemetryCircuitBreaker {
  private static anomalyCounter = 0;
  private static readonly MAX_THRESHOLD = 5;
  private static isTripped = false;

  public static initialize(): void {
    // Intercept CSP violations
    document.addEventListener('securitypolicyviolation', (e) => {
      this.recordAnomaly({
        timestamp: Date.now(),
        type: 'csp-violation',
        details: `Violated: ${e.violatedDirective}, Blocked URI: ${e.blockedURI || 'inline'}`
      });
    });

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      this.recordAnomaly({
        timestamp: Date.now(),
        type: 'unhandled-rejection',
        details: String(e.reason)
      });
    });
  }

  private static recordAnomaly(log: SecurityViolationLog): void {
    this.anomalyCounter++;
    console.warn('[Telemetry Alert: Security Anomaly Recorded]', log);

    if (this.anomalyCounter >= this.MAX_THRESHOLD && !this.isTripped) {
      this.tripCircuitBreaker();
    }
  }

  private static tripCircuitBreaker(): void {
    this.isTripped = true;
    console.error('CRITICAL: Telemetry circuit breaker TRIPPED. Disabling privileged recording operations.');
    window.dispatchEvent(new CustomEvent('orbit:security:lockdown'));
  }

  public static canExecutePrivilegedAction(): boolean {
    return !this.isTripped;
  }
}
