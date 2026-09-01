/**
 * ============================================================================
 * Validation & Authentication Middleware (SAD Section 4.8)
 * ============================================================================
 * Responsibility: Extracting and verifying user identities, intercepting and
 * validating payload contracts, and centralizing global error interception.
 */

import { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ValidationError, AppError } from "./errors";
import { getAuth } from "firebase-admin/auth";
import { getApps } from "firebase-admin/app";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
  };
}

/**
 * Express async handler utility wrapper to capture unhandled promise rejections
 * and propagate them cleanly into the Express error-handling lifecycle.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Authentication interceptor that decodes and validates Firebase Client ID Tokens.
 * Safely resolves the User UID and populates it onto the request lifecycle.
 */
export const requireAuth = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  
  console.log(`[AUTH-MIDDLEWARE] Intercepting request for: ${req.method} ${req.path}`);

  let idToken: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    idToken = authHeader.split(" ")[1];
  } else if (queryToken) {
    idToken = queryToken;
  }

  if (!idToken) {
    throw new UnauthorizedError("Authorization header ('Bearer <idToken>') or 'token' query param must be provided.");
  }

  try {
    // If Admin SDK is initialized, verify the token
    if (getApps().length > 0) {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      console.log(`[AUTH-MIDDLEWARE] Token validated successfully. Decoded Firebase UID: ${decodedToken.uid}`);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        displayName: (decodedToken.name as string) || "",
      };
      return next();
    } else {
      // Graceful local development fallback if admin keys aren't mounted yet
      console.warn("[AUTH-MIDDLEWARE] Firebase Admin SDK is uninitialized. Defaulting to local dev mocking.");
      req.user = {
        uid: "dev-mock-uid-123",
        email: "suheb3805@gmail.com",
        displayName: "Suheb Khan",
      };
      return next();
    }
  } catch (error: any) {
    console.error("[AUTH-MIDDLEWARE] Token validation failed:", error.message || error);
    throw new UnauthorizedError("Firebase authorization token has expired or is invalid.");
  }
});

/**
 * Global API Error handler that translates domain exceptions into standard,
 * clean, structured JSON envelopes conforming to the SAD objectives.
 */
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error(`[EXPRESS-ERROR-HANDLER] Captured unhandled exception:`, error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Treat generic or native JS errors as standard Internal Server Errors (500)
  const defaultError = {
    success: false,
    error: {
      name: error.name || "InternalServerError",
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "An unexpected server-side error occurred.",
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(500).json(defaultError);
};

/**
 * Generic structural validator middleware to assert body fields prior to business logic execution.
 */
export const validateBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = requiredFields.filter((field) => req.body[field] === undefined || req.body[field] === null);
    if (missing.length > 0) {
      throw new ValidationError(`Malformed body. Missing required fields: ${missing.join(", ")}`);
    }
    next();
  };
};
