/**
 * ============================================================================
 * Centralized Backend Security Module - Application Firewall
 * ============================================================================
 * Responsibility: Express middleware inspecting incoming requests for
 * traversal, SQLi, XSS, and Command injection, returning fast rejections
 * for malicious requests while passing legitimate traffic transparently.
 */

import { Request, Response, NextFunction } from "express";
import { guardRequest } from "./requestGuard";
import { detectTraversal, detectPayloadAttack } from "./attackDetection";
import { logBlockedRequest } from "./securityLogger";

/**
 * Deeply scans request payload objects (req.query, req.params, req.body)
 * for malicious attack signatures.
 */
function scanPayload(data: unknown, depth = 0): { detected: boolean; attackType?: string } {
  // Prevent infinite recursion or scanning beyond reasonable depth
  if (depth > 5 || !data) return { detected: false };

  if (typeof data === "string") {
    return detectPayloadAttack(data);
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const res = scanPayload(item, depth + 1);
      if (res.detected) return res;
    }
  } else if (typeof data === "object") {
    for (const key of Object.keys(data as object)) {
      // Scan key name
      const keyRes = detectPayloadAttack(key);
      if (keyRes.detected) return keyRes;

      // Scan value
      const valRes = scanPayload((data as Record<string, unknown>)[key], depth + 1);
      if (valRes.detected) return valRes;
    }
  }

  return { detected: false };
}

/**
 * Application Firewall Express Middleware.
 */
export function applicationFirewall(req: Request, res: Response, next: NextFunction): void {
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const routePath = req.originalUrl || req.url || "/";

  // 1. Structure Guard Inspection
  const guardRes = guardRequest(req);
  if (!guardRes.allowed) {
    logBlockedRequest({
      ip: clientIp,
      route: routePath,
      method: req.method,
      reason: guardRes.reason || "Structural request guard violation",
      attackType: guardRes.code || "GUARD_VIOLATION",
      userAgent: req.get("User-Agent"),
    });

    res.status(400).json({
      success: false,
      error: {
        code: guardRes.code || "SECURITY_GUARD_REJECTION",
        message: "Request rejected by Application Firewall.",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 2. URL Path Traversal Check
  if (detectTraversal(routePath)) {
    logBlockedRequest({
      ip: clientIp,
      route: routePath,
      method: req.method,
      reason: "Path traversal / suspicious URL detected",
      attackType: "PATH_TRAVERSAL",
      userAgent: req.get("User-Agent"),
    });

    res.status(400).json({
      success: false,
      error: {
        code: "PATH_TRAVERSAL_DETECTED",
        message: "Request rejected by Application Firewall.",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 3. Scan Request Query & Route Params
  const queryScan = scanPayload(req.query);
  if (queryScan.detected) {
    logBlockedRequest({
      ip: clientIp,
      route: routePath,
      method: req.method,
      reason: `Malicious payload in query parameters (${queryScan.attackType})`,
      attackType: queryScan.attackType,
      userAgent: req.get("User-Agent"),
    });

    res.status(400).json({
      success: false,
      error: {
        code: "SECURITY_PAYLOAD_REJECTED",
        message: "Request rejected by Application Firewall.",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const paramsScan = scanPayload(req.params);
  if (paramsScan.detected) {
    logBlockedRequest({
      ip: clientIp,
      route: routePath,
      method: req.method,
      reason: `Malicious payload in route parameters (${paramsScan.attackType})`,
      attackType: paramsScan.attackType,
      userAgent: req.get("User-Agent"),
    });

    res.status(400).json({
      success: false,
      error: {
        code: "SECURITY_PAYLOAD_REJECTED",
        message: "Request rejected by Application Firewall.",
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // 4. Scan Body (if present)
  if (req.body) {
    const bodyScan = scanPayload(req.body);
    if (bodyScan.detected) {
      logBlockedRequest({
        ip: clientIp,
        route: routePath,
        method: req.method,
        reason: `Malicious payload in request body (${bodyScan.attackType})`,
        attackType: bodyScan.attackType,
        userAgent: req.get("User-Agent"),
      });

      res.status(400).json({
        success: false,
        error: {
          code: "SECURITY_PAYLOAD_REJECTED",
          message: "Request rejected by Application Firewall.",
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
  }

  // Legitimate request - proceed cleanly
  next();
}
