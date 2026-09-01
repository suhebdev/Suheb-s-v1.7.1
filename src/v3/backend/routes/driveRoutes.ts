/**
 * ============================================================================
 * Google Drive Proxy Routes (SAD Section 16 & Section 2.3 Lesson 5)
 * ============================================================================
 * Responsibility: Registering proxy endpoints to allow browser actions
 * to securely interact with the authenticated user's Google Drive.
 */

import { Router, Response } from "express";
import { requireAuth, asyncHandler, AuthenticatedRequest, validateBody } from "../middleware";
import { validateByRule } from "../Security";
import { IBackendDriveService } from "../services/driveService";
import { IBackendUploadSessionManager } from "../services/uploadSessionManager";
import { IBackendAuthService } from "../services/authService";

export function createDriveRouter(
  driveService: IBackendDriveService,
  uploadSessionManager: IBackendUploadSessionManager,
  authService: IBackendAuthService
): Router {
  const router = Router();

  /**
   * GET /api/drive/callback
   * Google Drive consent callback: exchanges auth code for persistent credentials,
   * stores them in Firestore under user profile, verifies connection, and renders secure
   * postMessage HTML notifying the opener context before closing popup.
   */
  router.get(
    "/callback",
    asyncHandler(async (req, res) => {
      const { code, state, error } = req.query;

      if (error) {
        console.error("[DRIVE-CALLBACK-ERROR] Google consent error:", error);
        res.send(getFailureHtml(error as string || "Google consent denied."));
        return;
      }

      if (!code || !state) {
        console.error("[DRIVE-CALLBACK-ERROR] Missing code or state from Google redirect.");
        res.send(getFailureHtml("Missing code or state from Google."));
        return;
      }

      try {
        const stateStr = state as string;
        console.log(`[DRIVE-CALLBACK] Received callback with code length ${String(code).length}, state ${stateStr.substring(0, 15)}...`);
        
        // Verify the secure CSRF state and extract the true userId
        const userId = authService.validateAndExtractUserId(stateStr);
        console.log(`[DRIVE-CALLBACK] Extracted userId: ${userId}`);

        const host = req.get("x-forwarded-host") || req.get("host");
        const proto = req.get("x-forwarded-proto") || req.protocol;
        const detectedRedirectUri = host ? `${proto}://${host}/api/drive/callback` : undefined;
        const configuredUri = process.env.GOOGLE_REDIRECT_URI;
        const finalRedirectUri = configuredUri || detectedRedirectUri;

        // Perform backend OAuth token exchange and Firestore persistence
        await authService.exchangeAndStoreTokens(userId, code as string, stateStr, finalRedirectUri);

        // Verify drive sync connection status using driveService
        console.log(`[DRIVE-CALLBACK] Verifying Google Drive API connection status for user: ${userId}`);
        const isAuthorized = await driveService.isUserConnected(userId);
        if (!isAuthorized) {
          console.error(`[DRIVE-CALLBACK-ERROR] driveService.isUserConnected returned false for user: ${userId}`);
          throw new Error("Google Drive verification failed after token exchange.");
        }

        console.log(`[DRIVE-CALLBACK-SUCCESS] Fully authorized Google Drive sync for user: ${userId}`);
        res.send(getSuccessHtml());
      } catch (err: any) {
        console.error("[DRIVE-CALLBACK-EXCHANGE-ERROR] Failed to exchange and store tokens:", {
          message: err.message,
          stack: err.stack,
          code: err.code,
          responseData: err.response?.data
        });
        res.send(getFailureHtml(err.message || "Token exchange failed."));
      }
    })
  );

  /**
   * GET /api/drive/verify
   * Verifies Google Drive connection and exposes connectivity details.
   */
  router.get(
    "/verify",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const authorized = await driveService.isUserConnected(userId);
      res.json({
        authorized,
        userId,
      });
    })
  );

  /**
   * POST /api/drive/folders/chat
   * Creates a dedicated conversation folder on user's Drive.
   */
  router.post(
    "/folders/chat",
    requireAuth,
    validateBody(["chatName", "chatId"]),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { chatName, chatId } = req.body;

      const nameRes = validateByRule(chatName, "CHAT_LABEL");
      if (!nameRes.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: nameRes.code || "INVALID_CHAT_NAME",
            message: nameRes.reason || "Invalid chat label name.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const idRes = validateByRule(chatId, "CHAT_ID");
      if (!idRes.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: idRes.code || "INVALID_CHAT_ID",
            message: idRes.reason || "Invalid chat ID.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const cleanName = nameRes.sanitizedValue || chatName;
      const cleanId = idRes.sanitizedValue || chatId;

      // 1. Resolve root folder ID
      const rootFolderId = await driveService.getOrCreateRootFolder(userId);

      // 2. Create nested chat folder
      const chatFolderId = await driveService.createChatFolder(userId, rootFolderId, cleanName, cleanId);

      // 3. Pre-create ChatText subfolder inside chat root folder according to V3 architecture
      const chatTextFolderId = await driveService.getOrCreateSubfolder(userId, chatFolderId, "ChatText");

      res.json({
        success: true,
        data: {
          chatFolderId,
          driveFolderId: chatFolderId,
          chatTextFolderId,
          driveFolderName: `${cleanName}_${cleanId}`,
        },
      });
    })
  );

  /**
   * POST /api/drive/folders/subfolder
   * Resolves or creates a named subfolder inside a specified parent folder.
   */
  router.post(
    "/folders/subfolder",
    requireAuth,
    validateBody(["parentFolderId", "subfolderName"]),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { parentFolderId, subfolderName } = req.body;

      const subfolderId = await driveService.getOrCreateSubfolder(userId, parentFolderId, subfolderName);

      res.json({
        success: true,
        data: {
          subfolderId,
          subfolderName,
          parentFolderId,
        },
      });
    })
  );

  /**
   * POST /api/drive/upload
   * Proxies a single file binary buffer directly into user's Google Drive folder.
   * Utilizes standard express payload validation.
   */
  router.post(
    "/upload",
    requireAuth,
    validateBody(["folderId", "fileName", "mimeType", "base64Data"]),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { folderId, fileName, mimeType, base64Data } = req.body;

      const fileBuffer = Buffer.from(base64Data, "base64");
      const result = await driveService.uploadFile(userId, folderId, fileBuffer, fileName, mimeType);
 
      res.json({
        success: true,
        data: {
          driveFileId: result.driveFileId,
          originalFileName: result.originalFileName,
          mimeType: result.mimeType,
          fileSize: result.fileSize,
        },
      });
    })
  );

  /**
   * POST /api/drive/upload-session
   * Coordinates a complete upload session for a set of files belonging to a specific chat.
   */
  router.post(
    "/upload-session",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { chatId } = req.body;
      const files = req.body.files || req.body.uploadFiles;

      if (!chatId) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "Malformed body. Missing required field: chatId",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      if (!Array.isArray(files)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "The 'files' or 'uploadFiles' field must be an array.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      // Map request files containing base64 data to native IUploadSessionFile structure
      const parsedFiles = files.map((f: any, idx: number) => {
        if (!f.fileName || !f.mimeType || !f.base64Data) {
          throw new Error(`File at index ${idx} is missing required fields (fileName, mimeType, base64Data)`);
        }
        return {
          fileName: f.fileName,
          mimeType: f.mimeType,
          fileBuffer: Buffer.from(f.base64Data, "base64"),
        };
      });

      const sessionResult = await uploadSessionManager.processUploadSession(userId, chatId, parsedFiles);

      res.json({
        success: true,
        data: sessionResult,
      });
    })
  );

  /**
   * GET /api/drive/folders/:folderId/files
   * Lists files located inside a specific Google Drive folder.
   */
  router.get(
    "/folders/:folderId/files",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { folderId } = req.params;
      const query = (req.query.q as string) || undefined;

      const files = await driveService.listFiles(userId, folderId, query);

      res.json({
        success: true,
        data: files,
      });
    })
  );

  /**
   * GET /api/drive/files/:fileId
   * Proxies binary media streams from Google Drive directly to the client.
   */
  router.get(
    "/files/:fileId",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { fileId } = req.params;
      const authHeader = req.headers.authorization;

      console.log(`[END-TO-END TRACE] Media Download Request Received:`);
      console.log(`  - Path: GET /api/drive/files/${fileId}`);
      console.log(`  - Target File ID: ${fileId}`);
      console.log(`  - Authorization Header: ${authHeader ? "Bearer token detected" : "None"}`);
      console.log(`  - Decoded Firebase UID: ${userId}`);

      const rangeHeader = req.headers.range;

      try {
        const { mimeType, data, size, contentRange, status } = await driveService.downloadFile(userId, fileId, rangeHeader);
        console.log(`[END-TO-END TRACE] Google Drive API Response status: ${status}`);
        console.log(`  - Content-Type determined: ${mimeType}`);
        console.log(`  - Range request: ${rangeHeader || "none"}`);
        console.log(`  - Piping stream content directly to response...`);

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Accept-Ranges", "bytes");
        if (size && !rangeHeader) {
          res.setHeader("Content-Length", size.toString());
        }
        if (contentRange) {
          res.setHeader("Content-Range", contentRange);
        }
        res.status(status);

        // Pipe the stream directly to the Express response
        data.pipe(res);
      } catch (err: any) {
        console.error(`[END-TO-END TRACE] Google Drive download failed for fileId ${fileId}:`, err.message || err);
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Google Drive file not found or inaccessible: ${err.message}`,
            timestamp: new Date().toISOString(),
          }
        });
      }
    })
  );

  return router;
}

function getSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authorization Successful</title>
  <style>
    body {
      background-color: #171717;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
    }
    .container {
      background-color: #262626;
      border: 1px solid #404040;
      border-radius: 1.5rem;
      padding: 2.5rem;
      max-width: 360px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      color: #10b981;
    }
    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p {
      color: #a3a3a3;
      font-size: 0.875rem;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h2>Successfully Connected!</h2>
    <p>Your Google Drive media sync is now authorized. Closing window...</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "OAUTH_SUCCESS" }, "*");
        try {
          window.opener.postMessage({ type: "OAUTH_SUCCESS" }, window.location.origin);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error("Failed to notify opener:", err);
    }
    setTimeout(function() {
      window.close();
    }, 1000);
  </script>
</body>
</html>
  `;
}

function getFailureHtml(errorMessage: string): string {
  const safeMessage = errorMessage
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authorization Failed</title>
  <style>
    body {
      background-color: #171717;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
    }
    .container {
      background-color: #262626;
      border: 1px solid #ef4444;
      border-radius: 1.5rem;
      padding: 2.5rem;
      max-width: 360px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      color: #ef4444;
    }
    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p {
      color: #fca5a5;
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }
    .details {
      font-family: monospace;
      font-size: 0.75rem;
      background-color: rgba(0, 0, 0, 0.2);
      border: 1px solid #404040;
      padding: 0.75rem;
      border-radius: 0.5rem;
      text-align: left;
      word-break: break-all;
      color: #fca5a5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✗</div>
    <h2>Authorization Failed</h2>
    <p>Failed to authorize Google Drive connection.</p>
    <div class="details">${safeMessage}</div>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "OAUTH_FAILURE", error: "${safeMessage}" }, "*");
      }
    } catch (err) {
      console.error("Failed to notify opener:", err);
    }
    setTimeout(function() {
      window.close();
    }, 3000);
  </script>
</body>
</html>
  `;
}

export default createDriveRouter;
