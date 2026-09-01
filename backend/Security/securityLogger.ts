/**
 * ============================================================================
 * Centralized Backend Security Module - Security Logger
 * ============================================================================
 * Responsibility: Lightweight security event logging for blocked requests.
 * Never logs passwords or sensitive payload values.
 */

export interface SecurityLogEntry {
  timestamp: string;
  ip: string;
  route: string;
  method: string;
  reason: string;
  attackType?: string;
  userAgent?: string;
}

export function logBlockedRequest(entry: Omit<SecurityLogEntry, "timestamp">): void {
  const fullLog: SecurityLogEntry = {
    timestamp: new Date().toISOString(),
    ip: entry.ip || "unknown",
    route: entry.route || "/",
    method: entry.method || "UNKNOWN",
    reason: entry.reason || "Security violation",
    attackType: entry.attackType || "UNSPECIFIED",
    userAgent: entry.userAgent ? entry.userAgent.substring(0, 150) : "none",
  };

  // Log in structured JSON format to stdout for monitoring
  console.warn(`[FIREWALL_BLOCKED] ${JSON.stringify(fullLog)}`);
}
