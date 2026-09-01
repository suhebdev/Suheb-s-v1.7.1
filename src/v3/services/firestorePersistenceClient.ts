/**
 * ============================================================================
 * Firestore Persistence Client Service (SAD Section 15 & Phase 4.2)
 * ============================================================================
 * Responsibility: Wrap HTTP POST requests to /api/chats/save and
 * /api/chats/messages to securely persist chat metadata and messages in the
 * backend Firestore database. No business logic, purely a transport client.
 */

import { V2Chat, V2Message } from "../../types";
import { isFirebaseConfigured, getFirebaseAuth, getFirebaseFirestore, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { getApiUrl } from "../../lib/api";

export interface FirestoreSaveResponse {
  success: boolean;
  message: string;
}

export interface IFirestorePersistenceClient {
  saveChat(chat: V2Chat): Promise<FirestoreSaveResponse>;
  saveMessages(chatId: string, messages: V2Message[]): Promise<FirestoreSaveResponse>;
  deleteChat(chatId: string): Promise<FirestoreSaveResponse>;
  getUserChats(userId: string): Promise<V2Chat[]>;
  getChatLatestMessage(userId: string, chatId: string): Promise<V2Message | null>;
}

export class FirestorePersistenceClient implements IFirestorePersistenceClient {
  /**
   * Safe retrieval of authorization headers using Firebase ID Token
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        if (auth.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${idToken}`;
        }
      } catch (err) {
        console.warn("[FirestorePersistenceClient] Failed to obtain Firebase ID token:", err);
      }
    }
    return headers;
  }

  /**
   * Fetches all chats belonging to a user from Firestore
   */
  public async getUserChats(userId: string): Promise<V2Chat[]> {
    const path = `users/${userId}/tools_chats`;
    try {
      const db = getFirebaseFirestore();
      const chatsRef = collection(db, "users", userId, "tools_chats");
      const q = query(chatsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      const chats: V2Chat[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as V2Chat;
        chats.push({
          ...data,
          id: data.id || docSnap.id,
        });
      });
      return chats;
    } catch (error) {
      console.warn("[FirestorePersistenceClient] Direct Firestore read failed, falling back to empty list:", error);
      return [];
    }
  }

  /**
   * Fetches the latest message for a chat (legacy fallback)
   */
  public async getChatLatestMessage(userId: string, chatId: string): Promise<V2Message | null> {
    return null;
  }

  /**
   * Triggers the backend save of the chat metadata
   */
  public async saveChat(chat: V2Chat): Promise<FirestoreSaveResponse> {
    console.log(`[FirestorePersistenceClient] Saving chat metadata for chatId: ${chat.id}`);
    const headers = await this.getHeaders();
    const body = JSON.stringify({ chat });

    try {
      const response = await fetch(getApiUrl("/api/chats/save"), {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        let errMsg = `Chat save failed with status code ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error && errData.error.message) {
            errMsg = errData.error.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const resJson = await response.json();
      if (!resJson || resJson.success === false) {
        throw new Error(resJson?.error?.message || "Failed to persist chat metadata.");
      }

      return resJson as FirestoreSaveResponse;
    } catch (error: any) {
      console.error("[FirestorePersistenceClient] Error calling /api/chats/save:", error);
      throw error;
    }
  }

  /**
   * Triggers the backend batch writes of parsed chat messages
   */
  public async saveMessages(chatId: string, messages: V2Message[]): Promise<FirestoreSaveResponse> {
    console.log(`[FirestorePersistenceClient] Saving ${messages.length} messages for chatId: ${chatId}`);
    const headers = await this.getHeaders();
    const body = JSON.stringify({ chatId, messages });

    try {
      const response = await fetch(getApiUrl("/api/chats/messages"), {
        method: "POST",
        headers,
        body,
      });

      if (!response.ok) {
        let errMsg = `Messages save failed with status code ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error && errData.error.message) {
            errMsg = errData.error.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const resJson = await response.json();
      if (!resJson || resJson.success === false) {
        throw new Error(resJson?.error?.message || "Failed to batch persist chat messages.");
      }

      return resJson as FirestoreSaveResponse;
    } catch (error: any) {
      console.error("[FirestorePersistenceClient] Error calling /api/chats/messages:", error);
      throw error;
    }
  }

  /**
   * Triggers the backend secure deletion of the chat and its Google Drive folders/files
   */
  public async deleteChat(chatId: string): Promise<FirestoreSaveResponse> {
    console.log(`[FirestorePersistenceClient] Requesting permanent deletion of chatId: ${chatId}`);
    const headers = await this.getHeaders();

    try {
      const response = await fetch(getApiUrl(`/api/chats/${chatId}`), {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        let errMsg = `Chat deletion failed with status code ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error && errData.error.message) {
            errMsg = errData.error.message;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const resJson = await response.json();
      if (!resJson || resJson.success === false) {
        throw new Error(resJson?.error?.message || "Failed to permanently delete chat.");
      }

      return resJson as FirestoreSaveResponse;
    } catch (error: any) {
      console.error("[FirestorePersistenceClient] Error calling DELETE /api/chats/:chatId:", error);
      throw error;
    }
  }

  /**
   * Retrieves a range of chat messages
   */
  public async getChatMessagesRange(chatId: string, startSeq: number, endSeq: number): Promise<V2Message[]> {
    const headers = await this.getHeaders();
    try {
      const response = await fetch(
        getApiUrl(`/api/chats/${chatId}/messages?startSeq=${startSeq}&endSeq=${endSeq}`),
        { headers }
      );
      if (!response.ok) return [];
      const resJson = await response.json();
      return resJson.data?.messages || [];
    } catch (err) {
      console.warn("[FirestorePersistenceClient] getChatMessagesRange fallback error:", err);
      return [];
    }
  }
}

export const firestorePersistenceClientInstance = new FirestorePersistenceClient();
export default firestorePersistenceClientInstance;
