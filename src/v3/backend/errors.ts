/**
 * ============================================================================
 * Backend Shared Error Architecture (SAD Section 4.13)
 * ============================================================================
 * Responsibility: Defining unified domain error classes that carry HTTP status 
 * codes and machine-readable error codes.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
  }

  public toJSON() {
    return {
      success: false,
      error: {
        name: this.name,
        code: this.errorCode,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, "VALIDATION_FAILED", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Access denied. Authentication required.") {
    super(401, "UNAUTHORIZED", message); // 401 Unauthorized
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden. Insufficient permissions.") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, "NOT_FOUND", message);
  }
}

export class DriveConnectionError extends AppError {
  constructor(message: string, details?: any) {
    super(502, "GOOGLE_DRIVE_CONNECTION_ERROR", message, details);
  }
}

export class NotImplementedError extends AppError {
  constructor(featureName: string) {
    super(501, "NOT_IMPLEMENTED", `${featureName} is not yet implemented in Phase 2.1.`);
  }
}
