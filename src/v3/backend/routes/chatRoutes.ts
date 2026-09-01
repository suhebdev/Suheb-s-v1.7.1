/**
 * ============================================================================
 * WhatsApp Chat Backend Routes (SAD Section 15.20)
 * ============================================================================
 * Responsibility: Coordinating secure session validation, schema checks, and
 * administrative curation of chat metadata.
 */

import { Router, Response } from "express";
import { requireAuth, asyncHandler, AuthenticatedRequest, validateBody } from "../middleware";
import { validateByRule } from "../Security";
import { IBackendFirestoreService } from "../services/firestoreService";
import { IBackendDriveService } from "../services/driveService";

export function createChatRouter(
  firestoreService: IBackendFirestoreService,
  driveService: IBackendDriveService
): Router {
  const router = Router();

  /**
   * POST /api/chats/verify-session
   * Verifies an incoming upload session's integrity, ensuring safe and synchronized storage.
   */
  router.post(
    "/verify-session",
    requireAuth,
    validateBody(["sessionId", "messagesCount", "filesList"]),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { sessionId, messagesCount, filesList } = req.body;

      const isValid = await firestoreService.validateUploadSession(userId, sessionId, filesList.length);

      res.json({
        success: isValid,
        data: {
          sessionVerified: isValid,
          messagesCount,
          filesCount: filesList.length,
          timestamp: new Date().toISOString(),
        },
      });
    })
  );

  /**
   * POST /api/chats/save
   * Persists or updates WhatsApp chat metadata in Firestore (Backend).
   */
  router.post(
    "/save",
    requireAuth,
    validateBody(["chat"]),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { chat } = req.body;

      if (chat && typeof chat === "object") {
        if (chat.name) {
          const nameRes = validateByRule(chat.name, "CHAT_LABEL");
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
          chat.name = nameRes.sanitizedValue || chat.name;
        }

        if (chat.id) {
          const idRes = validateByRule(chat.id, "CHAT_ID");
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
          chat.id = idRes.sanitizedValue || chat.id;
        }
      }

      await firestoreService.saveChat(userId, chat);

      res.json({
        success: true,
        message: "Chat metadata persisted successfully.",
      });
    })
  );

  /**
   * POST /api/chats/messages
   * Batch persists parsed WhatsApp message documents in Firestore (Backend).
   */
  router.post(
    "/messages",
    requireAuth,
    validateBody(["chatId", "messages"]),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { chatId, messages } = req.body;

      const chatIdRes = validateByRule(chatId, "CHAT_ID");
      if (!chatIdRes.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: chatIdRes.code || "INVALID_CHAT_ID",
            message: chatIdRes.reason || "Invalid chat ID.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      const cleanChatId = chatIdRes.sanitizedValue || chatId;

      if (!Array.isArray(messages)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_BODY",
            message: "The 'messages' field must be an array.",
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }

      await firestoreService.saveMessages(userId, cleanChatId, messages);

      res.json({
        success: true,
        message: `${messages.length} messages persisted successfully via write batches.`,
      });
    })
  );

  /**
   * DELETE /api/chats/:chatId
   * Permanently deletes a specific chat session, its nested messages, its Google Drive folder, and all media inside.
   */
  router.delete(
    "/:chatId",
    requireAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.uid;
      const { chatId } = req.params;

      if (!chatId) {
        res.status(400).json({
          success: false,
          error: {
            code: "MISSING_CHAT_ID",
            message: "The 'chatId' URL parameter is required.",
            timestamp: new Date().toISOString(),
          }
        });
        return;
      }

      console.log(`[ChatRouter] Initiating permanent secure deletion for userId: ${userId}, chatId: ${chatId}`);

      try {
        // First check if chat document exists to prevent unauthorized or phantom deletion
        const chatName = await firestoreService.getChatName(userId, chatId);
        if (!chatName) {
          res.status(404).json({
            success: false,
            error: {
              code: "CHAT_NOT_FOUND",
              message: "The requested chat session does not exist or you do not have permission to delete it.",
              timestamp: new Date().toISOString(),
            }
          });
          return;
        }

        // 1. Delete the Google Drive folder and its media first
        let driveDeleted = false;
        let driveErrorDetails = null;
        try {
          await driveService.deleteChatFolder(userId, chatId);
          driveDeleted = true;
        } catch (driveErr: any) {
          console.error(`[ChatRouter] Google Drive folder deletion failed or skipped:`, driveErr.message || driveErr);
          driveErrorDetails = driveErr.message || String(driveErr);
        }

        // 2. Delete all Firestore messages and the chat document itself
        await firestoreService.deleteChat(userId, chatId);

        res.json({
          success: true,
          message: "Chat and all associated messages permanently deleted from Firestore.",
          driveDeleted,
          driveErrorDetails,
        });
      } catch (err: any) {
        console.error(`[ChatRouter] Error in secure chat deletion pipeline:`, err.message || err);
        res.status(500).json({
          success: false,
          error: {
            code: "DELETION_FAILED",
            message: err.message || "Failed to permanently delete chat session.",
            timestamp: new Date().toISOString(),
          }
        });
      }
    })
  );

  return router;
}
export default createChatRouter;
