import { V2Message } from "../types";
import { V3BatchPayload } from "../types/v3Types";
import { BatchGeneratorService } from "./batchGeneratorService";
import { v3IndexedDBManagerInstance, CachedBatchMetaRecord } from "./v3IndexedDBManager";
import { googleDriveClientInstance } from "./googleDriveClient";
import { mediaCacheManagerInstance } from "./mediaCacheManager";
import { mediaMapManagerInstance } from "./mediaMapManager";

export interface ChatOpenProgress {
  stage: "init" | "fetching_batch_1" | "decompressing" | "prioritizing_media" | "ready";
  progressPercent: number;
  message: string;
  totalMessagesInBatch: number;
}

export interface ChatOpenResult {
  initialMessages: V2Message[];
  totalChatMessages: number;
  isBackgroundSyncing: boolean;
}

/**
 * ============================================================================
 * V3 Chat Viewer Loader (Section 6 - Lifecycle & Initial Viewport Engine)
 * ============================================================================
 * Implements the exact architecture:
 * 1. User Clicks Chat -> Sleek Loading Screen
 * 2. Firestore -> Minimal chat metadata only
 * 3. Check IndexedDB -> If Batch 1 missing, fetch `batch_0000000001.json.gz` from Drive
 * 4. Decompress via pako -> Save Batch 1 into IndexedDB
 * 5. First 60 messages: Media Priority Processing
 *    - If >50% media -> Heavy-media mode (~30% priority media/metadata)
 *    - Else -> Normal initial media priority
 * 6. Loading Screen Removed -> User enters Chat Viewer (1,500 messages ready)
 * 7. Background Worker -> Sequentially fetches Batch 2, Batch 3... and remaining media
 */
export class V3ChatViewerLoader {
  private activeSyncChatId: string | null = null;
  private abortController: AbortController | null = null;

  public async openChat(
    chatId: string,
    chatFolderId: string,
    totalMessageCount: number,
    onProgress?: (progress: ChatOpenProgress) => void
  ): Promise<ChatOpenResult> {
    console.log(`[V3ChatViewerLoader] Opening chat '${chatId}' (Total messages: ${totalMessageCount})...`);

    // Cancel any previous chat background synchronization
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const currentSignal = this.abortController.signal;

    // Section 8.2 & Section 9: If opening a different chat, evict previous chat's data FIRST from IndexedDB before downloading new chat
    if (this.activeSyncChatId && this.activeSyncChatId !== chatId) {
      console.log(`[V3ChatViewerLoader] Section 8.2: Evicting previous chat '${this.activeSyncChatId}' BEFORE opening new chat '${chatId}'`);
      try {
        await v3IndexedDBManagerInstance.deleteChatData(this.activeSyncChatId);
        console.log(`[V3ChatViewerLoader] Previous chat '${this.activeSyncChatId}' completely evicted from IndexedDB.`);
      } catch (evictErr) {
        console.warn("[V3ChatViewerLoader] Previous chat eviction warning:", evictErr);
      }
    }
    this.activeSyncChatId = chatId;

    if (onProgress) {
      onProgress({
        stage: "init",
        progressPercent: 10,
        message: "Initializing chat session...",
        totalMessagesInBatch: 0,
      });
    }

    // Step 0: Pre-fetch in-memory MediaMap for instant O(1) media lookups
    const mediaMapPromise = mediaMapManagerInstance.loadMediaMap(chatId, chatFolderId);

    // Step 1 & 2: Check IndexedDB for Batch 1 (messages 0 to 1499)
    let batch1Messages: V2Message[] = [];
    const isBatch1Cached = await v3IndexedDBManagerInstance.isBatchDownloaded(chatId, 1);

    if (isBatch1Cached) {
      console.log(`[V3ChatViewerLoader] Batch 1 found in IndexedDB cache!`);
      if (onProgress) {
        onProgress({
          stage: "decompressing",
          progressPercent: 60,
          message: "Loading cached messages from storage...",
          totalMessagesInBatch: 1500,
        });
      }
      await mediaMapPromise;
      const rawRecords = await v3IndexedDBManagerInstance.getMessagesRange(chatId, 0, 1499);
      batch1Messages = rawRecords.map((r) => ({
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
    } else {
      // Fallback check if raw records exist in IndexedDB even without batch_meta
      const rawRecords = await v3IndexedDBManagerInstance.getMessagesRange(chatId, 0, 1499);
      if (rawRecords.length > 0) {
        console.log(`[V3ChatViewerLoader] Found ${rawRecords.length} cached records in IndexedDB without meta, loading directly.`);
        await mediaMapPromise;
        batch1Messages = rawRecords.map((r) => ({
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
      }
    }

    // Step 3 & 4: If Batch 1 is not in IndexedDB, fetch from Google Drive ChatText/
    let chatTextFolderId: string | null = null;
    let allDriveBatchFiles: Array<{ id: string; name: string }> = [];

    if (batch1Messages.length === 0) {
      if (onProgress) {
        onProgress({
          stage: "fetching_batch_1",
          progressPercent: 30,
          message: "Downloading initial message batch from Google Drive...",
          totalMessagesInBatch: 0,
        });
      }

      chatTextFolderId = await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "ChatText");
      allDriveBatchFiles = await googleDriveClientInstance.listFolderFiles(
        chatTextFolderId,
        "name contains 'batch_' and mimeType != 'application/vnd.google-apps.folder'"
      );
      allDriveBatchFiles.sort((a, b) => a.name.localeCompare(b.name));

      const batch1File =
        allDriveBatchFiles.find((f) => {
          const numPart = parseInt(f.name.replace(/[^0-9]/g, ""), 10);
          return numPart === 1;
        }) ||
        allDriveBatchFiles.find((f) => f.name.includes("batch_")) ||
        allDriveBatchFiles[0];

      if (batch1File) {
        if (onProgress) {
          onProgress({
            stage: "decompressing",
            progressPercent: 50,
            message: "Decompressing message stream...",
            totalMessagesInBatch: 1500,
          });
        }

        const arrayBuffer = await googleDriveClientInstance.downloadFileArrayBuffer(batch1File.id);
        const compressedBytes = new Uint8Array(arrayBuffer);
        const batchPayload: V3BatchPayload = BatchGeneratorService.decompressBatchPayload(compressedBytes);

        await mediaMapPromise;

        batch1Messages = batchPayload.messages.map((m) => {
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

        // Persist Batch 1 to IndexedDB
        const dbRecords = batch1Messages.map((m) => ({
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
          key: `${chatId}_batch_1`,
          chatId,
          batchIndex: 1,
          messageCount: batch1Messages.length,
          startSequenceIndex: batchPayload.startSequenceIndex,
          endSequenceIndex: batchPayload.endSequenceIndex,
          driveFileId: batch1File.id,
          downloadedAt: Date.now(),
        };
        await v3IndexedDBManagerInstance.saveBatchMeta(batchMeta);
      }
    }

    // Step 5: First 60 messages - Media Priority Processing
    const first60 = batch1Messages.slice(0, 60);
    const mediaMessagesInFirst60 = first60.filter(
      (m) => (m.type as string) !== "text" && (m.type as string) !== "system" && m.mediaFileName
    );
    const mediaCountInFirst60 = mediaMessagesInFirst60.length;

    const mediaDensity = first60.length > 0 ? mediaCountInFirst60 / first60.length : 0;
    const isHeavyMedia = mediaDensity > 0.5;

    console.log(
      `[V3ChatViewerLoader] First 60 density: ${(mediaDensity * 100).toFixed(1)}% media (${mediaCountInFirst60} media items). Heavy-Media Mode: ${isHeavyMedia}`
    );

    // If Heavy media mode (>50% media): prioritize top ~30% of media (or top 10 items)
    // If Normal mode: prioritize all media in first viewport (up to 15 items)
    const mediaToPreloadLimit = isHeavyMedia
      ? Math.max(5, Math.min(mediaCountInFirst60, Math.ceil(mediaCountInFirst60 * 0.3)))
      : Math.min(mediaCountInFirst60, 15);

    const targetMedia = mediaMessagesInFirst60.slice(0, mediaToPreloadLimit);

    if (targetMedia.length > 0) {
      // Non-blocking background pre-warming of initial viewport media
      setTimeout(() => {
        targetMedia.forEach(async (msg) => {
          try {
            const url = await mediaCacheManagerInstance.getMediaUrl(chatId, msg.mediaFileName!, msg.driveFileId);
            const isImageLike = msg.type === "image" || msg.type === "sticker" || !msg.type || (msg.type as string) === "media";
            if (url && isImageLike) {
              const img = new Image();
              img.src = url;
              if (img.decode) {
                img.decode().catch(() => {});
              }
            }
          } catch (err) {
            // Ignore non-fatal pre-decode errors
          }
        });
      }, 50);
    }

    if (onProgress) {
      onProgress({
        stage: "ready",
        progressPercent: 100,
        message: "Ready!",
        totalMessagesInBatch: batch1Messages.length,
      });
    }

    // Step 6 & 7: Start Background Worker for remaining batches after initial render completes
    const hasRemainingBatches = totalMessageCount > 1500;
    if (hasRemainingBatches) {
      setTimeout(() => {
        if (!currentSignal.aborted) {
          this.startBackgroundSync(chatId, chatFolderId, totalMessageCount, currentSignal).catch((err) => {
            console.warn(`[V3ChatViewerLoader] Background sync stopped or failed:`, err);
          });
        }
      }, 1200);
    }

    return {
      initialMessages: batch1Messages,
      totalChatMessages: totalMessageCount,
      isBackgroundSyncing: hasRemainingBatches,
    };
  }

  /**
   * Background Worker that silently synchronizes Batches 2..N into IndexedDB
   */
  private async startBackgroundSync(
    chatId: string,
    chatFolderId: string,
    totalMessageCount: number,
    signal: AbortSignal
  ): Promise<void> {
    const totalBatches = Math.ceil(totalMessageCount / 1500);
    console.log(`[V3ChatViewerLoader Background Worker] Starting sync for chat '${chatId}' (Total batches: ${totalBatches})...`);

    const chatTextFolderId = await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "ChatText");
    const batchFiles = await googleDriveClientInstance.listFolderFiles(
      chatTextFolderId,
      "name contains 'batch_' and mimeType != 'application/vnd.google-apps.folder'"
    );
    batchFiles.sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 1; i < batchFiles.length; i++) {
      if (signal.aborted || this.activeSyncChatId !== chatId) {
        console.log(`[V3ChatViewerLoader Background Worker] Aborted for chat '${chatId}'.`);
        return;
      }

      const batchIndex = i + 1;
      const isCached = await v3IndexedDBManagerInstance.isBatchDownloaded(chatId, batchIndex);
      if (isCached) {
        continue;
      }

      const batchFile = batchFiles[i];
      try {
        console.log(`[V3ChatViewerLoader Background Worker] Fetching Batch #${batchIndex} (${batchFile.name})...`);
        const arrayBuffer = await googleDriveClientInstance.downloadFileArrayBuffer(batchFile.id);
        const compressedBytes = new Uint8Array(arrayBuffer);
        const batchPayload: V3BatchPayload = BatchGeneratorService.decompressBatchPayload(compressedBytes);

        const messages = batchPayload.messages.map((m) => {
          const mediaFn = m.mediaFileName || m.media?.fileName;
          const resolvedDriveId = m.driveFileId || m.media?.driveFileId || mediaMapManagerInstance.getDriveFileId(mediaFn);

          return {
            id: m.id,
            chatId,
            sequenceIndex: m.sequenceIndex,
            timestamp: m.timestamp,
            time: m.time,
            sender: m.sender,
            senderName: m.senderName,
            text: m.text,
            type: m.type,
            mediaFileName: mediaFn,
            driveFileId: resolvedDriveId,
            caption: m.caption,
            isReply: m.isReply,
            replyToSenderName: m.replyToSenderName,
            replyToText: m.replyToText,
          };
        });

        await v3IndexedDBManagerInstance.saveMessagesBatch(messages);

        const batchMeta: CachedBatchMetaRecord = {
          key: `${chatId}_batch_${batchIndex}`,
          chatId,
          batchIndex,
          messageCount: messages.length,
          startSequenceIndex: batchPayload.startSequenceIndex,
          endSequenceIndex: batchPayload.endSequenceIndex,
          driveFileId: batchFile.id,
          downloadedAt: Date.now(),
        };
        await v3IndexedDBManagerInstance.saveBatchMeta(batchMeta);

        console.log(`[V3ChatViewerLoader Background Worker] Batch #${batchIndex} persisted to IndexedDB.`);

        // Idle delay between batches to never block UI thread (150ms)
        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        console.error(`[V3ChatViewerLoader Background Worker] Failed to sync batch #${batchIndex}:`, err);
      }
    }

    console.log(`[V3ChatViewerLoader Background Worker] Chat '${chatId}' fully synchronized locally.`);
  }
}

export const v3ChatViewerLoaderInstance = new V3ChatViewerLoader();
