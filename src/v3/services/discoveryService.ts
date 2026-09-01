/**
 * ============================================================================
 * File Discovery & Classification Service (SAD Section 12)
 * ============================================================================
 * Responsibility: Indexing, categorizing, and cataloging extracted files.
 * This service operates purely on browser extracted file sets to build
 * a high-speed indexed lookup table for media matching.
 */

import { DiscoveredFile } from "../types";

export interface IDiscoveryService {
  /**
   * Scans a dictionary of extracted raw Files and catalogs them into
   * a structured DiscoveredFile inventory.
   */
  discoverFiles(files: Record<string, File>): Promise<DiscoveredFile[]>;

  /**
   * Deterministically classifies a filename based on extension into
   * supported content categories.
   */
  classifyFile(fileName: string, size: number): DiscoveredFile["category"];
}

export class DiscoveryService implements IDiscoveryService {
  public async discoverFiles(files: Record<string, File>): Promise<DiscoveredFile[]> {
    console.log(`[DiscoveryService] Cataloging ${Object.keys(files).length} extracted elements`);
    const inventory: DiscoveredFile[] = [];
    
    for (const [relativePath, file] of Object.entries(files)) {
      try {
        const fileName = file.name || relativePath.split("/").pop() || "";
        const parts = fileName.split(".");
        const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
        const category = this.classifyFile(fileName, file.size);
        
        // Generate a simple, unique ID for this file inside the session
        const id = `${category}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

        inventory.push({
          id,
          name: fileName,
          extension,
          size: file.size,
          category,
          path: relativePath,
          file,
        });
      } catch (err: any) {
        console.warn(`[DiscoveryService] Failed to catalog file ${relativePath}:`, err.message || err);
      }
    }
    
    return inventory;
  }

  public classifyFile(fileName: string, _size: number): DiscoveredFile["category"] {
    const cleanName = fileName.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").toLowerCase().trim();
    const parts = cleanName.split(".");
    const ext = parts.length > 1 ? parts[parts.length - 1].trim() : "";
    const baseName = parts[0] || cleanName;

    // Chat transcripts
    if (ext === "txt" || cleanName.includes("_chat") || cleanName.endsWith("chat.txt")) {
      return "chat";
    }

    // Audio & Voice Notes (including prefix fallback like AUD-2026... or PTT-2026...)
    if (
      ["mp3", "opus", "aac", "ogg", "wav", "m4a", "amr", "flac", "wma"].includes(ext) ||
      baseName.startsWith("aud-") ||
      baseName.startsWith("ptt-") ||
      cleanName.includes("audio") ||
      cleanName.includes("voice")
    ) {
      return "audio";
    }

    // Stickers
    if (cleanName.includes("sticker") || baseName.startsWith("stk-") || ext === "webp") {
      return "sticker";
    }

    // Images & Photos
    if (
      ["jpg", "jpeg", "png", "gif", "heic", "heif", "bmp", "avif", "svg"].includes(ext) ||
      baseName.startsWith("img-") ||
      cleanName.includes("photo") ||
      cleanName.includes("image")
    ) {
      return "image";
    }

    // Videos
    if (
      ["mp4", "3gp", "mov", "mkv", "avi", "webm", "m4v", "wmv"].includes(ext) ||
      baseName.startsWith("vid-") ||
      cleanName.includes("video")
    ) {
      return "video";
    }

    // Documents
    if (
      ["pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt", "zip", "rar", "7z", "csv", "txt", "rtf", "tar", "gz"].includes(ext) ||
      baseName.startsWith("doc-")
    ) {
      return "document";
    }

    return "unknown";
  }
}

export const discoveryServiceInstance = new DiscoveryService();
export default discoveryServiceInstance;
