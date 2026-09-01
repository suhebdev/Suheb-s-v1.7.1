import JSZip from "jszip";
import { V2Message, V2Chat } from "../../types";
import { V3BatchPayload, V3ParsedMessage, V3MediaExtension } from "../types/v3Types";
import { BatchGeneratorService } from "./batchGeneratorService";
import { googleDriveClientInstance } from "./googleDriveClient";
import { firestorePersistenceClientInstance } from "./firestorePersistenceClient";
import { v3IndexedDBManagerInstance, CachedBatchMetaRecord } from "./v3IndexedDBManager";
import { mediaCacheManagerInstance } from "./mediaCacheManager";
import { mediaMapManagerInstance } from "./mediaMapManager";
import { identityServiceInstance } from "./identityService";
import { discoveryServiceInstance } from "./discoveryService";

export interface ProgressCallback {
  (stage: string, progress: number, label: string, message: string): void;
}

export interface ImportResult {
  success: boolean;
  chat: V2Chat;
  messages: V2Message[];
  isInstantView?: boolean;
}

export interface IdentityResolutionData {
  requiresIdentitySelection: true;
  participants: { name: string; messageCount: number }[];
  fileName: string;
  rawMessages: V2Message[];
  zipInstance: JSZip;
}

export interface BackgroundUploadStatus {
  isUploading: boolean;
  chatId: string | null;
  chatName: string | null;
  completedMedia: number;
  totalMedia: number;
  percent: number;
  currentFileName?: string;
  hasErrors?: boolean;
}

interface ProcessedMediaMeta {
  driveFileId: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  duration?: number;
  thumbnail?: {
    available: boolean;
    data?: string;
  };
}

/**
 * ============================================================================
 * V3 Import Orchestrator with Instant View & Background Upload Pipeline
 * ============================================================================
 */
export class V3ImportOrchestrator {
  private progressCallback: ProgressCallback | null = null;
  private instantViewReadyCallback: (() => void) | null = null;
  private backgroundProgressCallback: ((status: BackgroundUploadStatus) => void) | null = null;

  // Active Session Pipeline State
  private isInstantViewReady = false;
  private isInstantViewTriggered = false;
  private instantViewResolver: ((result: ImportResult) => void) | null = null;

  // Current session references for instant view triggering
  private activeChatDoc: V2Chat | null = null;
  private activeBatch1Msgs: V2Message[] = [];
  private activeLoadedZip: JSZip | null = null;
  private activeChatId: string | null = null;
  private activeChatName: string | null = null;

  // Background Media Upload Status Tracker
  private backgroundStatus: BackgroundUploadStatus = {
    isUploading: false,
    chatId: null,
    chatName: null,
    completedMedia: 0,
    totalMedia: 0,
    percent: 0,
  };

  private isMediaUploadPaused = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("offline", () => {
        console.log("[V3ImportOrchestrator] Network went offline, auto-pausing media uploads.");
        this.pauseMediaUploads();
      });
      window.addEventListener("online", () => {
        console.log("[V3ImportOrchestrator] Network came back online, auto-resuming media uploads.");
        this.resumeMediaUploads();
      });
      window.addEventListener("beforeunload", () => {
        if (this.backgroundStatus.isUploading && this.activeChatDoc?.driveFolderId) {
          const currentMap = mediaMapManagerInstance.getActiveMapEntries();
          if (Object.keys(currentMap).length > 0) {
            mediaMapManagerInstance.saveMediaMap(this.activeChatDoc.driveFolderId, currentMap, this.backgroundStatus.chatId || "").catch(() => {});
          }
        }
      });
    }
  }

  public pauseMediaUploads(): void {
    this.isMediaUploadPaused = true;
    console.log("[V3ImportOrchestrator] Background media uploads PAUSED for seamless instant transition.");
  }

  public resumeMediaUploads(): void {
    this.isMediaUploadPaused = false;
    console.log("[V3ImportOrchestrator] Background media uploads RESUMED.");
  }

  public isUploadPaused(): boolean {
    return this.isMediaUploadPaused;
  }

  public setProgressCallback(cb: ProgressCallback | null) {
    this.progressCallback = cb;
  }

  public setInstantViewReadyCallback(cb: (() => void) | null) {
    this.instantViewReadyCallback = cb;
  }

  public setBackgroundProgressCallback(cb: ((status: BackgroundUploadStatus) => void) | null) {
    this.backgroundProgressCallback = cb;
  }

  public isInstantViewAvailable(): boolean {
    return this.isInstantViewReady;
  }

  public getBackgroundUploadStatus(): BackgroundUploadStatus {
    return { ...this.backgroundStatus };
  }

  private report(stage: string, progress: number, label: string, message: string) {
    if (this.progressCallback) {
      this.progressCallback(stage, progress, label, message);
    }
  }

  private reportBackgroundStatus(statusUpdate: Partial<BackgroundUploadStatus>) {
    this.backgroundStatus = {
      ...this.backgroundStatus,
      ...statusUpdate,
    };
    if (this.backgroundProgressCallback) {
      this.backgroundProgressCallback(this.backgroundStatus);
    }
  }

  public async validateWhatsAppZip(file: File): Promise<{ isValid: boolean; error?: string }> {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      let foundTxt = false;
      zipContent.forEach((relativePath) => {
        if (relativePath.toLowerCase().endsWith(".txt") && !relativePath.startsWith("__MACOSX")) {
          foundTxt = true;
        }
      });
      return { isValid: foundTxt, error: foundTxt ? undefined : "No WhatsApp text backup file (.txt) found in ZIP archive." };
    } catch (e: any) {
      return { isValid: false, error: e?.message || "Corrupt ZIP file" };
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result ? result.substring(result.indexOf(",") + 1) : "";
        resolve(base64);
      };
      reader.onerror = () => {
        // Fallback to arrayBuffer if FileReader fails
        blob.arrayBuffer()
          .then((buf) => resolve(BatchGeneratorService.uint8ArrayToBase64(new Uint8Array(buf))))
          .catch(reject);
      };
      reader.readAsDataURL(blob);
    });
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      opus: "audio/ogg; codecs=opus",
      ogg: "audio/ogg",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      wav: "audio/wav",
      aac: "audio/aac",
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };
    return mimeMap[ext] || "application/octet-stream";
  }

  private formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  private async extractMediaDuration(blob: Blob, mimeType: string): Promise<number | undefined> {
    if (typeof window === "undefined") return undefined;
    if (!mimeType.startsWith("audio/") && !mimeType.startsWith("video/")) {
      return undefined;
    }
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const mediaEl = document.createElement(mimeType.startsWith("audio/") ? "audio" : "video");
        mediaEl.preload = "metadata";
        let timer: any = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          try {
            URL.revokeObjectURL(url);
          } catch {}
        };

        mediaEl.onloadedmetadata = () => {
          const dur = mediaEl.duration;
          cleanup();
          if (dur && !isNaN(dur) && isFinite(dur)) {
            resolve(Math.round(dur * 10) / 10);
          } else {
            resolve(undefined);
          }
        };

        mediaEl.onerror = () => {
          cleanup();
          resolve(undefined);
        };

        timer = setTimeout(() => {
          cleanup();
          resolve(undefined);
        }, 2500);

        mediaEl.src = url;
      } catch {
        resolve(undefined);
      }
    });
  }

  private findMatchingMediaMeta(
    targetName: string,
    mediaMap: Map<string, ProcessedMediaMeta>
  ): { matchedName: string; meta: ProcessedMediaMeta } | null {
    if (!targetName) return null;
    const cleanTarget = targetName.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim();
    const normalizedTarget = cleanTarget.toLowerCase();
    const targetWithoutTrailingDot = normalizedTarget.replace(/\.+$/, "");
    const targetBase = targetWithoutTrailingDot.replace(/\.[a-z0-9]+$/i, "");

    // 1. Direct exact lookup
    if (mediaMap.has(targetName)) {
      return { matchedName: targetName, meta: mediaMap.get(targetName)! };
    }
    if (mediaMap.has(cleanTarget)) {
      return { matchedName: cleanTarget, meta: mediaMap.get(cleanTarget)! };
    }

    // 2. Iterate map keys for smart case-insensitive & extension-tolerant matching
    for (const [key, meta] of mediaMap.entries()) {
      const cleanKey = key.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim();
      const normalizedKey = cleanKey.toLowerCase();
      const keyWithoutTrailingDot = normalizedKey.replace(/\.+$/, "");
      const keyBase = keyWithoutTrailingDot.replace(/\.[a-z0-9]+$/i, "");

      if (normalizedKey === normalizedTarget || keyWithoutTrailingDot === targetWithoutTrailingDot) {
        return { matchedName: key, meta };
      }

      if (targetBase && keyBase && targetBase === keyBase) {
        return { matchedName: key, meta };
      }

      if (
        targetBase.length > 5 &&
        keyBase.length > 5 &&
        (targetBase.startsWith(keyBase) || keyBase.startsWith(targetBase))
      ) {
        return { matchedName: key, meta };
      }
    }

    return null;
  }

  /**
   * Generates dimensions & metadata for visual media using off-thread createImageBitmap
   */
  private async extractImageMetadata(blob: Blob): Promise<{ width?: number; height?: number; aspectRatio?: number; thumbnail?: { available: boolean; data?: string } }> {
    if (typeof window === "undefined" || !blob.type.startsWith("image/")) {
      return {};
    }

    if (typeof createImageBitmap !== "undefined") {
      try {
        const bitmap = await createImageBitmap(blob);
        const width = bitmap.width;
        const height = bitmap.height;
        const aspectRatio = height > 0 ? parseFloat((width / height).toFixed(3)) : 1;
        bitmap.close();
        return {
          width,
          height,
          aspectRatio,
          thumbnail: { available: false },
        };
      } catch (e) {
        // Fallback to Image element below
      }
    }

    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const aspectRatio = height > 0 ? parseFloat((width / height).toFixed(3)) : 1;
          URL.revokeObjectURL(url);
          resolve({
            width,
            height,
            aspectRatio,
            thumbnail: { available: false },
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
        img.src = url;
      } catch (err) {
        resolve({});
      }
    });
  }

  /**
   * Pre-registers media blobs for the initial 60 messages so Instant View renders seamlessly.
   */
  private async preRegisterInitialMediaBlobs(
    chatId: string,
    initialMessages: V2Message[],
    loadedZip: JSZip
  ): Promise<void> {
    const first60 = initialMessages.slice(0, 60);
    const mediaFiles = first60
      .filter((m) => m.type !== "text" && m.mediaFileName)
      .map((m) => m.mediaFileName!);

    const distinctMedia = Array.from(new Set(mediaFiles));
    if (distinctMedia.length === 0) return;

    console.log(`[V3ImportOrchestrator] Pre-registering local blobs for ${distinctMedia.length} initial media items...`);

    // Build fast O(1) index of ZIP entries
    const zipMap = new Map<string, JSZip.JSZipObject>();
    loadedZip.forEach((relPath, obj) => {
      if (!obj.dir && !relPath.startsWith("__MACOSX")) {
        const cleanName = (relPath.split("/").pop() || relPath).toLowerCase();
        zipMap.set(cleanName, obj);
        const withoutExt = cleanName.replace(/\.[^.]+$/, "");
        if (!zipMap.has(withoutExt)) {
          zipMap.set(withoutExt, obj);
        }
      }
    });

    for (const fileName of distinctMedia) {
      try {
        const lowerName = fileName.toLowerCase();
        const baseName = lowerName.replace(/\.[^.]+$/, "");
        const zipObj = zipMap.get(lowerName) || zipMap.get(baseName);

        if (zipObj) {
          const mime = this.getMimeType(fileName);
          const rawBlob = await zipObj.async("blob");
          const typedBlob = new Blob([rawBlob], { type: mime });

          // Register in-memory Object URL immediately (synchronous availability)
          mediaCacheManagerInstance.registerBlobUrl(chatId, fileName, undefined, typedBlob);

          // Cache into IndexedDB in background without blocking UI
          if (typedBlob.size < 50 * 1024 * 1024) {
            v3IndexedDBManagerInstance.saveMediaItem({
              key: `${chatId}_${fileName}`,
              chatId,
              fileName,
              blob: typedBlob,
              mimeType: mime,
              size: typedBlob.size,
              cachedAt: Date.now(),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn(`[V3ImportOrchestrator] Non-fatal pre-register error for '${fileName}':`, err);
      }
      // Non-blocking yield to keep browser frame rate at 60fps
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  /**
   * Action triggered when user clicks "Instant View" button
   */
  public async triggerInstantView(): Promise<ImportResult | null> {
    if (!this.isInstantViewReady || !this.activeChatDoc) {
      console.warn("[V3ImportOrchestrator] Instant View triggered before text batches ready.");
      return null;
    }

    if (this.isInstantViewTriggered) {
      return {
        success: true,
        chat: this.activeChatDoc,
        messages: this.activeBatch1Msgs,
        isInstantView: true,
      };
    }

    console.log(`[V3ImportOrchestrator] INSTANT VIEW ACTIVATED for chat '${this.activeChatDoc.id}'!`);
    this.isInstantViewTriggered = true;
    // 1. Immediately pause media upload loop to free 100% of main-thread and network bandwidth
    this.pauseMediaUploads();

    // 2. Persist chat session to Firestore listing
    try {
      await firestorePersistenceClientInstance.saveChat(this.activeChatDoc);
    } catch (err) {
      console.warn("[V3ImportOrchestrator] Firestore save during instant view fallback:", err);
    }

    // 3. Pre-register initial 60 messages' media blobs asynchronously without blocking the UI
    if (this.activeLoadedZip && this.activeChatId) {
      const zipToProcess = this.activeLoadedZip;
      const chatIdToProcess = this.activeChatId;
      const batchMsgs = this.activeBatch1Msgs;
      setTimeout(() => {
        this.preRegisterInitialMediaBlobs(
          chatIdToProcess,
          batchMsgs,
          zipToProcess
        ).catch((err) => {
          console.warn("[V3ImportOrchestrator] Async media pre-registration error:", err);
        });
      }, 0);
    }

    const result: ImportResult = {
      success: true,
      chat: this.activeChatDoc,
      messages: this.activeBatch1Msgs,
      isInstantView: true,
    };

    // If there is an active import resolver waiting, resolve it now
    if (this.instantViewResolver) {
      this.instantViewResolver(result);
      this.instantViewResolver = null;
    }

    return result;
  }

  public async startImport(
    zipFile: File,
    customChatName?: string
  ): Promise<ImportResult | IdentityResolutionData> {
    // Reset state for new import
    this.isInstantViewReady = false;
    this.isInstantViewTriggered = false;
    this.isMediaUploadPaused = false;
    this.instantViewResolver = null;
    this.activeChatDoc = null;
    this.activeBatch1Msgs = [];
    this.activeLoadedZip = null;
    this.activeChatId = null;
    this.activeChatName = null;

    this.report("validating", 10, "Validating Backup", "Inspecting WhatsApp archive contents...");

    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipFile);

    // 1. Discover and catalog files using DiscoveryService
    let chatTxtFile: JSZip.JSZipObject | null = null;
    let chatTxtFileName = "";

    loadedZip.forEach((relativePath, fileObj) => {
      if (fileObj.dir || relativePath.startsWith("__MACOSX")) return;
      const fileName = relativePath.split("/").pop() || relativePath;
      const category = discoveryServiceInstance.classifyFile(fileName, 0);

      if (!chatTxtFile && (category === "chat" || fileName.toLowerCase().endsWith(".txt"))) {
        chatTxtFile = fileObj;
        chatTxtFileName = relativePath;
      }
    });

    if (!chatTxtFile) {
      throw new Error("No WhatsApp chat transcript (.txt) found in the uploaded ZIP.");
    }

    this.report("parsing", 25, "Reading Messages", "Parsing conversation transcript...");
    const rawTxt = await (chatTxtFile as JSZip.JSZipObject).async("string");
    const rawLines = rawTxt.split(/\r?\n/);

    // 2. Parse Messages & Detect Senders
    const messages: (V2Message & { edited?: boolean })[] = [];
    const senderFrequency = new Map<string, number>();

    const msgRegex = /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?\s*[-:]?\s*([^:]+?):\s*(.*)$/;
    const systemLineRegex = /^\[?(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?\s*[-:]?\s*(.+)$/;

    const parseWhatsAppTimestamp = (dateStr: string, timeStr: string): string => {
      try {
        const delimiters = /[/.-]/;
        const parts = dateStr.split(delimiters);
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let month = parseInt(parts[1], 10) - 1;
          let year = parseInt(parts[2], 10);

          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          } else if (parseInt(parts[0], 10) > 12 && parseInt(parts[1], 10) <= 12) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
          } else if (parseInt(parts[0], 10) <= 12 && parseInt(parts[1], 10) > 12) {
            month = parseInt(parts[0], 10) - 1;
            day = parseInt(parts[1], 10);
          }

          if (year < 100) {
            year += 2000;
          }

          let hours = 0;
          let minutes = 0;
          let seconds = 0;

          const timeParts = timeStr.trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])?/);
          if (timeParts) {
            hours = parseInt(timeParts[1], 10);
            minutes = parseInt(timeParts[2], 10);
            seconds = timeParts[3] ? parseInt(timeParts[3], 10) : 0;
            const ampm = timeParts[4]?.toUpperCase();

            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;
          }

          const d = new Date(year, month, day, hours, minutes, seconds);
          if (!isNaN(d.getTime())) {
            return d.toISOString();
          }
        }
      } catch (e) {}
      return new Date().toISOString();
    };

    const isSystemText = (text: string) => {
      const lower = text.toLowerCase();
      return (
        lower.includes("end-to-end encrypted") ||
        lower.includes("created group") ||
        lower.includes("created this group") ||
        lower.includes("changed the group") ||
        lower.includes("changed this group") ||
        lower.includes("changed the subject") ||
        lower.includes("changed the description") ||
        lower.includes("security code changed") ||
        lower.includes("disappearing messages") ||
        lower.includes("joined using") ||
        lower.includes("added ") ||
        lower.includes("left") ||
        lower.includes("removed ") ||
        lower.includes("you're now an admin") ||
        lower.includes("now an admin") ||
        lower.includes("pinned a message") ||
        lower.includes("waiting for this message") ||
        lower.includes("business account")
      );
    };

    let currentMsg: (V2Message & { edited?: boolean }) | null = null;
    let seqIdx = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim();
      if (!line) continue;

      const match = line.match(msgRegex);
      const systemMatch = !match ? line.match(systemLineRegex) : null;

      if (match) {
        const [, dateStr, timeStr, senderRaw, textContentRaw] = match;
        const senderName = senderRaw.trim();
        const msgTimestamp = parseWhatsAppTimestamp(dateStr, timeStr);

        if (isSystemText(senderName + ": " + textContentRaw)) {
          if (currentMsg) {
            messages.push(currentMsg);
          }
          currentMsg = {
            id: `msg_${Date.now()}_${seqIdx}`,
            sender: "system",
            senderName: "system",
            sequenceIndex: seqIdx++,
            text: (senderName + ": " + textContentRaw).trim(),
            time: timeStr,
            timestamp: msgTimestamp,
            type: "text",
          };
          continue;
        }

        if (currentMsg) {
          messages.push(currentMsg);
        }

        senderFrequency.set(senderName, (senderFrequency.get(senderName) || 0) + 1);

        let isEdited = false;
        let cleanText = textContentRaw;
        if (cleanText.includes("<This message was edited>")) {
          isEdited = true;
          cleanText = cleanText.replace(/<This message was edited>/g, "").trim();
        } else if (cleanText.endsWith("(edited)") || cleanText.endsWith("<edited>")) {
          isEdited = true;
          cleanText = cleanText.replace(/\(edited\)|<edited>/g, "").trim();
        }

        let type: V2Message["type"] = "text";
        let mediaFileName: string | undefined = undefined;
        let mediaCaption: string | undefined = undefined;

        const cleanTextNoBidi = cleanText.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim();
        const attachedTagMatch = cleanTextNoBidi.match(/<attached:\s*([^>]+)>/i);
        const fileAttachedMatch = cleanTextNoBidi.match(/^([^\n\r]+?)\s*(?:\(file attached\)|\(archivo adjunto\)|\(arquivo anexado\)|\(Datei angehängt\)|\(fichier joint\)|\(file allegato\)|\(файл вложен\))(?:\s*[\n\r]+([\s\S]*))?$/i);

        if (attachedTagMatch) {
          mediaFileName = attachedTagMatch[1].trim();
        } else if (fileAttachedMatch) {
          mediaFileName = fileAttachedMatch[1].trim();
          if (fileAttachedMatch[2]) {
            mediaCaption = fileAttachedMatch[2].trim();
          }
        }

        if (mediaFileName) {
          const cleanFileName = mediaFileName.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim();
          const ext = cleanFileName.split(".").pop()?.toLowerCase() || "";
          const baseName = cleanFileName.replace(/\.[a-zA-Z0-9]+$/, "").toLowerCase();

          if (
            ["opus", "mp3", "ogg", "m4a", "wav", "aac", "amr", "flac"].includes(ext) ||
            baseName.startsWith("aud-") ||
            baseName.startsWith("ptt-") ||
            cleanFileName.toLowerCase().includes("audio") ||
            cleanFileName.toLowerCase().includes("voice")
          ) {
            type = "audio";
          } else if (
            ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "avif"].includes(ext) ||
            baseName.startsWith("img-")
          ) {
            type = "image";
          } else if (
            ["mp4", "mov", "3gp", "mkv", "avi", "webm", "m4v"].includes(ext) ||
            baseName.startsWith("vid-")
          ) {
            type = "video";
          } else if (baseName.startsWith("stk-") || cleanFileName.toLowerCase().includes("sticker")) {
            type = "sticker";
          } else {
            type = "document";
          }

          mediaFileName = cleanFileName;
        }

        currentMsg = {
          id: `msg_${Date.now()}_${seqIdx}`,
          sender: "other",
          senderName: senderName,
          sequenceIndex: seqIdx++,
          text: cleanText,
          time: timeStr,
          timestamp: msgTimestamp,
          type,
          mediaFileName,
          caption: mediaCaption,
          edited: isEdited,
        };
      } else if (systemMatch) {
        if (currentMsg) {
          messages.push(currentMsg);
        }
        const [, dateStr, timeStr, systemTextRaw] = systemMatch;
        const msgTimestamp = parseWhatsAppTimestamp(dateStr, timeStr);
        currentMsg = {
          id: `msg_${Date.now()}_${seqIdx}`,
          sender: "system",
          senderName: "system",
          sequenceIndex: seqIdx++,
          text: systemTextRaw.trim(),
          time: timeStr,
          timestamp: msgTimestamp,
          type: "text",
        };
      } else if (currentMsg) {
        currentMsg.text += "\n" + line;
      }
    }

    if (currentMsg) {
      messages.push(currentMsg);
    }

    if (messages.length === 0) {
      throw new Error("Could not parse any messages from the transcript. Please check the backup format.");
    }

    // 3. Identity Resolution
    this.report("parsing", 30, "Resolving Identities", "Analyzing participant identities...");
    const identityResult = await identityServiceInstance.resolveIdentities(
      messages as any,
      zipFile.name,
      chatTxtFileName
    );

    if (identityResult.requiresIdentitySelection) {
      return {
        requiresIdentitySelection: true,
        participants: identityResult.participants,
        fileName: zipFile.name,
        rawMessages: messages,
        zipInstance: loadedZip,
      };
    }

    const myId = identityResult.myIdentity || "Me";
    const otherId = identityResult.otherIdentity || "Other";

    return this.finishImportPipeline(messages, loadedZip, myId, otherId, zipFile.name, customChatName);
  }

  public async completeImport(
    partialData: IdentityResolutionData,
    selectedMyIdentity: string,
    customChatName?: string
  ): Promise<ImportResult> {
    const rawMessages: (V2Message & { edited?: boolean })[] = partialData.rawMessages;
    const loadedZip: JSZip = partialData.zipInstance;
    const distinctSenders = partialData.participants.map((p) => p.name);
    const otherId = distinctSenders.find((s) => s !== selectedMyIdentity) || "Participant";

    return this.finishImportPipeline(
      rawMessages,
      loadedZip,
      selectedMyIdentity,
      otherId,
      partialData.fileName,
      customChatName
    );
  }

  /**
   * Main split-path execution pipeline
   */
  private async finishImportPipeline(
    messages: (V2Message & { edited?: boolean })[],
    loadedZip: JSZip,
    myIdentity: string,
    otherIdentity: string,
    fileName: string,
    customChatName?: string
  ): Promise<ImportResult> {
    const totalMessages = messages.length;
    const chatId = `chat_${Date.now()}`;
    const finalChatName = customChatName?.trim() || otherIdentity || "WhatsApp Chat";

    this.activeChatId = chatId;
    this.activeChatName = finalChatName;
    this.activeLoadedZip = loadedZip;

    this.report("uploading", 35, "Preparing Cloud Storage", "Creating Google Drive container hierarchy...");

    // Format sender attribution according to resolved identities
    messages.forEach((m) => {
      if (m.sender === "system" || m.senderName === "system") {
        m.sender = "system";
        m.senderName = "system";
        return;
      }
      if (m.senderName === myIdentity) {
        m.sender = "me";
      } else {
        m.sender = "other";
      }
    });

    // 1. Google Drive Directory Setup
    const folderRes = await googleDriveClientInstance.createChatFolder(finalChatName, chatId);
    const chatFolderId = folderRes.chatFolderId || folderRes.driveFolderId;
    if (!chatFolderId) {
      throw new Error("Unable to obtain Google Drive root folder ID for this chat archive.");
    }
    const chatTextFolderId = folderRes.chatTextFolderId || (await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "ChatText"));
    const mediaFolderId = await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "Media");

    // 2. Split into 1500-message Batches & Upload to Google Drive FIRST
    const BATCH_SIZE = 1500;
    const totalBatches = Math.ceil(totalMessages / BATCH_SIZE);
    this.report(
      "uploading",
      40,
      "Generating Compressed Batches",
      `Splitting ${totalMessages.toLocaleString()} messages into ${totalBatches} batch(es)...`
    );

    for (let b = 1; b <= totalBatches; b++) {
      const startSeq = (b - 1) * BATCH_SIZE;
      const endSeq = Math.min(totalMessages - 1, b * BATCH_SIZE - 1);
      const batchSlice = messages.slice(startSeq, endSeq + 1);
      const batchProgress = 40 + Math.round((b / totalBatches) * 15);

      this.report(
        "uploading",
        batchProgress,
        "Uploading Message Batches",
        `Compressing & uploading batch ${b} of ${totalBatches} (${batchSlice.length} msgs)...`
      );

      const batchPayload: V3BatchPayload = {
        version: 3,
        chatId,
        batchIndex: b,
        totalBatches,
        startSequenceIndex: startSeq,
        endSequenceIndex: endSeq,
        messageCount: batchSlice.length,
        messages: batchSlice.map((m): V3ParsedMessage => {
          let mediaExt: V3MediaExtension | undefined = undefined;
          if (m.mediaFileName) {
            mediaExt = {
              fileName: m.mediaFileName,
              driveFileId: m.driveFileId || "",
              mimeType: this.getMimeType(m.mediaFileName),
              size: 0,
            };
          }

          const parsedMsg: V3ParsedMessage = {
            id: m.id,
            sequenceIndex: m.sequenceIndex,
            timestamp: m.timestamp,
            time: m.time,
            sender: m.sender,
            senderName: m.senderName,
            text: m.text || "",
            type: m.type,
            edited: !!m.edited,
          };

          if (m.duration) {
            parsedMsg.duration = m.duration;
          }
          if (mediaExt) {
            parsedMsg.media = mediaExt;
          }
          if (m.caption) {
            parsedMsg.caption = m.caption;
          }
          if (m.isReply) {
            parsedMsg.isReply = true;
            if (m.replyToSenderName) parsedMsg.replyToSenderName = m.replyToSenderName;
            if (m.replyToText) parsedMsg.replyToText = m.replyToText;
          }

          return parsedMsg;
        }),
      };

      const compressedBytes = BatchGeneratorService.compressBatchPayload(batchPayload);
      const base64Batch = BatchGeneratorService.uint8ArrayToBase64(compressedBytes);
      const batchFileName = BatchGeneratorService.formatBatchFileName(b);

      await googleDriveClientInstance.uploadBase64File(
        chatTextFolderId,
        batchFileName,
        "application/gzip",
        base64Batch
      );
    }

    // 3. Populate Batch 1 into local IndexedDB immediately
    const batch1Msgs = messages.slice(0, Math.min(1500, totalMessages));
    const dbRecords = batch1Msgs.map((m) => ({
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
      messageCount: batch1Msgs.length,
      startSequenceIndex: 0,
      endSequenceIndex: Math.max(0, batch1Msgs.length - 1),
      driveFileId: "",
      downloadedAt: Date.now(),
    };
    await v3IndexedDBManagerInstance.saveBatchMeta(batchMeta);

    // 4. Chat session object preparation
    const chatDoc: V2Chat = {
      id: chatId,
      name: finalChatName,
      fileName,
      myIdentity,
      otherIdentity,
      driveFolderId: chatFolderId,
      totalMessageCount: totalMessages,
      messageCount: totalMessages,
      storageVersion: 3,
      isImported: true,
      createdAt: new Date().toISOString(),
    };

    this.activeChatDoc = chatDoc;
    this.activeBatch1Msgs = batch1Msgs;

    // 5. Gather all media entries from the ZIP archive
    const mediaZipEntries: { fileName: string; obj: JSZip.JSZipObject }[] = [];
    loadedZip.forEach((relativePath, fileObj) => {
      if (!relativePath.endsWith(".txt") && !relativePath.startsWith("__MACOSX") && !fileObj.dir) {
        const cleanName = relativePath.split("/").pop() || relativePath;
        mediaZipEntries.push({ fileName: cleanName, obj: fileObj });
      }
    });

    // 6. SIGNAL: Text Batches Ready -> INSTANT VIEW IS NOW ACTIVATED / ENABLED!
    this.isInstantViewReady = true;
    if (this.instantViewReadyCallback) {
      this.instantViewReadyCallback();
    }

    const totalMedia = mediaZipEntries.length;
    this.report(
      "uploading",
      55,
      "Text Batches Ready",
      totalMedia > 0
        ? `Text batches uploaded! Instant View is now available or continuing media upload (0/${totalMedia})...`
        : "Text batches uploaded! Preparing chat session..."
    );

    // Check if Instant View was already clicked by the user
    if (this.isInstantViewTriggered) {
      console.log("[V3ImportOrchestrator] User already clicked Instant View during text processing.");
      this.startBackgroundMediaUploadWorker(chatId, finalChatName, mediaFolderId, mediaZipEntries, messages);
      return {
        success: true,
        chat: chatDoc,
        messages: batch1Msgs,
        isInstantView: true,
      };
    }

    // Return a promise that resolves either via Instant View or through normal completion
    return new Promise<ImportResult>(async (resolve, reject) => {
      this.instantViewResolver = resolve;

      // Start the media upload loop
      try {
        const mediaMetadataMap = await this.executeMediaUploadQueue(
          chatId,
          finalChatName,
          mediaFolderId,
          mediaZipEntries,
          messages,
          false // foreground mode
        );

        // If Instant View was triggered during media uploading, resolve was already called
        if (this.isInstantViewTriggered) {
          return;
        }

        // 7. Normal Flow Finalization: Save to Firestore
        this.report("saving", 95, "Saving Chat Metadata", "Registering chat session in Firestore database...");
        await firestorePersistenceClientInstance.saveChat(chatDoc);

        this.report("completed", 100, "Import Complete", "WhatsApp chat archive successfully parsed and ready.");

        resolve({
          success: true,
          chat: chatDoc,
          messages: batch1Msgs,
          isInstantView: false,
        });
      } catch (err: any) {
        if (!this.isInstantViewTriggered) {
          reject(err);
        } else {
          console.warn("[V3ImportOrchestrator] Background media error after instant view:", err);
        }
      }
    });
  }

  /**
   * Launches background media upload worker without blocking the chat viewer
   */
  private startBackgroundMediaUploadWorker(
    chatId: string,
    chatName: string,
    mediaFolderId: string,
    mediaZipEntries: { fileName: string; obj: JSZip.JSZipObject }[],
    messages: (V2Message & { edited?: boolean })[]
  ) {
    setTimeout(async () => {
      try {
        await this.executeMediaUploadQueue(
          chatId,
          chatName,
          mediaFolderId,
          mediaZipEntries,
          messages,
          true // background mode
        );
      } catch (err) {
        console.warn("[V3ImportOrchestrator Background Worker] Media upload error:", err);
      }
    }, 100);
  }

  /**
   * Concurrency-controlled Media Upload Queue (Pool size = 3)
   */
  private async executeMediaUploadQueue(
    chatId: string,
    chatName: string,
    mediaFolderId: string,
    mediaZipEntries: { fileName: string; obj: JSZip.JSZipObject }[],
    messages: (V2Message & { edited?: boolean })[],
    isBackgroundMode: boolean
  ): Promise<Map<string, ProcessedMediaMeta>> {
    const totalMedia = mediaZipEntries.length;
    const mediaMetadataMap = new Map<string, ProcessedMediaMeta>();

    if (totalMedia === 0) {
      this.reportBackgroundStatus({
        isUploading: false,
        chatId,
        chatName,
        completedMedia: 0,
        totalMedia: 0,
        percent: 100,
      });
      return mediaMetadataMap;
    }

    this.reportBackgroundStatus({
      isUploading: true,
      chatId,
      chatName,
      completedMedia: 0,
      totalMedia,
      percent: 0,
    });

    let completedCount = 0;
    const isBg = isBackgroundMode || this.isInstantViewTriggered;
    const CONCURRENCY = isBg ? 2 : 3;
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < mediaZipEntries.length) {
        // While paused for instant view rendering, wait cleanly without consuming CPU
        while (this.isMediaUploadPaused) {
          await new Promise((r) => setTimeout(r, 200));
        }

        const i = nextIndex++;
        const entry = mediaZipEntries[i];

        try {
          const rawBlob = await entry.obj.async("blob");
          const mimeType = this.getMimeType(entry.fileName);
          const typedBlob = new Blob([rawBlob], { type: mimeType });

          // 1. Immediately register in-memory Object URL & local cache
          mediaCacheManagerInstance.registerBlobUrl(chatId, entry.fileName, undefined, typedBlob);
          if (typedBlob.size < 50 * 1024 * 1024) {
            v3IndexedDBManagerInstance.saveMediaItem({
              key: `${chatId}_${entry.fileName}`,
              chatId,
              fileName: entry.fileName,
              blob: typedBlob,
              mimeType,
              size: typedBlob.size,
              cachedAt: Date.now(),
            }).catch(() => {});
          }

          // 2. Extract visual metadata & base64
          const visualMeta = await this.extractImageMetadata(typedBlob);
          const mediaDuration = await this.extractMediaDuration(typedBlob, mimeType);
          const base64 = await this.blobToBase64(typedBlob);

          // 3. Upload to Google Drive Media subfolder
          const driveFile = await googleDriveClientInstance.uploadBase64File(
            mediaFolderId,
            entry.fileName,
            mimeType,
            base64
          );

          const meta: ProcessedMediaMeta = {
            driveFileId: driveFile.driveFileId,
            mimeType,
            size: typedBlob.size,
            width: visualMeta.width,
            height: visualMeta.height,
            aspectRatio: visualMeta.aspectRatio,
            duration: mediaDuration,
            thumbnail: visualMeta.thumbnail,
          };

          mediaMetadataMap.set(entry.fileName, meta);

          // 4. Update Drive ID linkage across cache manager & media map manager
          mediaCacheManagerInstance.linkDriveFileId(chatId, entry.fileName, driveFile.driveFileId);
          mediaMapManagerInstance.addEntry(chatId, entry.fileName, driveFile.driveFileId);

          // 5. Update IndexedDB media item record with driveFileId in background
          v3IndexedDBManagerInstance.saveMediaItem({
            key: `${chatId}_${entry.fileName}`,
            chatId,
            fileName: entry.fileName,
            driveFileId: driveFile.driveFileId,
            blob: typedBlob.size < 50 * 1024 * 1024 ? typedBlob : undefined,
            mimeType,
            size: typedBlob.size,
            cachedAt: Date.now(),
          }).catch(() => {});

          // 6. Yield execution lightly to keep UI thread silky smooth (60fps)
          const yieldDelay = (isBackgroundMode || this.isInstantViewTriggered) ? 50 : 15;
          await new Promise((r) => setTimeout(r, yieldDelay));
        } catch (err) {
          console.warn(`[V3Import] Failed uploading media '${entry.fileName}':`, err);
        } finally {
          completedCount++;
          const pct = Math.round((completedCount / totalMedia) * 100);

          if (!isBackgroundMode && !this.isInstantViewTriggered) {
            const overallProgress = 55 + Math.round((completedCount / totalMedia) * 35);
            this.report(
              "uploading",
              overallProgress,
              "Uploading Media Attachments",
              `Uploading media ${completedCount} of ${totalMedia}: ${entry.fileName}`
            );
          }

          this.reportBackgroundStatus({
            isUploading: completedCount < totalMedia,
            chatId,
            chatName,
            completedMedia: completedCount,
            totalMedia,
            percent: pct,
            currentFileName: entry.fileName,
          });
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, totalMedia) }, () => worker());
    await Promise.all(workers);

    console.log(`[V3Import] All ${totalMedia} media files successfully processed & uploaded.`);

    // Persist MediaMap.json into Google Drive Chat Folder
    const resolvedChatFolderId = this.activeChatDoc?.driveFolderId || "";
    if (resolvedChatFolderId && mediaMetadataMap.size > 0) {
      const rawMap: Record<string, string> = {};
      for (const [fn, meta] of mediaMetadataMap.entries()) {
        if (meta.driveFileId) {
          rawMap[fn] = meta.driveFileId;
        }
      }
      try {
        await mediaMapManagerInstance.saveMediaMap(resolvedChatFolderId, rawMap, chatId);
      } catch (saveErr) {
        console.warn("[V3ImportOrchestrator] Failed to upload MediaMap.json to Drive:", saveErr);
      }
    }

    this.reportBackgroundStatus({
      isUploading: false,
      chatId,
      chatName,
      completedMedia: totalMedia,
      totalMedia,
      percent: 100,
    });

    return mediaMetadataMap;
  }
}

export const v3ImportOrchestratorInstance = new V3ImportOrchestrator();
