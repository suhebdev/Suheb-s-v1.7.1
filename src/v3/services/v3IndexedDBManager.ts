export interface IndexedDBMessageRecord {
  id: string;
  chatId: string;
  sequenceIndex: number;
  timestamp: string;
  time: string;
  sender: "me" | "other" | "system";
  senderName: string;
  text: string;
  type: string;
  mediaFileName?: string;
  driveFileId?: string;
  caption?: string;
  duration?: string;
  isReply?: boolean;
  replyToSenderName?: string;
  replyToText?: string;
  data?: any;
}

export interface IndexedDBMediaRecord {
  key: string; // `${chatId}_${fileName}`
  chatId: string;
  fileName: string;
  driveFileId?: string;
  blob?: Blob;
  mimeType: string;
  size: number;
  cachedAt: number;
}

export interface IndexedDBChatRecord {
  chatId: string;
  name: string;
  fileName: string;
  myIdentity: string;
  otherIdentity: string;
  driveFolderId: string;
  totalMessageCount: number;
  storageVersion: number;
  isImported: boolean;
  createdAt: string;
  cachedAt: number;
}

export interface CachedBatchMetaRecord {
  key: string; // `${chatId}_batch_${batchIndex}`
  chatId: string;
  batchIndex: number;
  messageCount: number;
  startSequenceIndex: number;
  endSequenceIndex: number;
  driveFileId?: string;
  downloadedAt: number;
}

export interface StorageEstimateResult {
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
}

const DB_NAME = "WhatsAppToolV3DB";
const DB_VERSION = 2;

export class V3IndexedDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: chats (Chat Metadata)
        if (!db.objectStoreNames.contains("chats")) {
          db.createObjectStore("chats", { keyPath: "chatId" });
        }

        // Store 2: messages (Indexed by sequence and chatId)
        if (!db.objectStoreNames.contains("messages")) {
          const messageStore = db.createObjectStore("messages", { keyPath: "id" });
          messageStore.createIndex("by_chat_and_seq", ["chatId", "sequenceIndex"], { unique: true });
          messageStore.createIndex("by_chatId", "chatId", { unique: false });
        } else {
          // If upgraded from version 1
          const msgStore = request.transaction?.objectStore("messages");
          if (msgStore && !msgStore.indexNames.contains("by_chat_and_seq")) {
            msgStore.createIndex("by_chat_and_seq", ["chatId", "sequenceIndex"], { unique: true });
          }
        }

        // Store 3: media (Cached binary Blobs)
        if (!db.objectStoreNames.contains("media")) {
          const mediaStore = db.createObjectStore("media", { keyPath: "key" });
          mediaStore.createIndex("by_chatId", "chatId", { unique: false });
        }

        // Store 4: batch_meta (Tracking downloaded GZIP batch ranges)
        if (!db.objectStoreNames.contains("batch_meta")) {
          const batchMetaStore = db.createObjectStore("batch_meta", { keyPath: "key" });
          batchMetaStore.createIndex("by_chatId", "chatId", { unique: false });
          batchMetaStore.createIndex("by_chat_and_batch", ["chatId", "batchIndex"], { unique: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- CHATS STORE ---

  public async saveChat(chat: IndexedDBChatRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("chats", "readwrite");
      tx.objectStore("chats").put(chat);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getChat(chatId: string): Promise<IndexedDBChatRecord | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("chats", "readonly");
      const req = tx.objectStore("chats").get(chatId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllChats(): Promise<IndexedDBChatRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("chats", "readonly");
      const req = tx.objectStore("chats").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- MESSAGES STORE ---

  public async saveMessagesBatch(messages: IndexedDBMessageRecord[]): Promise<void> {
    if (messages.length === 0) return;
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readwrite");
      const store = tx.objectStore("messages");
      for (const msg of messages) {
        store.put(msg);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMessagesByChat(chatId: string): Promise<IndexedDBMessageRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readonly");
      const store = tx.objectStore("messages");
      const index = store.index("by_chat_and_seq");
      const range = IDBKeyRange.bound([chatId, 0], [chatId, Number.MAX_SAFE_INTEGER]);
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getMessagesRange(chatId: string, startSeq: number, endSeq: number): Promise<IndexedDBMessageRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readonly");
      const store = tx.objectStore("messages");
      const index = store.index("by_chat_and_seq");
      const range = IDBKeyRange.bound([chatId, startSeq], [chatId, endSeq]);
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getMessageCount(chatId: string): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readonly");
      const store = tx.objectStore("messages");
      const index = store.index("by_chatId");
      const req = index.count(IDBKeyRange.only(chatId));
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }

  // --- BATCH METADATA STORE ---

  public async saveBatchMeta(record: CachedBatchMetaRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("batch_meta", "readwrite");
      tx.objectStore("batch_meta").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getDownloadedBatches(chatId: string): Promise<CachedBatchMetaRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("batch_meta", "readonly");
      const store = tx.objectStore("batch_meta");
      const index = store.index("by_chatId");
      const req = index.getAll(IDBKeyRange.only(chatId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async isBatchDownloaded(chatId: string, batchIndex: number): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("batch_meta", "readonly");
      const store = tx.objectStore("batch_meta");
      const index = store.index("by_chat_and_batch");
      const req = index.get([chatId, batchIndex]);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --- MEDIA STORE ---

  public async saveMediaItem(record: IndexedDBMediaRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media", "readwrite");
      tx.objectStore("media").put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getMediaItem(chatId: string, fileName: string): Promise<IndexedDBMediaRecord | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("media", "readonly");
      const req = tx.objectStore("media").get(`${chatId}_${fileName}`);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // --- STORAGE QUOTA & CLEANUP ---

  public async getStorageEstimate(): Promise<StorageEstimateResult> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 1024 * 1024 * 1024; // Default 1GB estimate
      return {
        usageBytes: usage,
        quotaBytes: quota,
        usagePercent: Math.round((usage / quota) * 100),
      };
    }
    return { usageBytes: 0, quotaBytes: 0, usagePercent: 0 };
  }

  public async deleteChatData(chatId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["chats", "messages", "media", "batch_meta"], "readwrite");

      // 1. Delete chat
      tx.objectStore("chats").delete(chatId);

      // 2. Delete messages
      const msgStore = tx.objectStore("messages");
      const msgIndex = msgStore.index("by_chatId");
      const msgReq = msgIndex.getAllKeys(chatId);
      msgReq.onsuccess = () => {
        const keys = msgReq.result || [];
        keys.forEach((key) => msgStore.delete(key));
      };

      // 3. Delete media
      const mediaStore = tx.objectStore("media");
      const mediaIndex = mediaStore.index("by_chatId");
      const mediaReq = mediaIndex.getAllKeys(chatId);
      mediaReq.onsuccess = () => {
        const keys = mediaReq.result || [];
        keys.forEach((key) => mediaStore.delete(key));
      };

      // 4. Delete batch_meta
      const batchStore = tx.objectStore("batch_meta");
      const batchIndex = batchStore.index("by_chatId");
      const batchReq = batchIndex.getAllKeys(chatId);
      batchReq.onsuccess = () => {
        const keys = batchReq.result || [];
        keys.forEach((key) => batchStore.delete(key));
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async clearAllSessionData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["messages", "media", "batch_meta"], "readwrite");
      tx.objectStore("messages").clear();
      tx.objectStore("media").clear();
      tx.objectStore("batch_meta").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const v3IndexedDBManagerInstance = new V3IndexedDBManager();
