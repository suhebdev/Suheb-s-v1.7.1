/**
 * ============================================================================
 * OAuth Authentication Routes (SAD Section 16.9)
 * ============================================================================
 * Responsibility: Registering endpoints for Google consent initiation, callback
 * redirect resolution, and authorization state tracking.
 */

import { Router, Response } from "express";
import { requireAuth, asyncHandler, AuthenticatedRequest } from "../middleware";
import { IBackendAuthService } from "../services/authService";
import { IBackendDriveService } from "../services/driveService";

export function createAuthRouter(
  authService: IBackendAuthService,
  driveService: IBackendDriveService
): Router {
  const router = Router();

  /**
   * GET /api/auth/google/url
   * Initiates Google Consent redirect URL generation.
   */
  router.get(
    "/google/url",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const email = req.user!.email;

      const host = req.get("x-forwarded-host") || req.get("host");
      const proto = req.get("x-forwarded-proto") || req.protocol;
      const detectedRedirectUri = host ? `${proto}://${host}/api/drive/callback` : undefined;
      const configuredUri = process.env.GOOGLE_REDIRECT_URI;
      const finalRedirectUri = configuredUri || detectedRedirectUri;

      const authUrl = await authService.getGoogleAuthUrl(userId, email, finalRedirectUri);
      res.json({ success: true, data: { authUrl } });
    })
  );

  /**
   * POST /api/auth/google/callback
   * Processes Google OAuth auth code and exchanges it for persistent tokens.
   * Performs CSRF state parameter validation.
   */
  router.post(
    "/google/callback",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { code, state } = req.body;
      if (!code) {
        return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Authorization code 'code' is required." } });
      }

      const host = req.get("x-forwarded-host") || req.get("host");
      const proto = req.get("x-forwarded-proto") || req.protocol;
      const detectedRedirectUri = host ? `${proto}://${host}/api/drive/callback` : undefined;
      const configuredUri = process.env.GOOGLE_REDIRECT_URI;
      const finalRedirectUri = configuredUri || detectedRedirectUri;

      try {
        await authService.exchangeAndStoreTokens(userId, code, state, finalRedirectUri);
        res.json({ success: true, data: { status: "AUTHORIZED" } });
      } catch (err: any) {
        console.error("[GOOGLE-CALLBACK-ROUTE-ERROR] Detailed Error:", err);
        res.status(500).json({
          success: false,
          error: {
            name: err.name || "Error",
            code: "TOKEN_EXCHANGE_FAILED",
            message: err.message || "Token exchange failed.",
            stack: err.stack,
            details: err.details || null
          }
        });
      }
    })
  );

  /**
   * POST /api/auth/disconnect
   * Disconnects Google Drive by wiping credentials and metadata.
   */
  router.post(
    "/disconnect",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      await authService.disconnect(userId);
      res.json({ success: true, data: { status: "DISCONNECTED" } });
    })
  );

  /**
   * GET /api/auth/status
   * Verifies if Google Drive is authorized and ready for the current session.
   */
  router.get(
    "/status",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const connected = await driveService.isUserConnected(userId);
      res.json({
        success: true,
        data: {
          authorized: connected,
          userId,
        },
      });
    })
  );

  return router;
}
export default createAuthRouter;
