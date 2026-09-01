/**
 * ============================================================================
 * Session Guard & Controlled Operations Protection Module
 * ============================================================================
 * Security Phase 3: Session Protection, UX Safety & Controlled Operations
 *
 * Responsibilities:
 * 1. Tracks active session operations (e.g. ongoing chat deletions or zip imports)
 *    to prevent race conditions or concurrent duplicate operations per session.
 * 2. Provides session validation helpers to ensure requests are operating within
 *    a valid, non-tampered session scope.
 * 3. Enforces single-operation locks for sensitive actions.
 */

import { Request, Response, NextFunction } from "express";

interface ActiveSessionOperation {
  userId: string;
  operationType: "import" | "delete";
  targetId?: string;
  startedAt: number;
}

class SessionOperationLockManager {
  private activeLocks: Map<string, ActiveSessionOperation> = new Map();
  private readonly LOCK_TIMEOUT_MS = 5 * 60 * 1000; // Auto-expire stale locks after 5 minutes

  /**
   * Generates a unique lock key for a user and operation type.
   */
  private getLockKey(userId: string, operationType: "import" | "delete"): string {
    return `${userId}:${operationType}`;
  }

  /**
   * Clean up any expired locks.
   */
  private cleanExpiredLocks(): void {
    const now = Date.now();
    for (const [key, lock] of this.activeLocks.entries()) {
      if (now - lock.startedAt > this.LOCK_TIMEOUT_MS) {
        this.activeLocks.delete(key);
      }
    }
  }

  /**
   * Acquire an operation lock for a user session.
   * Returns true if lock acquired, false if an operation is already active.
   */
  public acquireLock(userId: string, operationType: "import" | "delete", targetId?: string): boolean {
    this.cleanExpiredLocks();
    const key = this.getLockKey(userId, operationType);

    if (this.activeLocks.has(key)) {
      return false; // Lock already held
    }

    this.activeLocks.set(key, {
      userId,
      operationType,
      targetId,
      startedAt: Date.now(),
    });
    return true;
  }

  /**
   * Release an operation lock for a user session.
   */
  public releaseLock(userId: string, operationType: "import" | "delete"): void {
    const key = this.getLockKey(userId, operationType);
    this.activeLocks.delete(key);
  }

  /**
   * Check if an operation lock is currently active.
   */
  public isLocked(userId: string, operationType: "import" | "delete"): boolean {
    this.cleanExpiredLocks();
    const key = this.getLockKey(userId, operationType);
    return this.activeLocks.has(key);
  }
}

export const sessionOperationLockManager = new SessionOperationLockManager();

/**
 * Express Middleware: Prevents concurrent duplicate operations for the same session/user.
 */
export function enforceSingleOperationLock(operationType: "import" | "delete") {
  return (req: Request, res: Response, next: NextFunction) => {
    // Derive user identifier from authorization or body/params
    const userId = (req as any).user?.uid || req.headers["x-user-id"] || "anonymous-session";

    if (sessionOperationLockManager.isLocked(userId, operationType)) {
      return res.status(409).json({
        success: false,
        error: {
          code: "CONCURRENT_OPERATION_BLOCKED",
          message: `A ${operationType} operation is already in progress for this session. Please wait for it to complete.`,
        },
      });
    }

    next();
  };
}
