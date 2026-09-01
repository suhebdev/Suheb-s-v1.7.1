/**
 * ============================================================================
 * Centralized Backend Security Module - Attack Detection
 * ============================================================================
 * Responsibility: Isolated, lightweight detection functions for URL traversal,
 * SQL injection, XSS, and Command injection payloads.
 */

import { FIREWALL_CONSTANTS } from "./constants";

/**
 * Detects directory traversal and sensitive path exposure attempts in URLs/Paths.
 */
export function detectTraversal(urlOrPath: string): boolean {
  if (!urlOrPath) return false;
  for (const pattern of FIREWALL_CONSTANTS.PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(urlOrPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects SQL injection signatures in string inputs.
 */
export function detectSQLInjection(input: string): boolean {
  if (!input) return false;
  for (const pattern of FIREWALL_CONSTANTS.SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects active XSS executable payloads.
 */
export function detectXSS(input: string): boolean {
  if (!input) return false;
  for (const pattern of FIREWALL_CONSTANTS.XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects operating system command injection attempts.
 */
export function detectCommandInjection(input: string): boolean {
  if (!input) return false;
  for (const pattern of FIREWALL_CONSTANTS.COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Scans a string input against all attack signatures (SQLi, XSS, Command Injection).
 */
export function detectPayloadAttack(input: string): { detected: boolean; attackType?: string } {
  if (!input || typeof input !== "string") {
    return { detected: false };
  }

  if (detectTraversal(input)) {
    return { detected: true, attackType: "PATH_TRAVERSAL" };
  }

  if (detectSQLInjection(input)) {
    return { detected: true, attackType: "SQL_INJECTION" };
  }

  if (detectXSS(input)) {
    return { detected: true, attackType: "XSS_ATTACK" };
  }

  if (detectCommandInjection(input)) {
    return { detected: true, attackType: "COMMAND_INJECTION" };
  }

  return { detected: false };
}
