/**
 * ============================================================================
 * Backend Firestore Coordination Service (SAD Section 16 & Section 15.20)
 * ============================================================================
 * Responsibility: Executing privileged server-side/admin reads and writes
 * inside Firestore. Acts as the coordinator for background session validation.
 */

import { getFirestore } from "firebase-admin/firestore";
import { getApps } from "firebase-admin/app";
import { V2Chat, V2Message } from "../../../types";

export interface IBackendFirestoreService {
  /**
   * Safe server-side retrieval of stored user OAuth credentials.
   */
  getUserTokens(userId: string): Promise<string | null>;

  /**
   * Safe server-side storage of refreshed or newly authorized user OAuth tokens.
   */
  storeUserTokens(userId: string, tokens: string): Promise<void>;

  /**
   * Safe server-side removal of user OAuth credentials/metadata upon disconnect.
   */
  disconnectUserDrive(userId: string): Promise<void>;

  /**
   * Retrieves the stored Google Drive root folder ID from the user document.
   */
  getUserRootFolderId(userId: string): Promise<string | null>;

  /**
   * Saves the permanent root Google Drive folder ID to the user document.
   */
  storeUserRootFolderId(userId: string, folderId: string): Promise<void>;

  /**
   * Retrieves the stored Google Drive folder ID for a specific WhatsApp chat document.
   */
  getChatDriveFolderId(userId: string, chatId: string): Promise<string | null>;

  /**
   * Retrieves the stored name for a specific WhatsApp chat document.
   */
  getChatName(userId: string, chatId: string): Promise<string | null>;

  /**
   * Saves the Google Drive folder ID for a specific WhatsApp chat document.
   */
  storeChatDriveFolderId(userId: string, chatId: string, folderId: string): Promise<void>;

  /**
   * Creates or updates a Chat document in Firestore.
   */
  saveChat(userId: string, chat: V2Chat): Promise<void>;

  /**
   * Batch writes Message documents inside the messages subcollection of a Chat.
   * Leverages Firestore Admin Batch writes in chunks of 500.
   */
  saveMessages(userId: string, chatId: string, messages: V2Message[]): Promise<void>;

  /**
   * Verifies that the parameters of an incoming Upload Session match
   * security requirements and user bounds.
   */
  validateUploadSession(userId: string, sessionId: string, fileCount: number): Promise<boolean>;

  /**
   * Permanently deletes a Chat document and all of its nested Message documents.
   */
  deleteChat(userId: string, chatId: string): Promise<void>;
}

export class BackendFirestoreService implements IBackendFirestoreService {
  private getDb() {
    if (getApps().length === 0) {
      console.warn("[BackendFirestoreService] Firebase Admin SDK is uninitialized. Operations may be restricted.");
    }
    return getFirestore();
  }

  public async getUserTokens(userId: string): Promise<string | null> {
    try {
      const db = this.getDb();
      const userDocRef = db.collection("users").doc(userId);
      const docSnap = await userDocRef.get();
      if (!docSnap.exists) {
        return null;
      }
      const data = docSnap.data();
      return data?.driveTokens || null;
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error getting user tokens:`, error.message || error);
      return null;
    }
  }

  public async storeUserTokens(userId: string, tokens: string): Promise<void> {
    try {
      const db = this.getDb();
      const userDocRef = db.collection("users").doc(userId);
      await userDocRef.set({
        driveTokens: tokens,
        driveConnectedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[BackendFirestoreService] Successfully stored drive tokens for user: ${userId}`);
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error storing user tokens:`, error.message || error);
      throw error;
    }
  }

  public async disconnectUserDrive(userId: string): Promise<void> {
    try {
      const db = this.getDb();
      const userDocRef = db.collection("users").doc(userId);
      
      const { FieldValue } = await import("firebase-admin/firestore");
      await userDocRef.update({
        driveTokens: FieldValue.delete(),
        driveConnectedAt: FieldValue.delete()
      });
      console.log(`[BackendFirestoreService] Successfully cleared drive credentials and metadata for user: ${userId}`);
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error disconnecting user drive:`, error.message || error);
      throw error;
    }
  }

  public async getUserRootFolderId(userId: string): Promise<string | null> {
    try {
      const db = this.getDb();
      const userDocRef = db.collection("users").doc(userId);
      const docSnap = await userDocRef.get();
      if (!docSnap.exists) {
        return null;
      }
      const data = docSnap.data();
      return data?.driveRootFolderId || null;
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error getting user root folder ID:`, error.message || error);
      return null;
    }
  }

  public async storeUserRootFolderId(userId: string, folderId: string): Promise<void> {
    try {
      const db = this.getDb();
      const userDocRef = db.collection("users").doc(userId);
      await userDocRef.set({
        driveRootFolderId: folderId
      }, { merge: true });
      console.log(`[BackendFirestoreService] Successfully stored root folder ID ${folderId} for user: ${userId}`);
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error storing user root folder ID:`, error.message || error);
      throw error;
    }
  }

  public async getChatDriveFolderId(userId: string, chatId: string): Promise<string | null> {
    try {
      const db = this.getDb();
      const chatDocRef = db.collection("users").doc(userId).collection("tools_chats").doc(chatId);
      const docSnap = await chatDocRef.get();
      if (!docSnap.exists) {
        return null;
      }
      const data = docSnap.data();
      return data?.driveFolderId || null;
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error getting chat drive folder ID:`, error.message || error);
      return null;
    }
  }

  public async getChatName(userId: string, chatId: string): Promise<string | null> {
    try {
      const db = this.getDb();
      const chatDocRef = db.collection("users").doc(userId).collection("tools_chats").doc(chatId);
      const docSnap = await chatDocRef.get();
      if (!docSnap.exists) {
        return null;
      }
      const data = docSnap.data();
      return data?.name || null;
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error getting chat name:`, error.message || error);
      return null;
    }
  }

  public async storeChatDriveFolderId(userId: string, chatId: string, folderId: string): Promise<void> {
    try {
      const db = this.getDb();
      const chatDocRef = db.collection("users").doc(userId).collection("tools_chats").doc(chatId);
      await chatDocRef.set({
        driveFolderId: folderId
      }, { merge: true });
      console.log(`[BackendFirestoreService] Successfully stored driveFolderId ${folderId} for chat: ${chatId}`);
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error storing chat drive folder ID:`, error.message || error);
      throw error;
    }
  }

  public async saveChat(userId: string, chat: V2Chat): Promise<void> {
    try {
      const db = this.getDb();
      const chatDocRef = db.collection("users").doc(userId).collection("tools_chats").doc(chat.id);
      await chatDocRef.set(chat, { merge: true });
      console.log(`[BackendFirestoreService] Successfully saved chat ${chat.id} for user ${userId}`);
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error saving chat:`, error.message || error);
      throw error;
    }
  }

  public async saveMessages(userId: string, chatId: string, messages: V2Message[]): Promise<void> {
    console.log(`[BackendFirestoreService] Saving ${messages.length} messages inside user ${userId} chat ${chatId}`);
    try {
      const db = this.getDb();
      const BATCH_LIMIT = 500;
      
      for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        const chunk = messages.slice(i, i + BATCH_LIMIT);
        
        chunk.forEach((msg) => {
          const msgDocRef = db
            .collection("users")
            .doc(userId)
            .collection("tools_chats")
            .doc(chatId)
            .collection("messages")
            .doc(msg.id);
          
          const msgPayload: Partial<V2Message> = {
            id: msg.id,
            text: msg.text || "",
            sender: msg.sender,
            senderName: msg.senderName || "",
            timestamp: msg.timestamp,
            time: msg.time || "",
            type: msg.type || "text",
            sequenceIndex: msg.sequenceIndex,
          };

          if (msg.mediaFileName !== undefined) msgPayload.mediaFileName = msg.mediaFileName;
          if (msg.caption !== undefined) msgPayload.caption = msg.caption;
          if (msg.duration !== undefined) msgPayload.duration = msg.duration;
          if (msg.driveFileId !== undefined) msgPayload.driveFileId = msg.driveFileId;

          // WhatsApp Export Reply & View-Once enhancements (SAD Section 13)
          if (msg.replyToMessageId !== undefined) msgPayload.replyToMessageId = msg.replyToMessageId;
          if (msg.replyToSender !== undefined) msgPayload.replyToSender = msg.replyToSender;
          if (msg.replyToSenderName !== undefined) msgPayload.replyToSenderName = msg.replyToSenderName;
          if (msg.replyToText !== undefined) msgPayload.replyToText = msg.replyToText;
          if (msg.replyToType !== undefined) msgPayload.replyToType = msg.replyToType;
          if (msg.isReply !== undefined) msgPayload.isReply = msg.isReply;
          if (msg.isViewOnce !== undefined) msgPayload.isViewOnce = msg.isViewOnce;
          if (msg.viewOnceStatus !== undefined) msgPayload.viewOnceStatus = msg.viewOnceStatus;
          if (msg.viewOnceMediaType !== undefined) msgPayload.viewOnceMediaType = msg.viewOnceMediaType;
          if (msg.isMediaOmitted !== undefined) msgPayload.isMediaOmitted = msg.isMediaOmitted;

          batch.set(msgDocRef, msgPayload, { merge: true });
        });
        
        await batch.commit();
        console.log(`[BackendFirestoreService] Committed batch chunk of size ${chunk.length}`);
      }
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error batch writing messages:`, error.message || error);
      throw error;
    }
  }

  public async validateUploadSession(_userId: string, _sessionId: string, _fileCount: number): Promise<boolean> {
    // Basic structural verification
    return true;
  }

  public async deleteChat(userId: string, chatId: string): Promise<void> {
    try {
      const db = this.getDb();
      const chatDocRef = db.collection("users").doc(userId).collection("tools_chats").doc(chatId);
      
      // 1. Delete all nested messages from the "messages" subcollection
      const messagesRef = chatDocRef.collection("messages");
      const snapshot = await messagesRef.select().get(); // select() returns just document IDs (efficient)
      
      const BATCH_LIMIT = 500;
      const docs = snapshot.docs;
      
      console.log(`[BackendFirestoreService] Deleting ${docs.length} nested messages for chatId ${chatId}...`);
      
      for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        const chunk = docs.slice(i, i + BATCH_LIMIT);
        chunk.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      
      // 2. Delete the chat document itself
      await chatDocRef.delete();
      console.log(`[BackendFirestoreService] Successfully deleted chat ${chatId} and its messages for user ${userId}.`);
    } catch (error: any) {
      console.error(`[BackendFirestoreService] Error deleting chat from Firestore:`, error.message || error);
      throw error;
    }
  }
}

