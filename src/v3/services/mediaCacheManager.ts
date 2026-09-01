import { v3IndexedDBManagerInstance } from "./v3IndexedDBManager";
import { googleDriveClientInstance } from "./googleDriveClient";
import { mediaMapManagerInstance } from "./mediaMapManager";

/**
 * ============================================================================
 * Media Cache & Object URL Lifecycle Service (Section 5.5)
 * ============================================================================
 * Handles caching binary media files (images, audio, video) in IndexedDB,
 * dispensing managed Object URLs, and revoking them to prevent memory leaks.
 */

export class MediaCacheManager {
  private activeObjectUrls = new Map<string, string>(); // key: `${chatId}_${fileName}` -> objectUrl
  private activeDriveUrls = new Map<string, string>(); // key: driveFileId -> objectUrl
  private activeApiUrls = new Map<string, string>(); // key: `/api/drive/files/${driveFileId}` -> objectUrl

  /**
   * Synchronously checks if an Object URL already exists in memory.
   */
  public getActiveUrl(keyOrFileIdOrUrl: string): string | undefined {
    return (
      this.activeObjectUrls.get(keyOrFileIdOrUrl) ||
      this.activeDriveUrls.get(keyOrFileIdOrUrl) ||
      this.activeApiUrls.get(keyOrFileIdOrUrl)
    );
  }

  /**
   * Registers a Blob as an Object URL across all lookup indices.
   */
  public registerBlobUrl(chatId: string, fileName: string, driveFileId: string | undefined, blob: Blob): string {
    const key = `${chatId}_${fileName}`;
    let objectUrl = this.activeObjectUrls.get(key);
    if (!objectUrl) {
      objectUrl = URL.createObjectURL(blob);
      this.activeObjectUrls.set(key, objectUrl);
    }
    if (driveFileId) {
      this.activeDriveUrls.set(driveFileId, objectUrl);
      this.activeApiUrls.set(`/api/drive/files/${driveFileId}`, objectUrl);
    }
    return objectUrl;
  }

  /**
   * Links a new driveFileId to an existing cached Object URL.
   */
  public linkDriveFileId(chatId: string, fileName: string, driveFileId: string): void {
    const key = `${chatId}_${fileName}`;
    const objectUrl = this.activeObjectUrls.get(key);
    if (objectUrl) {
      this.activeDriveUrls.set(driveFileId, objectUrl);
      this.activeApiUrls.set(`/api/drive/files/${driveFileId}`, objectUrl);
    }
  }

  /**
   * Resolves a usable Media URL for a given media file.
   * Priority:
   * 1. Existing in-memory Object URL
   * 2. IndexedDB cached Blob -> create new Object URL
   * 3. Google Drive download -> store in IndexedDB -> create Object URL
   */
  public async getMediaUrl(chatId: string, fileName: string, driveFileId?: string): Promise<string | null> {
    const key = `${chatId}_${fileName}`;
    const effectiveDriveFileId = driveFileId || mediaMapManagerInstance.getDriveFileId(fileName);

    // 1. Check in-memory Object URL
    if (this.activeObjectUrls.has(key)) {
      return this.activeObjectUrls.get(key)!;
    }
    if (effectiveDriveFileId && this.activeDriveUrls.has(effectiveDriveFileId)) {
      return this.activeDriveUrls.get(effectiveDriveFileId)!;
    }

    // 2. Check IndexedDB
    try {
      const cached = await v3IndexedDBManagerInstance.getMediaItem(chatId, fileName);
      if (cached && cached.blob) {
        const objectUrl = this.registerBlobUrl(chatId, fileName, effectiveDriveFileId, cached.blob);
        return objectUrl;
      }
    } catch (err) {
      console.warn(`[MediaCacheManager] Error querying IndexedDB for media '${fileName}':`, err);
    }

    // 3. Fallback: Download from Google Drive if effectiveDriveFileId is provided
    if (effectiveDriveFileId) {
      try {
        console.log(`[MediaCacheManager] Fetching media blob '${fileName}' from Google Drive (${effectiveDriveFileId})...`);
        const blob = await googleDriveClientInstance.downloadFileBlob(effectiveDriveFileId);

        // Cache into IndexedDB
        await v3IndexedDBManagerInstance.saveMediaItem({
          key,
          chatId,
          fileName,
          driveFileId: effectiveDriveFileId,
          blob,
          mimeType: blob.type || "application/octet-stream",
          size: blob.size,
          cachedAt: Date.now(),
        });

        const objectUrl = this.registerBlobUrl(chatId, fileName, effectiveDriveFileId, blob);
        return objectUrl;
      } catch (err) {
        console.error(`[MediaCacheManager] Failed to download media from Drive (${effectiveDriveFileId}):`, err);
      }
    }

    return null;
  }

  /**
   * Revokes a specific Object URL to free browser memory.
   */
  public revokeMediaUrl(chatId: string, fileName: string): void {
    const key = `${chatId}_${fileName}`;
    if (this.activeObjectUrls.has(key)) {
      const url = this.activeObjectUrls.get(key)!;
      URL.revokeObjectURL(url);
      this.activeObjectUrls.delete(key);
    }
  }

  /**
   * Revokes all active Object URLs across the entire app.
   */
  public revokeAllUrls(): void {
    this.activeObjectUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    this.activeObjectUrls.clear();
    this.activeDriveUrls.clear();
    this.activeApiUrls.clear();
  }
}

export const mediaCacheManagerInstance = new MediaCacheManager();
