/**
 * ============================================================================
 * Centralized Backend Security Module - Request Guard
 * ============================================================================
 * Responsibility: Validating incoming HTTP request structures (HTTP methods,
 * header lengths, URL lengths, query lengths, User-Agent, and Content-Type).
 */

import { Request } from "express";
import { FIREWALL_CONSTANTS } from "./constants";

export interface RequestGuardResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

/**
 * Validates request structural integrity and metadata sanity.
 */
export function guardRequest(req: Request): RequestGuardResult {
  // 1. HTTP Method validation
  const method = (req.method || "").toUpperCase();
  if (!FIREWALL_CONSTANTS.ALLOWED_METHODS.includes(method)) {
    return {
      allowed: false,
      reason: `HTTP method '${method}' is not allowed.`,
      code: "INVALID_HTTP_METHOD",
    };
  }

  // 2. URL length validation
  const fullUrl = req.originalUrl || req.url || "";
  if (fullUrl.length > FIREWALL_CONSTANTS.MAX_URL_LENGTH) {
    return {
      allowed: false,
      reason: `Request URL length (${fullUrl.length}) exceeds maximum limit (${FIREWALL_CONSTANTS.MAX_URL_LENGTH}).`,
      code: "URL_TOO_LONG",
    };
  }

  // 3. Query string length validation
  const queryIndex = fullUrl.indexOf("?");
  if (queryIndex !== -1) {
    const queryString = fullUrl.substring(queryIndex + 1);
    if (queryString.length > FIREWALL_CONSTANTS.MAX_QUERY_STRING_LENGTH) {
      return {
        allowed: false,
        reason: `Query string length (${queryString.length}) exceeds maximum limit (${FIREWALL_CONSTANTS.MAX_QUERY_STRING_LENGTH}).`,
        code: "QUERY_STRING_TOO_LONG",
      };
    }
  }

  // 4. Headers length and count validation
  const headerKeys = Object.keys(req.headers);
  if (headerKeys.length > FIREWALL_CONSTANTS.MAX_HEADER_COUNT) {
    return {
      allowed: false,
      reason: `Header count (${headerKeys.length}) exceeds limit (${FIREWALL_CONSTANTS.MAX_HEADER_COUNT}).`,
      code: "EXCESSIVE_HEADERS",
    };
  }

  for (const key of headerKeys) {
    const val = req.headers[key];
    const valStr = Array.isArray(val) ? val.join(",") : String(val || "");
    if (valStr.length > FIREWALL_CONSTANTS.MAX_HEADER_VALUE_LENGTH) {
      return {
        allowed: false,
        reason: `Header '${key}' value size exceeds maximum limit.`,
        code: "HEADER_TOO_LARGE",
      };
    }
  }

  // 5. User-Agent presence & basic sanity check
  const userAgent = req.get("User-Agent") || "";
  if (userAgent.length > 1024) {
    return {
      allowed: false,
      reason: "User-Agent header exceeds size limit.",
      code: "MALFORMED_USER_AGENT",
    };
  }

  // 6. Content-Type check for state-changing requests with body payload
  if (["POST", "PUT", "PATCH"].includes(method)) {
    const contentType = req.get("Content-Type") || "";
    const contentLength = parseInt(req.get("Content-Length") || "0", 10);
    if (contentLength > 0 && !contentType) {
      return {
        allowed: false,
        reason: "Content-Type header is required for requests with a payload body.",
        code: "MISSING_CONTENT_TYPE",
      };
    }
  }

  return { allowed: true };
}
