/**
 * ============================================================================
 * Media Map Manager (V3 Dynamic Media Mapping Engine)
 * ============================================================================
 * Decouples Google Drive file IDs from static batch payloads (.json.gz).
 * Generates and parses MediaMap.json in Drive chat folder, providing
 * lightning-fast O(1) in-memory lookup during chat sessions without rewriting
 * message batches.
 */

import { googleDriveClientInstance } from "./googleDriveClient";
import { mediaCacheManagerInstance } from "./mediaCacheManager";

export interface MediaMapPayload {
  version: 1;
  chatId: string;
  totalFiles: number;
  generatedAt: number;
  files: Record<string, string>; // fileName -> driveFileId
}

export class MediaMapManager {
  private activeChatId: string | null = null;
  private activeMediaMap: Map<string, string> = new Map(); // cleanFileName -> driveFileId
  private inFlightLoad: Promise<Map<string, string>> | null = null;

  /**
   * Helper to normalize WhatsApp file names (stripping LTR/RTL unicode marks, trailing dots, spaces)
   */
  public normalizeFileName(fileName?: string | null): string {
    if (!fileName) return "";
    return fileName
      .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
      .replace(/\.+$/, "")
      .trim();
  }

  /**
   * Synchronously resolves a Google Drive file ID from active session map.
   */
  public getDriveFileId(fileName?: string | null): string | undefined {
    if (!fileName) return undefined;
    const cleanName = this.normalizeFileName(fileName);
    return this.activeMediaMap.get(cleanName) || this.activeMediaMap.get(fileName);
  }

  /**
   * Directly sets the active map in memory (e.g. immediately during import).
   */
  public setActiveMap(chatId: string, entries: Record<string, string> | Map<string, string>): void {
    this.activeChatId = chatId;
    this.activeMediaMap.clear();

    const iterator = entries instanceof Map ? entries.entries() : Object.entries(entries);
    for (const [name, driveFileId] of iterator) {
      if (name && driveFileId) {
        const cleanName = this.normalizeFileName(name);
        this.activeMediaMap.set(cleanName, driveFileId);
        this.activeMediaMap.set(name, driveFileId);
        mediaCacheManagerInstance.linkDriveFileId(chatId, cleanName, driveFileId);
      }
    }
  }

  /**
   * Adds or updates a single entry in memory.
   */
  public addEntry(chatId: string, fileName: string, driveFileId: string): void {
    if (this.activeChatId !== chatId) {
      this.activeChatId = chatId;
    }
    const cleanName = this.normalizeFileName(fileName);
    this.activeMediaMap.set(cleanName, driveFileId);
    this.activeMediaMap.set(fileName, driveFileId);
    mediaCacheManagerInstance.linkDriveFileId(chatId, cleanName, driveFileId);
  }

  /**
   * Returns all active map entries as a plain object.
   */
  public getActiveMapEntries(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [k, v] of this.activeMediaMap.entries()) {
      result[k] = v;
    }
    return result;
  }

  /**
   * Loads MediaMap.json from Google Drive chat folder for the active chat session.
   * If MediaMap.json does not exist (legacy chat or interrupted upload),
   * lists the folder/subfolder to construct the map and asynchronously creates MediaMap.json.
   */
  public async loadMediaMap(chatId: string, chatFolderId: string): Promise<Map<string, string>> {
    // If already loaded for this chat, return immediately with 0ms delay
    if (this.activeChatId === chatId && this.activeMediaMap.size > 0) {
      return this.activeMediaMap;
    }

    if (this.inFlightLoad && this.activeChatId === chatId) {
      return this.inFlightLoad;
    }

    this.inFlightLoad = (async () => {
      this.activeChatId = chatId;
      this.activeMediaMap.clear();

      try {
        console.log(`[MediaMapManager] Loading MediaMap for chat '${chatId}' from folder '${chatFolderId}'...`);
        
        // 1. List files in chat folder to find MediaMap.json or MediaMap_*.json
        const rootFiles = await googleDriveClientInstance.listFolderFiles(chatFolderId);
        const mapFiles = rootFiles.filter(
          (f) => f.name === "MediaMap.json" || /^MediaMap_\d+\.json$/i.test(f.name)
        );

        if (mapFiles.length > 0) {
          console.log(`[MediaMapManager] Found ${mapFiles.length} MediaMap file(s) in Drive.`);
          for (const mapFile of mapFiles) {
            try {
              const blob = await googleDriveClientInstance.downloadFileBlob(mapFile.id);
              const text = await blob.text();
              const parsed: MediaMapPayload = JSON.parse(text);
              if (parsed && parsed.files) {
                for (const [name, driveFileId] of Object.entries(parsed.files)) {
                  const cleanName = this.normalizeFileName(name);
                  this.activeMediaMap.set(cleanName, driveFileId);
                  this.activeMediaMap.set(name, driveFileId);
                  mediaCacheManagerInstance.linkDriveFileId(chatId, cleanName, driveFileId);
                }
              }
            } catch (parseErr) {
              console.warn(`[MediaMapManager] Failed to parse map file '${mapFile.name}':`, parseErr);
            }
          }
        } else {
          // Fallback: Check if Media/ subfolder exists and construct map from folder listing
          console.log(`[MediaMapManager] No MediaMap.json found, scanning Media folder for files...`);
          try {
            const mediaFolderId = await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "Media");
            const mediaFiles = await googleDriveClientInstance.listFolderFiles(mediaFolderId);
            
            const constructedFilesMap: Record<string, string> = {};
            for (const mf of mediaFiles) {
              const cleanName = this.normalizeFileName(mf.name);
              this.activeMediaMap.set(cleanName, mf.id);
              this.activeMediaMap.set(mf.name, mf.id);
              constructedFilesMap[cleanName] = mf.id;
              mediaCacheManagerInstance.linkDriveFileId(chatId, cleanName, mf.id);
            }

            console.log(`[MediaMapManager] Dynamically resolved ${mediaFiles.length} media files from Drive.`);

            // Asynchronously generate & save MediaMap.json to Drive for subsequent fast loads
            if (mediaFiles.length > 0) {
              this.saveMediaMap(chatFolderId, constructedFilesMap, chatId).catch((err) => {
                console.warn("[MediaMapManager] Background saveMediaMap error:", err);
              });
            }
          } catch (scanErr) {
            console.warn("[MediaMapManager] Media folder scan warning:", scanErr);
          }
        }

        console.log(`[MediaMapManager] Chat '${chatId}' loaded with ${this.activeMediaMap.size} media mapping entries.`);
        return this.activeMediaMap;
      } catch (err) {
        console.error(`[MediaMapManager] Failed to load MediaMap for chat '${chatId}':`, err);
        return this.activeMediaMap;
      } finally {
        this.inFlightLoad = null;
      }
    })();

    return this.inFlightLoad;
  }

  /**
   * Encodes and uploads MediaMap.json (or chunked MediaMap_N.json if > 3MB) to Google Drive.
   */
  public async saveMediaMap(
    chatFolderId: string,
    filesMap: Record<string, string> | Map<string, string>,
    chatId: string
  ): Promise<void> {
    const plainMap: Record<string, string> = {};
    if (filesMap instanceof Map) {
      for (const [k, v] of filesMap.entries()) {
        plainMap[k] = v;
      }
    } else {
      Object.assign(plainMap, filesMap);
    }

    const totalFiles = Object.keys(plainMap).length;
    if (totalFiles === 0) return;

    const payload: MediaMapPayload = {
      version: 1,
      chatId,
      totalFiles,
      generatedAt: Date.now(),
      files: plainMap,
    };

    const jsonString = JSON.stringify(payload);
    const byteSize = new Blob([jsonString]).size;
    const MAX_CHUNK_BYTES = 3 * 1024 * 1024; // 3 MB max per chunk

    console.log(`[MediaMapManager] Saving MediaMap to Drive (Entries: ${totalFiles}, Size: ${(byteSize / 1024).toFixed(1)} KB)...`);

    if (byteSize <= MAX_CHUNK_BYTES) {
      // Single compact file
      const base64 = btoa(unescape(encodeURIComponent(jsonString)));
      await googleDriveClientInstance.uploadBase64File(
        chatFolderId,
        "MediaMap.json",
        "application/json",
        base64
      );
      console.log(`[MediaMapManager] MediaMap.json successfully saved to Drive.`);
    } else {
      // Chunked files for massive chat exports (> 40k media items)
      const allKeys = Object.keys(plainMap);
      const chunkSize = Math.ceil(allKeys.length / Math.ceil(byteSize / MAX_CHUNK_BYTES));
      let chunkIdx = 1;

      for (let i = 0; i < allKeys.length; i += chunkSize) {
        const chunkKeys = allKeys.slice(i, i + chunkSize);
        const chunkObj: Record<string, string> = {};
        for (const k of chunkKeys) {
          chunkObj[k] = plainMap[k];
        }

        const chunkPayload: MediaMapPayload = {
          version: 1,
          chatId,
          totalFiles: chunkKeys.length,
          generatedAt: Date.now(),
          files: chunkObj,
        };

        const chunkStr = JSON.stringify(chunkPayload);
        const chunkB64 = btoa(unescape(encodeURIComponent(chunkStr)));
        await googleDriveClientInstance.uploadBase64File(
          chatFolderId,
          `MediaMap_${chunkIdx}.json`,
          "application/json",
          chunkB64
        );
        chunkIdx++;
      }
      console.log(`[MediaMapManager] Split MediaMap into ${chunkIdx - 1} chunked files successfully.`);
    }
  }

  /**
   * Clears the active chat in-memory session map on chat close or switch.
   */
  public clearActiveChatMap(): void {
    console.log(`[MediaMapManager] Clearing in-memory MediaMap for chat '${this.activeChatId}'.`);
    this.activeChatId = null;
    this.activeMediaMap.clear();
    this.inFlightLoad = null;
  }
}

export const mediaMapManagerInstance = new MediaMapManager();
