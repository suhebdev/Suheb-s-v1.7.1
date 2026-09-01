import { V2Message } from "../types";
import { V3BatchPayload } from "../types/v3Types";
import { BatchGeneratorService } from "./batchGeneratorService";
import { v3IndexedDBManagerInstance, CachedBatchMetaRecord } from "./v3IndexedDBManager";
import { googleDriveClientInstance } from "./googleDriveClient";
import { mediaCacheManagerInstance } from "./mediaCacheManager";
import { mediaMapManagerInstance } from "./mediaMapManager";

export interface SlidingWindowConfig {
  messagesPerBatch: number; // Exactly 1500
  hysteresisThreshold: number; // 200 messages of sustained directional scroll
  edgeThresholdMessages: number; // Preload next batch when user is within 300 msgs of window boundary
}

export type ScrollDirection = "down" | "up" | "idle";

export interface ActiveWindowRange {
  prevBatchIndex: number | null;
  currentBatchIndex: number;
  nextBatchIndex: number | null;
}

export class V3ContinuousScrollManager {
  private chatId: string | null = null;
  private chatFolderId: string | null = null;
  private totalMessages: number = 0;
  private totalBatches: number = 1;

  // Active continuous window: keeps [Previous] - [Current] - [Next] in memory
  private currentBatchIndex: number = 1;
  private activeDirection: ScrollDirection = "down";
  private lastScrollIndex: number = 0;
  private sustainedDirectionalMovement: number = 0;

  // In-flight batch fetch promises to prevent redundant network hits
  private inFlightBatchFetches: Map<number, Promise<V2Message[]>> = new Map();

  // Cached batches currently in memory
  private inMemoryBatches: Map<number, V2Message[]> = new Map();

  public init(chatId: string, chatFolderId: string, totalMessages: number, initialBatch1: V2Message[]) {
    this.chatId = chatId;
    this.chatFolderId = chatFolderId;
    this.totalMessages = totalMessages;
    this.totalBatches = Math.max(1, Math.ceil(totalMessages / 1500));
    this.currentBatchIndex = 1;
    this.activeDirection = "down";
    this.lastScrollIndex = 0;
    this.sustainedDirectionalMovement = 0;

    this.inFlightBatchFetches.clear();
    this.inMemoryBatches.clear();
    this.inMemoryBatches.set(1, initialBatch1);
  }

  public clearMemory() {
    this.chatId = null;
    this.chatFolderId = null;
    this.totalMessages = 0;
    this.totalBatches = 1;
    this.currentBatchIndex = 1;
    this.lastScrollIndex = 0;
    this.sustainedDirectionalMovement = 0;
    this.inFlightBatchFetches.clear();
    this.inMemoryBatches.clear();
  }

  public getActiveWindowMessages(): V2Message[] {
    const batchesToInclude: number[] = [];
    
    // Always include [Current - 1], [Current], [Current + 1] if available
    const prev = this.currentBatchIndex > 1 ? this.currentBatchIndex - 1 : null;
    const next = this.currentBatchIndex < this.totalBatches ? this.currentBatchIndex + 1 : null;

    if (prev && this.inMemoryBatches.has(prev)) batchesToInclude.push(prev);
    if (this.inMemoryBatches.has(this.currentBatchIndex)) batchesToInclude.push(this.currentBatchIndex);
    if (next && this.inMemoryBatches.has(next)) batchesToInclude.push(next);

    batchesToInclude.sort((a, b) => a - b);

    const merged: V2Message[] = [];
    for (const bIdx of batchesToInclude) {
      const msgs = this.inMemoryBatches.get(bIdx);
      if (msgs) merged.push(...msgs);
    }
    return merged;
  }

  /**
   * Called on scroll events to update hysteresis and trigger continuation preloading
   */
  public async handleScrollPosition(
    visibleSequenceIndex: number,
    onWindowUpdated?: (updatedMessages: V2Message[]) => void
  ): Promise<void> {
    if (!this.chatId || !this.chatFolderId) return;

    // Detect direction with 200-message hysteresis
    const delta = visibleSequenceIndex - this.lastScrollIndex;
    if (Math.abs(delta) > 5) {
      if (delta > 0) {
        if (this.activeDirection === "down") {
          this.sustainedDirectionalMovement += delta;
        } else {
          this.sustainedDirectionalMovement -= delta;
          if (this.sustainedDirectionalMovement <= -200) {
            this.activeDirection = "down";
            this.sustainedDirectionalMovement = 0;
          }
        }
      } else {
        if (this.activeDirection === "up") {
          this.sustainedDirectionalMovement += Math.abs(delta);
        } else {
          this.sustainedDirectionalMovement -= Math.abs(delta);
          if (this.sustainedDirectionalMovement <= -200) {
            this.activeDirection = "up";
            this.sustainedDirectionalMovement = 0;
          }
        }
      }
      this.lastScrollIndex = visibleSequenceIndex;
    }

    // Calculate which batch the user is currently viewing
    const calculatedBatch = Math.min(this.totalBatches, Math.floor(visibleSequenceIndex / 1500) + 1);

    if (calculatedBatch !== this.currentBatchIndex) {
      this.currentBatchIndex = calculatedBatch;
      this.evictDistantBatches();
    }

    // Check if we need to preload the next directional batch
    const batchStartSeq = (this.currentBatchIndex - 1) * 1500;
    const batchEndSeq = Math.min(this.totalMessages - 1, this.currentBatchIndex * 1500 - 1);
    const offsetInBatch = visibleSequenceIndex - batchStartSeq;

    if (this.activeDirection === "down") {
      // User is scrolling down and within 350 messages of the bottom of current batch
      if (offsetInBatch >= 1150 && this.currentBatchIndex < this.totalBatches) {
        const nextBatchIdx = this.currentBatchIndex + 1;
        if (!this.inMemoryBatches.has(nextBatchIdx) && !this.inFlightBatchFetches.has(nextBatchIdx)) {
          console.log(`[V3ContinuousScrollManager] Preloading next Batch #${nextBatchIdx} in continuation...`);
          this.fetchBatch(nextBatchIdx).then((messages) => {
            this.inMemoryBatches.set(nextBatchIdx, messages);
            if (onWindowUpdated) {
              onWindowUpdated(this.getActiveWindowMessages());
            }
          });
        }
      }
    } else if (this.activeDirection === "up") {
      // User is scrolling up and within 350 messages of the top of current batch
      if (offsetInBatch <= 350 && this.currentBatchIndex > 1) {
        const prevBatchIdx = this.currentBatchIndex - 1;
        if (!this.inMemoryBatches.has(prevBatchIdx) && !this.inFlightBatchFetches.has(prevBatchIdx)) {
          console.log(`[V3ContinuousScrollManager] Preloading previous Batch #${prevBatchIdx} in continuation...`);
          this.fetchBatch(prevBatchIdx).then((messages) => {
            this.inMemoryBatches.set(prevBatchIdx, messages);
            if (onWindowUpdated) {
              onWindowUpdated(this.getActiveWindowMessages());
            }
          });
        }
      }
    }
  }

  /**
   * Evicts batches outside the active 3-batch window: [Current-1, Current, Current+1]
   */
  private evictDistantBatches() {
    const keep = new Set<number>();
    if (this.currentBatchIndex > 1) keep.add(this.currentBatchIndex - 1);
    keep.add(this.currentBatchIndex);
    if (this.currentBatchIndex < this.totalBatches) keep.add(this.currentBatchIndex + 1);

    for (const [batchIdx, msgs] of this.inMemoryBatches.entries()) {
      if (!keep.has(batchIdx)) {
        console.log(`[V3ContinuousScrollManager] Evicting Batch #${batchIdx} from active memory window.`);
        // Revoke any loaded object URLs in evicted batch
        msgs.forEach((m) => {
          const url = (m as any).mediaUrl;
          if (url && typeof url === "string" && url.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(url);
            } catch {}
          }
        });
        this.inMemoryBatches.delete(batchIdx);
      }
    }
  }

  /**
   * Fetches a batch either from IndexedDB or directly from Google Drive
   */
  public async fetchBatch(batchIndex: number): Promise<V2Message[]> {
    if (!this.chatId || !this.chatFolderId) return [];

    if (this.inMemoryBatches.has(batchIndex)) {
      return this.inMemoryBatches.get(batchIndex)!;
    }

    if (this.inFlightBatchFetches.has(batchIndex)) {
      return this.inFlightBatchFetches.get(batchIndex)!;
    }

    const fetchPromise = (async () => {
      const chatId = this.chatId!;
      const chatFolderId = this.chatFolderId!;

      // 1. Check IndexedDB
      const isCached = await v3IndexedDBManagerInstance.isBatchDownloaded(chatId, batchIndex);
      if (isCached) {
        const startSeq = (batchIndex - 1) * 1500;
        const endSeq = batchIndex * 1500 - 1;
        const raw = await v3IndexedDBManagerInstance.getMessagesRange(chatId, startSeq, endSeq);
        if (raw && raw.length > 0) {
          const parsed: V2Message[] = raw.map((r) => ({
            id: r.id,
            sender: r.sender,
            senderName: r.senderName,
            sequenceIndex: r.sequenceIndex,
            text: r.text,
            time: r.time,
            timestamp: r.timestamp,
            type: r.type as any,
            mediaFileName: r.mediaFileName,
            driveFileId: r.driveFileId || mediaMapManagerInstance.getDriveFileId(r.mediaFileName),
            caption: r.caption,
            duration: r.duration,
            isReply: r.isReply,
            replyToSenderName: r.replyToSenderName,
            replyToText: r.replyToText,
          }));
          return parsed;
        }
      }

      // 2. Fetch directly from Google Drive
      console.log(`[V3ContinuousScrollManager] Batch #${batchIndex} not in local DB. Fetching from Drive...`);
      const chatTextFolderId = await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "ChatText");
      const batchFiles = await googleDriveClientInstance.listFolderFiles(
        chatTextFolderId,
        "name contains 'batch_' and mimeType != 'application/vnd.google-apps.folder'"
      );
      batchFiles.sort((a, b) => a.name.localeCompare(b.name));

      const targetFile = batchFiles.find((f) => {
        const numPart = parseInt(f.name.replace(/[^0-9]/g, ""), 10);
        return numPart === batchIndex;
      }) || batchFiles[batchIndex - 1];

      if (!targetFile) {
        throw new Error(`Batch #${batchIndex} file not found in Google Drive`);
      }

      const arrayBuffer = await googleDriveClientInstance.downloadFileArrayBuffer(targetFile.id);
      const compressedBytes = new Uint8Array(arrayBuffer);
      const batchPayload: V3BatchPayload = BatchGeneratorService.decompressBatchPayload(compressedBytes);

      const parsedMessages: V2Message[] = batchPayload.messages.map((m) => {
        let dur = m.duration;
        if (!dur && m.media?.duration) {
          const sec = m.media.duration;
          const mins = Math.floor(sec / 60);
          const secs = Math.floor(sec % 60);
          dur = `${mins}:${secs.toString().padStart(2, "0")}`;
        }
        const mediaFn = m.mediaFileName || m.media?.fileName;
        const resolvedDriveId = m.driveFileId || m.media?.driveFileId || mediaMapManagerInstance.getDriveFileId(mediaFn);

        return {
          id: m.id,
          sender: m.sender,
          senderName: m.senderName,
          sequenceIndex: m.sequenceIndex,
          text: m.text,
          time: m.time,
          timestamp: m.timestamp,
          type: m.type as any,
          mediaFileName: mediaFn,
          driveFileId: resolvedDriveId,
          duration: dur,
          caption: m.caption,
          isReply: m.isReply,
          replyToSenderName: m.replyToSenderName,
          replyToText: m.replyToText,
        };
      });

      // Save into IndexedDB for zero-latency future use
      const dbRecords = parsedMessages.map((m) => ({
        id: m.id,
        chatId,
        sequenceIndex: m.sequenceIndex,
        timestamp: m.timestamp,
        time: m.time,
        sender: m.sender,
        senderName: m.senderName,
        text: m.text,
        type: m.type,
        mediaFileName: m.mediaFileName,
        driveFileId: m.driveFileId,
        duration: m.duration,
        caption: m.caption,
        isReply: m.isReply,
        replyToSenderName: m.replyToSenderName,
        replyToText: m.replyToText,
      }));
      await v3IndexedDBManagerInstance.saveMessagesBatch(dbRecords);

      const batchMeta: CachedBatchMetaRecord = {
        key: `${chatId}_batch_${batchIndex}`,
        chatId,
        batchIndex,
        messageCount: parsedMessages.length,
        startSequenceIndex: batchPayload.startSequenceIndex,
        endSequenceIndex: batchPayload.endSequenceIndex,
        driveFileId: targetFile.id,
        downloadedAt: Date.now(),
      };
      await v3IndexedDBManagerInstance.saveBatchMeta(batchMeta);

      return parsedMessages;
    })();

    this.inFlightBatchFetches.set(batchIndex, fetchPromise);
    try {
      const result = await fetchPromise;
      return result;
    } finally {
      this.inFlightBatchFetches.delete(batchIndex);
    }
  }

  /**
   * Action: "Scroll to Bottom" Triggered
   * If Last Batch N is not in memory or DB, downloads it with priority,
   * configures Upward scrolling active state and returns the last messages.
   */
  public async prepareScrollToBottom(): Promise<{ messages: V2Message[]; targetSequenceIndex: number }> {
    const lastBatchIdx = this.totalBatches;
    console.log(`[V3ContinuousScrollManager] Preparing Scroll to Bottom: Target Batch #${lastBatchIdx}...`);

    let lastBatchMsgs = this.inMemoryBatches.get(lastBatchIdx);
    if (!lastBatchMsgs) {
      lastBatchMsgs = await this.fetchBatch(lastBatchIdx);
      this.inMemoryBatches.set(lastBatchIdx, lastBatchMsgs);
    }

    // Preload previous batch if it exists to ensure continuous reverse scrolling from bottom
    if (lastBatchIdx > 1 && !this.inMemoryBatches.has(lastBatchIdx - 1)) {
      try {
        const prevMsgs = await this.fetchBatch(lastBatchIdx - 1);
        this.inMemoryBatches.set(lastBatchIdx - 1, prevMsgs);
      } catch (err) {
        console.warn("[V3ContinuousScrollManager] Non-fatal: prev batch preload for bottom:", err);
      }
    }

    this.currentBatchIndex = lastBatchIdx;
    this.activeDirection = "up"; // Direction flips to Upward now that user is at bottom
    this.sustainedDirectionalMovement = 0;
    this.evictDistantBatches();

    const targetSeq = Math.max(0, this.totalMessages - 1);
    this.lastScrollIndex = targetSeq;

    return {
      messages: this.getActiveWindowMessages(),
      targetSequenceIndex: targetSeq,
    };
  }
}

export const v3ContinuousScrollManagerInstance = new V3ContinuousScrollManager();
