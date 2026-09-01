import React, { useState, useEffect, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { createPortal } from "react-dom";
import { 
  MessageSquare, Plus, Upload, X, Check, ArrowLeft, Send, Shield, 
  User, Image, Film, Volume2, Calendar, FileArchive, Globe, Smartphone,
  Clock, Lock, LogOut, CheckCircle2, ChevronRight, MessageCircle,
  Maximize2, Minimize2, Trash2, AlertTriangle, Loader2, ArrowDown,
  Cloud, CloudLightning, CloudUpload, FolderOpen, Link2Off, Settings, Sliders,
  Search, Smile, Paperclip, Play, Pause, Mic, Zap, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { v3ImportOrchestratorInstance } from "../v3/services/v3ImportOrchestrator";
import { firestorePersistenceClientInstance } from "../v3/services/firestorePersistenceClient";
import { v3ChatViewerLoaderInstance, ChatOpenProgress } from "../v3/services/v3ChatViewerLoader";
import { v3IndexedDBManagerInstance } from "../v3/services/v3IndexedDBManager";
import { v3ContinuousScrollManagerInstance } from "../v3/services/v3ContinuousScrollManager";
import { mediaCacheManagerInstance } from "../v3/services/mediaCacheManager";
import { mediaMapManagerInstance } from "../v3/services/mediaMapManager";
import { googleDriveClientInstance } from "../v3/services/googleDriveClient";
import { isFirebaseConfigured, getFirebaseAuth } from "../lib/firebase";
import { getApiUrl } from "../lib/api";
// In-memory cache for direct authenticated media loading
const authenticatedMediaCache = new Map<string, string>();
const authenticatedMediaPromises = new Map<string, Promise<string>>();

import { WHATSAPP_WALLPAPER_DATA_URI } from "../assets/wallpaperDataUri";

interface ToolsPageProps {
  googleUser: any;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  addToast: (message: string, type?: "success" | "error" | "instruction" | "alert") => void;
}

// Interface for a single parsed message
interface ParsedMessage {
  id: string;
  sender: "me" | "other" | "system";
  senderName: string;
  text: string;
  time: string;
  type: "text" | "image" | "video" | "audio" | "document" | "sticker";
  isMedia?: boolean;
  mediaFileName?: string;
  mediaUrl?: string;
  caption?: string;
  duration?: string;
  driveFileId?: string;
  timestamp?: string;
  sequenceIndex?: number;

  // WhatsApp Export Reply & View-Once enhancements (SAD Section 13)
  replyToMessageId?: string;
  replyToSender?: "me" | "other" | "system" | string;
  replyToSenderName?: string;
  replyToText?: string;
  replyToType?: string;
  isReply?: boolean;
  isViewOnce?: boolean;
  viewOnceStatus?: "opened" | "unopened" | "unknown";
  viewOnceMediaType?: "image" | "video" | "audio" | "document" | "unknown";
  isMediaOmitted?: boolean;
}

// Interface for a Chat Session
interface ChatSession {
  id: string;
  name: string;
  date: string;
  fileName: string;
  myIdentity: string;
  otherIdentity: string;
  lastMessage: string;
  messages?: ParsedMessage[];
  extractedMediaMap?: Record<string, string>;
  mediaLogSelected?: { name: string; size: number }[];
  mediaLogSkipped?: { name: string; size: number }[];
  isProcessing?: boolean;
  progress?: number;
  createdTime?: string;
  createdAt?: string;
  driveFolderId?: string;
  driveSavedAt?: string;
  uploadedFiles?: any[];
  totalMessageCount?: number;
  messageCount?: number;
}

// Short month and day names for compact, responsive badge layouts
const SHORT_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Format WhatsApp raw date string (e.g. "24/06/2026", "2026-08-23", etc.) into a separator format (e.g. "24 June 2026")
function formatSeparatorDate(rawDateStr: string | null): string {
  if (!rawDateStr) return "Chat History";
  
  // Try ISO date string first
  if (rawDateStr.includes("T") || rawDateStr.includes("-")) {
    const d = new Date(rawDateStr);
    if (!isNaN(d.getTime())) {
      const today = new Date();
      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      ) {
        return "Today";
      }

      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const dayStr = String(d.getDate()).padStart(2, "0");
      const monthName = months[d.getMonth()] || "Month";
      return `${dayStr} ${monthName} ${d.getFullYear()}`;
    }
  }

  const delimiters = /[/.-]/;
  const parts = rawDateStr.split(delimiters);
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

    try {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        if (
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        ) {
          return "Today";
        }

        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const dayStr = String(day).padStart(2, "0");
        const monthName = months[month] || "Month";
        return `${dayStr} ${monthName} ${year}`;
      }
    } catch (e) {
      // fallback
    }
  }
  return rawDateStr;
}

// Generate the standard "Created: 26 Aug 2026, Wed, 9:22 AM" creation label with short month & short day
function getFormattedCreationTime(dateInput?: Date | string): string {
  const now = dateInput ? new Date(dateInput) : new Date();
  const validDate = !isNaN(now.getTime()) ? now : new Date();

  const dayName = SHORT_DAY_NAMES[validDate.getDay()];
  const dateNum = validDate.getDate();
  const monthName = SHORT_MONTH_NAMES[validDate.getMonth()];
  const year = validDate.getFullYear();

  let hours = validDate.getHours();
  const minutes = String(validDate.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `Created: ${dateNum} ${monthName} ${year}, ${dayName}, ${hours}:${minutes} ${ampm}`;
}

// Robust helper to extract { dateBadge: "Created: 26 Aug 2026", timeBadge: "Wed, 9:22 AM" }
function formatChatCardDateTime(chat: { createdTime?: string; date?: string; createdAt?: string }): {
  dateBadge: string;
  timeBadge: string;
} {
  let dateObj: Date | null = null;

  // 1. Direct createdAt (ISO string or timestamp)
  if (chat.createdAt) {
    const d = new Date(chat.createdAt);
    if (!isNaN(d.getTime())) {
      dateObj = d;
    }
  }

  // 2. Parse from createdTime or date string if dateObj not already resolved
  const rawCreated = chat.createdTime || chat.date || "";

  if (!dateObj && rawCreated) {
    const clean = rawCreated.replace(/^Created:\s*/i, "").trim();

    // Check if clean is a parseable date string directly
    const directParsed = new Date(clean);
    if (!isNaN(directParsed.getTime()) && !clean.match(/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+\d{1,2}:\d{1,2}/)) {
      dateObj = directParsed;
    } else {
      // Regex parsing for text month (e.g., "26 August 2026, Wednesday, 9:22 AM" or "26 Aug 2026, Wed, 9:22 AM")
      const textMonthMatch = clean.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
      const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);

      if (textMonthMatch) {
        const day = parseInt(textMonthMatch[1], 10);
        const monthName = textMonthMatch[2].toLowerCase();
        const year = parseInt(textMonthMatch[3], 10);
        const monthIndex = [
          "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"
        ].findIndex((m) => monthName.startsWith(m));

        if (monthIndex !== -1) {
          let hours = 12;
          let minutes = 0;
          if (timeMatch) {
            hours = parseInt(timeMatch[1], 10);
            minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3]?.toUpperCase();
            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;
          }
          const d = new Date(year, monthIndex, day, hours, minutes);
          if (!isNaN(d.getTime())) {
            dateObj = d;
          }
        }
      } else {
        // Numeric date format like "25/08/2026, 17:21:55" or "25/08/2026 17:21:55"
        const numDateMatch = clean.match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
        if (numDateMatch) {
          const p1 = parseInt(numDateMatch[1], 10);
          const p2 = parseInt(numDateMatch[2], 10);
          const p3 = parseInt(numDateMatch[3], 10);

          let day = p1;
          let month = p2 - 1;
          let year = p3;

          if (numDateMatch[1].length === 4) {
            year = p1;
            month = p2 - 1;
            day = p3;
          } else if (p1 <= 12 && p2 > 12) {
            month = p1 - 1;
            day = p2;
          } else if (p1 > 12 && p2 <= 12) {
            day = p1;
            month = p2 - 1;
          }
          if (year < 100) year += 2000;

          let hours = 12;
          let minutes = 0;
          if (timeMatch) {
            hours = parseInt(timeMatch[1], 10);
            minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3]?.toUpperCase();
            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;
          }
          const d = new Date(year, month, day, hours, minutes);
          if (!isNaN(d.getTime())) {
            dateObj = d;
          }
        }
      }
    }
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    const dayNum = dateObj.getDate();
    const monthStr = SHORT_MONTH_NAMES[dateObj.getMonth()] || "Aug";
    const year = dateObj.getFullYear();
    const dayOfWeek = SHORT_DAY_NAMES[dateObj.getDay()] || "Wed";

    let hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;

    return {
      dateBadge: `Created: ${dayNum} ${monthStr} ${year}`,
      timeBadge: `${dayOfWeek}, ${hours}:${minutes} ${ampm}`
    };
  }

  return {
    dateBadge: "Created: 26 Aug 2026",
    timeBadge: "Wed, 9:22 AM"
  };
}

interface BeautifulEmojiTextProps {
  text: string;
}

const BeautifulEmojiText: React.FC<BeautifulEmojiTextProps> = React.memo(({ text }) => {
  if (!text) return null;

  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF])/gu;
  const parts = text.split(emojiRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        
        const isPartEmoji = /(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|[\u2600-\u27BF])/gu.test(part);
        
        if (isPartEmoji) {
          const codePoints: string[] = [];
          for (let i = 0; i < part.length; i++) {
            const codePoint = part.codePointAt(i);
            if (codePoint !== undefined) {
              codePoints.push(codePoint.toString(16));
              if (codePoint > 0xffff) {
                i++;
              }
            }
          }
          const cpClean = codePoints.filter(cp => cp !== "fe0f").join("-");
          
          return (
            <img
              key={index}
              src={`https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/svg/${cpClean}.svg`}
              alt={part}
              draggable={false}
              referrerPolicy="no-referrer"
              className="inline-block w-[1.2em] h-[1.2em] align-text-bottom mx-[1.5px] select-all shrink-0"
              onError={(e) => {
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const span = document.createElement("span");
                  span.innerText = part;
                  e.currentTarget.replaceWith(span);
                }
              }}
            />
          );
        }
        // This is plain text. Let's make any URLs clickable inside it!
        const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
        const subParts = part.split(urlRegex);
        return (
          <span key={index}>
            {subParts.map((subPart, subIndex) => {
              if (subPart.match(/^https?:\/\//i)) {
                return (
                  <a
                    key={subIndex}
                    href={subPart}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold break-all underline decoration-sky-400 decoration-2 select-text cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {subPart}
                  </a>
                );
              }
              return <span key={subIndex}>{subPart}</span>;
            })}
          </span>
        );
      })}
    </>
  );
});

const WhatsAppBackgroundTexture: React.FC = () => {
  return (
    <div 
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{
        backgroundImage: `url("${WHATSAPP_WALLPAPER_DATA_URI}")`,
        backgroundRepeat: "repeat",
        backgroundPosition: "top left",
        backgroundSize: "412px 412px",
        opacity: 0.85,
        mixBlendMode: "multiply",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "none"
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
};

// Global Cache for Google Drive folder media items
const driveFolderMediaCache = new Map<string, Array<{ id: string; name: string; mimeType: string; size?: number }>>();
const driveFolderMediaPromises = new Map<string, Promise<Array<{ id: string; name: string; mimeType: string; size?: number }>>>();

export async function getChatDriveMediaFiles(chatFolderId: string): Promise<Array<{ id: string; name: string; mimeType: string; size?: number }>> {
  if (!chatFolderId) return [];
  if (driveFolderMediaCache.has(chatFolderId)) {
    return driveFolderMediaCache.get(chatFolderId)!;
  }
  if (driveFolderMediaPromises.has(chatFolderId)) {
    return driveFolderMediaPromises.get(chatFolderId)!;
  }

  const promise = (async () => {
    try {
      let mediaFiles: Array<{ id: string; name: string; mimeType: string; size?: number }> = [];
      // 1. Check 'media' subfolder in the chat's Drive folder
      try {
        const mediaSubfolderId = await googleDriveClientInstance.getOrCreateSubfolder(chatFolderId, "media");
        if (mediaSubfolderId) {
          const subFiles = await googleDriveClientInstance.listFolderFiles(mediaSubfolderId);
          mediaFiles.push(...subFiles);
        }
      } catch (err) {
        console.warn("[DriveMedia] Notice: 'media' subfolder listing:", err);
      }

      // 2. Also list direct files in chatFolderId
      try {
        const directFiles = await googleDriveClientInstance.listFolderFiles(chatFolderId);
        const nonFolderFiles = directFiles.filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
        const existingIds = new Set(mediaFiles.map((f) => f.id));
        for (const df of nonFolderFiles) {
          if (!existingIds.has(df.id)) {
            mediaFiles.push(df);
          }
        }
      } catch (e) {}

      driveFolderMediaCache.set(chatFolderId, mediaFiles);
      return mediaFiles;
    } catch (err) {
      console.error("[DriveMedia] Error fetching media files for chat folder:", chatFolderId, err);
      return [];
    } finally {
      driveFolderMediaPromises.delete(chatFolderId);
    }
  })();

  driveFolderMediaPromises.set(chatFolderId, promise);
  return promise;
}

export function findMatchingDriveFile(
  fileName: string,
  files: Array<{ id: string; name: string; mimeType?: string }>
): { id: string; name: string; mimeType?: string } | null {
  if (!fileName || !files || files.length === 0) return null;
  const cleanTarget = fileName
    .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
    .replace(/\.+$/, "")
    .trim()
    .toLowerCase();
  const targetBase = cleanTarget.replace(/\.[a-z0-9]+$/i, "").trim();

  // 1. Exact match
  const exact = files.find((f) => {
    const fn = f.name
      .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
      .replace(/\.+$/, "")
      .trim()
      .toLowerCase();
    return fn === cleanTarget;
  });
  if (exact) return exact;

  // 2. Base name match (e.g. AUD-20260503-WA0002 matches AUD-20260503-WA0002.opus)
  const baseMatch = files.find((f) => {
    const fn = f.name
      .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
      .replace(/\.+$/, "")
      .trim()
      .toLowerCase();
    const fBase = fn.replace(/\.[a-z0-9]+$/i, "").trim();
    return fBase === targetBase || fn.includes(targetBase) || targetBase.includes(fBase);
  });
  if (baseMatch) return baseMatch;

  return null;
}

export async function resolveMediaBlobUrl(
  chatId: string,
  chatFolderId: string | undefined,
  driveFileId: string | undefined,
  fileName: string | undefined
): Promise<string | null> {
  // 1. Check in-memory cache
  if (fileName) {
    const cached =
      mediaCacheManagerInstance.getActiveUrl(`${chatId}_${fileName}`) ||
      mediaCacheManagerInstance.getActiveUrl(fileName);
    if (cached) return cached;
  }
  if (driveFileId) {
    const cached =
      mediaCacheManagerInstance.getActiveUrl(driveFileId) ||
      mediaCacheManagerInstance.getActiveUrl(`/api/drive/files/${driveFileId}`) ||
      authenticatedMediaCache.get(`/api/drive/files/${driveFileId}`);
    if (cached) return cached;
  }

  // 2. If driveFileId is available, download or load via MediaCacheManager
  if (driveFileId) {
    try {
      const url = await mediaCacheManagerInstance.getMediaUrl(chatId, fileName || driveFileId, driveFileId);
      if (url) return url;
    } catch (e) {}
  }

  // 3. If no driveFileId but chatFolderId and fileName exist, find matching file in Drive
  if (chatFolderId && fileName) {
    try {
      const files = await getChatDriveMediaFiles(chatFolderId);
      const matched = findMatchingDriveFile(fileName, files);
      if (matched) {
        const url = await mediaCacheManagerInstance.getMediaUrl(chatId, fileName, matched.id);
        if (url) return url;
      }
    } catch (e) {}
  }

  return null;
}


function useAuthenticatedMedia(mediaUrl: string | undefined, driveFileId: string | undefined) {
  const targetUrl = mediaUrl || (driveFileId ? `/api/drive/files/${driveFileId}` : undefined);

  const getImmediateCachedUrl = (): string | undefined => {
    if (!targetUrl) return undefined;
    if (!targetUrl.startsWith("/api/drive/files/")) return targetUrl;
    return (
      (driveFileId ? mediaCacheManagerInstance.getActiveUrl(driveFileId) : undefined) ||
      mediaCacheManagerInstance.getActiveUrl(targetUrl) ||
      authenticatedMediaCache.get(targetUrl)
    );
  };

  const [objectUrl, setObjectUrl] = useState<string | undefined>(getImmediateCachedUrl);
  const [loading, setLoading] = useState<boolean>(() => !getImmediateCachedUrl() && !!targetUrl);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!mediaUrl && !driveFileId) {
      setObjectUrl(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    const currentTarget = mediaUrl || (driveFileId ? `/api/drive/files/${driveFileId}` : undefined);
    if (!currentTarget) return;

    if (!currentTarget.startsWith("/api/drive/files/")) {
      setObjectUrl(currentTarget);
      setLoading(false);
      setError(false);
      return;
    }

    let active = true;

    // 1. Check in-memory caches
    const memoryCached =
      (driveFileId ? mediaCacheManagerInstance.getActiveUrl(driveFileId) : undefined) ||
      mediaCacheManagerInstance.getActiveUrl(currentTarget) ||
      authenticatedMediaCache.get(currentTarget);

    if (memoryCached) {
      setObjectUrl(memoryCached);
      setLoading(false);
      setError(false);
      return;
    }

    // 2. Check active fetch promise
    if (authenticatedMediaPromises.has(currentTarget)) {
      setLoading(true);
      setError(false);
      authenticatedMediaPromises.get(currentTarget)!
        .then((url) => {
          if (active) {
            setObjectUrl(url);
            setLoading(false);
            setError(false);
          }
        })
        .catch(() => {
          if (active) {
            setError(true);
            setLoading(false);
          }
        });
      return;
    }

    // 3. Direct fetch over network or IndexedDB
    setLoading(true);
    setError(false);

    const loadPromise = (async () => {
      // Check IndexedDB
      if (driveFileId) {
        try {
          const cached = await v3IndexedDBManagerInstance.getMediaItem("", "");
        } catch (e) {}
      }

      const headers: Record<string, string> = {};
      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (auth.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${idToken}`;
        }
      }

      console.log(`[useAuthenticatedMedia] Fetching authenticated media from ${currentTarget}`);
      const response = await fetch(getApiUrl(currentTarget), { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch authenticated media: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      authenticatedMediaCache.set(currentTarget, blobUrl);
      if (driveFileId) {
        mediaCacheManagerInstance.registerBlobUrl("", "", driveFileId, blob);
      }
      return blobUrl;
    })();

    authenticatedMediaPromises.set(currentTarget, loadPromise);

    loadPromise
      .then((blobUrl) => {
        authenticatedMediaPromises.delete(currentTarget);
        if (active) {
          setObjectUrl(blobUrl);
          setLoading(false);
          setError(false);
        }
      })
      .catch((err) => {
        console.error("[useAuthenticatedMedia] Error loading:", err);
        authenticatedMediaPromises.delete(currentTarget);
        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mediaUrl, driveFileId]);

  return { objectUrl, loading, error };
}

async function prefetchAuthenticatedMedia(mediaUrl: string | undefined, driveFileId: string | undefined) {
  if (!mediaUrl && !driveFileId) return;
  const targetUrl = mediaUrl || `/api/drive/files/${driveFileId}`;
  if (!targetUrl.startsWith("/api/drive/files/")) {
    return;
  }

  if (
    authenticatedMediaCache.has(targetUrl) ||
    (driveFileId && mediaCacheManagerInstance.getActiveUrl(driveFileId))
  ) {
    return;
  }

  if (authenticatedMediaPromises.has(targetUrl)) {
    try {
      await authenticatedMediaPromises.get(targetUrl);
    } catch (e) {
      // Ignore
    }
    return;
  }

  const loadPromise = (async () => {
    const headers: Record<string, string> = {};
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${idToken}`;
      }
    }

    console.log(`[Prefetch] Fetching media from ${targetUrl}`);
    const response = await fetch(getApiUrl(targetUrl), { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch prefetch media: ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    authenticatedMediaCache.set(targetUrl, blobUrl);
    if (driveFileId) {
      mediaCacheManagerInstance.registerBlobUrl("", "", driveFileId, blob);
    }
    return blobUrl;
  })();

  authenticatedMediaPromises.set(targetUrl, loadPromise);
  try {
    await loadPromise;
  } catch (err) {
    console.error("[Prefetch] Error prefetching:", err);
  } finally {
    authenticatedMediaPromises.delete(targetUrl);
  }
}

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoadDimensions?: (width: number, height: number) => void;
  dark?: boolean;
}

const SafeImage: React.FC<SafeImageProps> = React.memo(({ src, alt, className, onLoadDimensions, dark = false }) => {
  const { objectUrl, loading, error: authError } = useAuthenticatedMedia(src, undefined);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(true);
    }
  }, [authError]);

  const bgClass = dark ? "bg-black" : "bg-neutral-50";
  const textClass = dark ? "text-neutral-500" : "text-neutral-400";
  const loaderClass = dark ? "text-neutral-600 animate-spin" : "text-neutral-400 animate-spin";

  return (
    <div className={`relative w-full h-full ${bgClass} flex items-center justify-center overflow-hidden`}>
      {(loading || (!loaded && !error)) && (
        <div className={`absolute inset-0 ${bgClass} flex flex-col items-center justify-center animate-pulse`}>
          <Loader2 className={`w-5 h-5 ${loaderClass} mb-1`} />
          <span className={`text-[9px] ${textClass} font-mono`}>Loading Media...</span>
        </div>
      )}
      {error ? (
        <div className={`absolute inset-0 ${bgClass} flex flex-col items-center justify-center p-4 text-center select-none`}>
          <Image className={`w-5 h-5 ${textClass} mb-1`} />
          <span className={`text-[9px] ${textClass} font-sans truncate max-w-full px-2`}>{alt}</span>
        </div>
      ) : (
        objectUrl && (
          <img
            src={objectUrl}
            alt={alt}
            className={`${className} ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={(e) => {
              setLoaded(true);
              if (onLoadDimensions) {
                onLoadDimensions(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
              }
            }}
            onError={() => setError(true)}
            referrerPolicy="no-referrer"
          />
        )
      )}
    </div>
  );
});

interface AuthenticatedVideoProps {
  src: string;
  onPlayClick: () => void;
  onLoadDimensions?: (width: number, height: number) => void;
}

const AuthenticatedVideo: React.FC<AuthenticatedVideoProps> = React.memo(({ src, onPlayClick, onLoadDimensions }) => {
  const { objectUrl, loading, error } = useAuthenticatedMedia(src, undefined);
  const [loaded, setLoaded] = useState(false);

  if (loading) {
    return (
      <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-3 text-center animate-pulse z-10 select-none">
        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mb-1.5" />
        <span className="text-[10px] text-emerald-300 font-semibold font-sans">Loading video...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-4 text-center select-none">
        <Film className="w-6 h-6 text-neutral-500 mb-1" />
        <span className="text-[9px] text-neutral-400 font-sans">Video error or access denied</span>
      </div>
    );
  }

  return objectUrl ? (
    <div 
      className="relative w-full h-full cursor-pointer group flex items-center justify-center bg-black"
      onClick={onPlayClick}
    >
      <video 
        src={objectUrl} 
        className={`w-full h-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={(e) => {
          setLoaded(true);
          if (onLoadDimensions) {
            onLoadDimensions(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
          }
        }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30" />
      
      {/* Play icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-black/60 group-hover:bg-black/75 text-white flex items-center justify-center border border-white/20 scale-100 group-hover:scale-105 shadow-lg backdrop-blur-[2px]">
          <svg className="w-5 h-5 fill-white translate-x-[1.5px]" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  ) : null;
});

const WA_WAVEFORM_BARS = [
  30, 45, 75, 40, 60, 90, 65, 35, 50, 80, 100, 75, 45, 60, 85, 55, 35, 50, 70, 85, 65, 40, 55, 75, 50, 35, 25
];

interface AuthenticatedAudioProps {
  src?: string;
  driveFileId?: string;
  mediaFileName?: string;
  duration?: string;
  chatFolderId?: string;
  chatId?: string;
  isMe?: boolean;
  senderName?: string;
  senderAvatar?: string;
  time?: string;
}

const AuthenticatedAudio: React.FC<AuthenticatedAudioProps> = React.memo(({ 
  src, 
  driveFileId,
  mediaFileName, 
  duration,
  chatFolderId,
  chatId = "current_chat",
  isMe = false,
  senderName,
  senderAvatar,
  time = "12:00 pm"
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(() => {
    if (src) return src;
    if (driveFileId) {
      return (
        mediaCacheManagerInstance.getActiveUrl(driveFileId) || 
        authenticatedMediaCache.get(`/api/drive/files/${driveFileId}`) || 
        `/api/drive/files/${driveFileId}`
      );
    }
    if (mediaFileName) {
      return (
        mediaCacheManagerInstance.getActiveUrl(`${chatId}_${mediaFileName}`) ||
        mediaCacheManagerInstance.getActiveUrl(mediaFileName)
      );
    }
    return undefined;
  });

  const { objectUrl: hookObjectUrl, loading: hookLoading, error: hookError } = useAuthenticatedMedia(
    resolvedUrl && resolvedUrl.startsWith("/api/drive/files/")
      ? resolvedUrl
      : src && src.startsWith("/api/drive/files/")
      ? src
      : undefined,
    driveFileId
  );

  const activeMediaUrl =
    resolvedUrl && !resolvedUrl.startsWith("/api/drive/files/")
      ? resolvedUrl
      : hookObjectUrl || (resolvedUrl && !resolvedUrl.startsWith("/api/drive/files/") ? resolvedUrl : undefined);

  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeText, setCurrentTimeText] = useState("0:00");
  const [realDurationText, setRealDurationText] = useState<string>(() => (duration && duration !== "0:12" ? duration : ""));
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoPlayRef = useRef(false);

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Eager background resolution of Drive media URL & duration
  useEffect(() => {
    let active = true;
    if (!activeMediaUrl && (mediaFileName || driveFileId) && (chatFolderId || driveFileId)) {
      resolveMediaBlobUrl(chatId, chatFolderId, driveFileId, mediaFileName)
        .then((url) => {
          if (active && url) {
            setResolvedUrl(url);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [src, driveFileId, mediaFileName, chatFolderId, chatId, activeMediaUrl]);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setRealDurationText(formatAudioTime(audio.duration));
      }
      setLoadingAudio(false);
      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        audio.play().then(() => setPlaying(true)).catch((e) => {
          console.warn("[Audio] Autoplay interrupted:", e);
          setPlaying(false);
        });
      }
    };

    const handleCanPlay = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setRealDurationText(formatAudioTime(audio.duration));
      }
      setLoadingAudio(false);
      if (shouldAutoPlayRef.current) {
        shouldAutoPlayRef.current = false;
        audio.play().then(() => setPlaying(true)).catch((e) => {
          console.warn("[Audio] Autoplay interrupted:", e);
          setPlaying(false);
        });
      }
    };

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTimeText(formatAudioTime(audio.currentTime));
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTimeText("0:00");
    };

    const handleError = () => {
      console.warn("[Audio] Playback error encountered for:", mediaFileName);
      setLoadingAudio(false);
      setPlaying(false);
      setLoadError(true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    if (audio.readyState >= 1 && audio.duration) {
      handleLoadedMetadata();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [activeMediaUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;

    // 1. If audio element is already ready with source
    if (audio && activeMediaUrl) {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        try {
          await audio.play();
          setPlaying(true);
        } catch (err) {
          console.warn("[Audio] Direct play failed, reloading:", err);
          audio.load();
          audio.play().then(() => setPlaying(true)).catch(() => {
            setLoadError(true);
          });
        }
      }
      return;
    }

    // 2. If activeMediaUrl is not yet resolved, fetch on demand and autoplay
    setLoadingAudio(true);
    setLoadError(false);
    shouldAutoPlayRef.current = true;
    try {
      const fetchedUrl = await resolveMediaBlobUrl(chatId, chatFolderId, driveFileId, mediaFileName);
      if (fetchedUrl) {
        setResolvedUrl(fetchedUrl);
      } else {
        setLoadingAudio(false);
        shouldAutoPlayRef.current = false;
        setLoadError(true);
      }
    } catch (err) {
      console.error("[Audio] Error resolving media on demand:", err);
      setLoadingAudio(false);
      shouldAutoPlayRef.current = false;
      setLoadError(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct * 100);
    setCurrentTimeText(formatAudioTime(audio.currentTime));
  };

  if (loadError || hookError) {
    return (
      <div className="w-[260px] sm:w-[280px] max-w-full select-none">
        <div className="flex items-center gap-2.5 py-1 select-none transition-colors">
          <button 
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700 flex items-center justify-center active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Retry Audio"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <div className="flex-grow min-w-0">
            <div className="text-[10.5px] font-medium text-neutral-700 truncate">{mediaFileName || "Voice Note"}</div>
            <div className="text-[8.5px] text-neutral-400">Tap to load audio from Drive</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-neutral-500 font-sans pl-[42px] pr-0.5 select-none -mt-0.5">
          <span className="font-mono text-[10.5px] text-neutral-400 font-medium">
            {realDurationText || (duration && duration !== "0:12" ? duration : "0:00")}
          </span>
          <span className="text-[9.5px] text-neutral-400 font-sans tracking-tight flex items-center gap-0.5">
            <span>{time}</span>
            {isMe && <span className="text-blue-500 font-bold ml-0.5">✓✓</span>}
          </span>
        </div>
      </div>
    );
  }

  const displayDuration = playing || progress > 0
    ? currentTimeText
    : (realDurationText || (duration && duration !== "0:12" ? duration : "0:00"));

  return (
    <div className="w-[260px] sm:w-[280px] max-w-full select-none">
      {activeMediaUrl && (
        <audio 
          ref={audioRef} 
          src={activeMediaUrl} 
          className="hidden" 
          preload="metadata" 
        />
      )}
      
      {/* Top row: Avatar + Play/Pause Button + WhatsApp Waveform */}
      <div className="flex items-center gap-2 w-full">
        {/* Left Avatar with Mic Badge */}
        <div className="relative shrink-0 w-10 h-10 select-none">
          {senderAvatar ? (
            <img 
              src={senderAvatar} 
              alt="User" 
              className="w-10 h-10 rounded-full object-cover border border-black/5"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
              isMe ? "bg-emerald-700/15 text-emerald-800" : "bg-neutral-200 text-neutral-700"
            } border border-black/5`}>
              {senderName && senderName.trim() && !senderName.startsWith("msg_") && !senderName.startsWith("parsed-") ? (
                senderName.trim().slice(0, 2).toUpperCase()
              ) : (
                <User className="w-5 h-5 opacity-60" />
              )}
            </div>
          )}
          {/* Green Microphone Badge on bottom-right of avatar */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs border border-neutral-100/80">
            <Mic className="w-2.5 h-2.5 text-[#00a884] fill-[#00a884]" />
          </div>
        </div>

        {/* Play/Pause Button - Centered */}
        <button 
          onClick={togglePlay}
          disabled={loadingAudio}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer text-neutral-600 hover:text-neutral-900 active:scale-95 transition-all select-none disabled:opacity-70"
          title={playing ? "Pause" : "Play"}
        >
          {loadingAudio ? (
            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
          ) : playing ? (
            <Pause className="w-5 h-5 fill-neutral-600 text-neutral-600" />
          ) : (
            <Play className="w-5 h-5 fill-neutral-600 text-neutral-600 ml-0.5" />
          )}
        </button>

        {/* Interactive Waveform Bar with Scrubber */}
        <div 
          onClick={handleSeek}
          className="flex-grow h-7 flex items-center gap-[2.5px] relative cursor-pointer select-none py-1 min-w-0"
          title="Click to seek"
        >
          {WA_WAVEFORM_BARS.map((h, i) => {
            const barPct = (i / (WA_WAVEFORM_BARS.length - 1)) * 100;
            const isPlayed = barPct <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-75 ${
                  isPlayed
                    ? "bg-[#00a884]"
                    : isMe
                    ? "bg-emerald-800/30"
                    : "bg-neutral-300"
                }`}
                style={{ height: `${h}%`, minHeight: "4px" }}
              />
            );
          })}

          {/* Smooth Scrubber dot */}
          <div 
            className="w-2.5 h-2.5 rounded-full bg-neutral-600 absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75 shadow-xs"
            style={{ left: `${Math.min(99, Math.max(1, progress))}%` }}
          />
        </div>
      </div>

      {/* Bottom Row: Duration on Left, Time & Checkmark on Right */}
      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-sans pl-[84px] pr-0.5 select-none -mt-0.5">
        <span className="font-mono text-[10px] text-neutral-600 font-medium tracking-tight">
          {displayDuration}
        </span>
        <span className="text-[9.5px] text-neutral-400 font-sans tracking-tight flex items-center gap-0.5">
          <span>{time}</span>
          {isMe && <span className="text-blue-500 font-bold ml-0.5">✓✓</span>}
        </span>
      </div>
    </div>
  );
});

interface AuthenticatedDocumentProps {
  src: string;
  mediaFileName?: string;
}

const AuthenticatedDocument: React.FC<AuthenticatedDocumentProps> = React.memo(({ src, mediaFileName }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloading) return;

    setDownloading(true);
    try {
      const headers: Record<string, string> = {};
      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (auth.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          headers["Authorization"] = `Bearer ${idToken}`;
        }
      }

      const response = await fetch(getApiUrl(src), { headers });
      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = mediaFileName || "Document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (err) {
      console.error("[AuthenticatedDocument] Error downloading document:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full min-w-[200px] sm:min-w-[250px] max-w-full">
      <div className="flex items-center gap-2.5 bg-neutral-50/50 hover:bg-neutral-50 p-2 rounded-xl border border-neutral-200/35 transition-colors">
        <div className="w-8.5 h-8.5 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0 select-none">
          <FileArchive className="w-4.5 h-4.5" />
        </div>
        <div className="flex-grow min-w-0">
          <div className="text-[11px] font-semibold text-neutral-800 truncate" title={mediaFileName}>
            {mediaFileName || "Document_Report.pdf"}
          </div>
          <div className="text-[8.5px] text-neutral-400 font-medium uppercase font-mono mt-0.5 tracking-wider">
            Google Drive file
          </div>
        </div>
        <button 
          onClick={handleDownload}
          disabled={downloading}
          className="p-1 bg-white hover:bg-neutral-50 border border-neutral-200 shadow-3xs rounded-lg text-neutral-600 hover:text-neutral-900 transition-all shrink-0 cursor-pointer flex items-center justify-center w-7 h-7 disabled:opacity-50"
          title="Download Document"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
});

const getWhatsAppMediaStyle = (width: number | null, height: number | null) => {
  if (!width || !height) {
    return { 
      width: "100%", 
      maxWidth: "260px", 
      aspectRatio: "4/3" 
    };
  }

  const ratio = width / height;
  
  // Set maxWidth to the minimum of natural image width or 320px
  // to avoid small images stretching while keeping large images beautifully sized.
  const maxWidth = Math.min(width, 320);
  
  return {
    width: "100%",
    maxWidth: `${maxWidth}px`,
    aspectRatio: `${ratio}`,
  };
};

interface DynamicImageBubbleProps {
  mediaUrl: string;
  alt: string;
  time: string;
  caption?: string;
  onClick: () => void;
  isMe: boolean;
}

const DynamicImageBubble: React.FC<DynamicImageBubbleProps> = ({ mediaUrl, alt, time, caption, onClick, isMe }) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const style = getWhatsAppMediaStyle(dimensions?.width || null, dimensions?.height || null);

  return (
    <div className="relative pb-0">
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="bg-neutral-50 rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden select-none cursor-zoom-in group-hover:opacity-95 shadow-3xs"
        style={style}
      >
        <SafeImage 
          src={mediaUrl} 
          alt={alt} 
          className="w-full h-full object-cover"
          onLoadDimensions={(w, h) => setDimensions({ width: w, height: h })}
        />
        {!caption && (
          <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-sans text-white/95 select-none tracking-tight flex items-center gap-0.5 shadow-xs">
            <span>{time}</span>
            {isMe && <span className="text-sky-400 font-bold ml-0.5">✓✓</span>}
          </div>
        )}
      </div>
    </div>
  );
};

interface DynamicVideoBubbleProps {
  mediaUrl: string;
  time: string;
  caption?: string;
  onClick: () => void;
  isMe: boolean;
}

const DynamicVideoBubble: React.FC<DynamicVideoBubbleProps> = ({ mediaUrl, time, caption, onClick, isMe }) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const style = getWhatsAppMediaStyle(dimensions?.width || null, dimensions?.height || null);

  return (
    <div className="relative pb-0">
      <div 
        className="bg-neutral-50 rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden select-none shadow-3xs"
        style={style}
      >
        <AuthenticatedVideo 
          src={mediaUrl} 
          onPlayClick={onClick}
          onLoadDimensions={(w, h) => setDimensions({ width: w, height: h })}
        />
        {!caption && (
          <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-sans text-white/95 select-none tracking-tight flex items-center gap-0.5 shadow-xs font-mono">
            <span>{time}</span>
            {isMe && <span className="text-sky-400 font-bold ml-0.5">✓✓</span>}
          </div>
        )}
      </div>
    </div>
  );
};

interface InteractiveImageViewerProps {
  src: string;
  onClose: () => void;
}

const InteractiveImageViewer: React.FC<InteractiveImageViewerProps> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSwipingDown, setIsSwipingDown] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const touchStartDistRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.2);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      startRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2.2);
        }
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        if (scale === 1) {
          setIsSwipingDown(true);
          startRef.current = { x: touch.clientX, y: touch.clientY };
        } else {
          setIsPanning(true);
        }
      }
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      setIsSwipingDown(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      touchStartDistRef.current = dist;
      initialScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isSwipingDown) {
        const dy = touch.clientY - startRef.current.y;
        if (dy > 0) {
          setDragOffset({ x: 0, y: dy });
        }
      } else if (isPanning && scale > 1) {
        const nx = touch.clientX - startRef.current.x;
        const ny = touch.clientY - startRef.current.y;
        const boundX = (scale - 1) * window.innerWidth / 2;
        const boundY = (scale - 1) * window.innerHeight / 2;
        setPosition({
          x: Math.max(-boundX, Math.min(boundX, nx)),
          y: Math.max(-boundY, Math.min(boundY, ny))
        });
      }
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const factor = dist / touchStartDistRef.current;
      const newScale = Math.max(1, Math.min(4, initialScaleRef.current * factor));
      setScale(newScale);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    if (isSwipingDown) {
      setIsSwipingDown(false);
      if (dragOffset.y > 150) {
        onClose();
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsPanning(true);
      startRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    } else {
      setIsSwipingDown(true);
      startRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scale > 1) {
      const nx = e.clientX - startRef.current.x;
      const ny = e.clientY - startRef.current.y;
      const boundX = (scale - 1) * window.innerWidth / 2;
      const boundY = (scale - 1) * window.innerHeight / 2;
      setPosition({
        x: Math.max(-boundX, Math.min(boundX, nx)),
        y: Math.max(-boundY, Math.min(boundY, ny))
      });
    } else if (isSwipingDown && scale === 1) {
      const dy = e.clientY - startRef.current.y;
      if (dy > 0) {
        setDragOffset({ x: 0, y: dy });
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (isSwipingDown) {
      setIsSwipingDown(false);
      if (dragOffset.y > 150) {
        onClose();
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const swipeOpacity = Math.max(0.3, 1 - (dragOffset.y / 400));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[10000000] flex flex-col items-center justify-center select-none overflow-hidden touch-none"
      style={{ 
        backgroundColor: `rgba(0, 0, 0, ${swipeOpacity * 0.98})`,
        backdropFilter: "blur(6px)"
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="text-white/90 text-xs font-mono font-bold uppercase tracking-widest pl-2">
          Image Viewer
        </div>
        <button 
          onClick={onClose}
          className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all pointer-events-auto cursor-pointer hover:scale-105 border border-white/5 shadow-md flex items-center justify-center"
          title="Close Preview (Esc)"
        >
          <X className="w-5.5 h-5.5" />
        </button>
      </div>

      <div 
        className="w-full h-full flex items-center justify-center relative cursor-move"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <motion.div 
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="flex items-center justify-center max-w-full max-h-full"
          style={{ 
            transform: `translate(${position.x}px, ${position.y + dragOffset.y}px) scale(${scale})`,
          }}
        >
          <SafeImage 
            src={src} 
            alt="Original High Quality View" 
            className="max-w-[95vw] max-h-[85vh] md:max-w-[90vw] md:max-h-[90vh] object-contain rounded-lg shadow-2xl"
            dark={true}
          />
        </motion.div>
      </div>

      {scale === 1 && (
        <div className="absolute bottom-6 text-[10px] text-white/50 font-mono select-none pointer-events-none animate-pulse">
          Swipe down or drag image to close
        </div>
      )}
    </motion.div>
  );
};

interface InteractiveVideoViewerProps {
  src: string;
  onClose: () => void;
}

const InteractiveVideoViewer: React.FC<InteractiveVideoViewerProps> = ({ src, onClose }) => {
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(() => {
    if (!src) return null;
    if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("http")) {
      return src;
    }
    const cached = mediaCacheManagerInstance.getActiveUrl(src) || authenticatedMediaCache.get(src);
    return cached || null;
  });
  const [isResolvingUrl, setIsResolvingUrl] = useState(!directStreamUrl);
  const [buffering, setBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let active = true;
    if (directStreamUrl) {
      setIsResolvingUrl(false);
      return;
    }

    const resolveStreamUrl = async () => {
      try {
        let token = "";
        if (isFirebaseConfigured()) {
          const auth = getFirebaseAuth();
          if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
          }
        }
        if (!active) return;
        const apiPath = src.startsWith("/") ? src : `/${src}`;
        const finalUrl = token ? `${apiPath}${apiPath.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : apiPath;
        setDirectStreamUrl(finalUrl);
        setIsResolvingUrl(false);
      } catch (err) {
        console.error("[InteractiveVideoViewer] Error resolving stream url:", err);
        if (active) {
          setHasError(true);
          setIsResolvingUrl(false);
        }
      }
    };

    resolveStreamUrl();
    return () => {
      active = false;
    };
  }, [src, directStreamUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[10000000] flex flex-col items-center justify-center select-none bg-black/98 backdrop-blur-md"
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="text-white/90 text-xs font-mono font-bold uppercase tracking-widest pl-2">
          Video Player
        </div>
        <button 
          onClick={onClose}
          className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all pointer-events-auto cursor-pointer hover:scale-105 border border-white/5 shadow-md flex items-center justify-center"
          title="Close (Esc)"
        >
          <X className="w-5.5 h-5.5" />
        </button>
      </div>

      <div className="w-[90vw] h-[80vh] flex items-center justify-center relative">
        {isResolvingUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4 text-center z-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
            <span className="text-xs font-semibold text-emerald-300 font-sans">⚡ Connecting stream...</span>
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 p-4 text-center">
            <Film className="w-8 h-8 text-neutral-600 mb-2" />
            <span className="text-[11px] text-neutral-500 font-sans">Failed to load video stream</span>
          </div>
        )}

        {directStreamUrl && (
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full h-full flex items-center justify-center"
          >
            <video 
              ref={videoRef}
              src={directStreamUrl} 
              controls 
              autoPlay
              playsInline
              preload="auto"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/5"
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onCanPlay={() => setBuffering(false)}
              onLoadedData={() => setBuffering(false)}
              onTimeUpdate={() => {
                if (buffering) setBuffering(false);
              }}
              onError={() => setHasError(true)}
            />
          </motion.div>
        )}

        {/* Buffering overlay only when playback is legitimately paused/stalled */}
        {buffering && !isResolvingUrl && !hasError && directStreamUrl && (
          <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-black/25">
            <div className="p-3 bg-black/60 rounded-full backdrop-blur-xs flex items-center justify-center border border-white/5">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 text-[10px] text-white/50 font-mono select-none pointer-events-none">
        Press ESC or click the close button to exit fullscreen
      </div>
    </motion.div>
  );
};

interface MessageBubbleProps {
  msg: ParsedMessage;
  isMe: boolean;
  time: string;
  showDateSeparator: boolean;
  dateHeaderLabel: string;
  mediaUrl?: string | null;
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg,
  isMe,
  time,
  showDateSeparator,
  dateHeaderLabel,
  mediaUrl
}) => {
  return (
    <>
      {showDateSeparator && (
        <div className="flex justify-center my-3 select-none w-full">
          <span className="bg-[#ffefd5] text-[9.5px] font-mono text-neutral-700 px-3 py-1 rounded-md border border-amber-200/60 uppercase font-bold tracking-wide shadow-2xs">
            {dateHeaderLabel}
          </span>
        </div>
      )}
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} w-full`}>
        <div className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-left relative font-sans ${
          isMe 
            ? "bg-[#d9fdd3] text-neutral-900 rounded-tr-none border-b border-[#e2f7cb]" 
            : "bg-white text-neutral-900 rounded-tl-none border-b border-neutral-150"
        }`}>
          {msg.type === "text" && (
            (msg.text || "").trim() === "" &&
            !msg.mediaUrl &&
            !msg.driveFileId &&
            !msg.mediaFileName ? (
              <div className="flex items-center gap-1.5 text-neutral-500 text-xs sm:text-[13px] font-medium py-0.5 select-none pr-12">
                <span>👁 Opened</span>
              </div>
            ) : (
              <div className="text-xs sm:text-[13.5px] leading-relaxed font-sans text-neutral-900 break-words whitespace-pre-wrap relative select-text pb-0.5">
                <BeautifulEmojiText text={msg.text} />
                <span className="inline-block w-11" />
                <span className="absolute bottom-[-2px] right-0 text-[9px] font-sans text-neutral-400 select-none tracking-tight">
                  {time}
                </span>
              </div>
            )
          )}

          {msg.type === "image" && (
            <div className="space-y-1 relative pb-0.5">
              <div className="w-full aspect-[4/3] bg-neutral-100 rounded-lg border border-neutral-200 flex flex-col items-center justify-center relative overflow-hidden select-none min-w-[200px] sm:min-w-[280px]">
                {mediaUrl ? (
                  <img 
                    src={mediaUrl} 
                    alt={msg.mediaFileName || "Attached image"} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <>
                    <Image className="w-8 h-8 text-neutral-400 mb-1.5" />
                    <span className="text-[10px] text-neutral-400 font-sans text-center px-4 truncate w-full">{msg.mediaFileName || "Attachment_Screenshot.jpg"}</span>
                  </>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-sans text-white">
                  IMAGE_FILE
                </div>
                {!msg.caption && (
                  <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-sans text-white/95 select-none tracking-tight">
                    {time}
                  </div>
                )}
              </div>
              {msg.caption && (
                <div className="text-xs sm:text-[13px] text-neutral-800 font-sans leading-relaxed relative pr-12 pb-0.5 break-words whitespace-pre-wrap select-text mt-1.5">
                  <BeautifulEmojiText text={msg.caption} />
                  <span className="inline-block w-11" />
                  <span className="absolute bottom-[-2px] right-0 text-[9px] font-sans text-neutral-400 select-none tracking-tight">
                    {time}
                  </span>
                </div>
              )}
            </div>
          )}

          {msg.type === "video" && (
            <div className="space-y-1 relative pb-0.5">
              <div className="w-full aspect-[4/3] bg-neutral-150 rounded-lg border border-neutral-200 flex flex-col items-center justify-center relative overflow-hidden select-none min-w-[200px] sm:min-w-[280px]">
                {mediaUrl ? (
                  <video 
                    src={mediaUrl} 
                    controls 
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <>
                    <Film className="w-8 h-8 text-neutral-400 mb-1.5" />
                    <span className="text-[10px] text-neutral-400 font-sans text-center px-4 truncate w-full">{msg.mediaFileName || "Feedback_Screen_Loop.mp4"}</span>
                  </>
                )}
                <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-sans text-white">
                  VIDEO_FILE
                </div>
                {!msg.caption && (
                  <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-sans text-white/95 select-none tracking-tight">
                    {time}
                  </div>
                )}
              </div>
              {msg.caption && (
                <div className="text-xs sm:text-[13px] text-neutral-800 font-sans leading-relaxed relative pr-12 pb-0.5 break-words whitespace-pre-wrap select-text mt-1.5">
                  <BeautifulEmojiText text={msg.caption} />
                  <span className="inline-block w-11" />
                  <span className="absolute bottom-[-2px] right-0 text-[9px] font-sans text-neutral-400 select-none tracking-tight">
                    {time}
                  </span>
                </div>
              )}
            </div>
          )}

          {msg.type === "audio" && (
            <div className="relative font-sans w-full max-w-full">
              <AuthenticatedAudio 
                src={mediaUrl || undefined}
                driveFileId={msg.driveFileId}
                mediaFileName={msg.mediaFileName}
                duration={msg.duration}
                isMe={isMe}
                senderName={msg.senderName}
                time={time}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// Safe Portal Helper Component (Ensures client-only portal rendering to prevent server-side mismatches)
function SafePortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof window === "undefined" || !document.body) {
    return null;
  }

  return createPortal(children, document.body);
}

export default function ToolsPage({ googleUser, onGoogleLogin, onGoogleLogout, addToast }: ToolsPageProps) {
  // Clear states: strictly visual shell, default empty, waiting for Version 2 backend integration
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isChatsLoading, setIsChatsLoading] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [chatOpenProgress, setChatOpenProgress] = useState<ChatOpenProgress | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatIdToDelete, setChatIdToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const chatToDelete = chats.find(c => c.id === chatIdToDelete);

  const handleSecureDeleteChat = async () => {
    if (!chatIdToDelete || !chatToDelete || isDeletingChat) return;
    if (deleteConfirmText !== chatToDelete.name) {
      setDeleteError("Typed name does not match the chat name.");
      return;
    }

    setIsDeletingChat(true);
    setDeleteError(null);

    try {
      // 1. Delete from Firestore and Google Drive via backend
      const response = await firestorePersistenceClientInstance.deleteChat(chatIdToDelete);

      if (response.success) {
        // 2. Section 9.1: Delete local IndexedDB cache for this chat
        try {
          await v3IndexedDBManagerInstance.deleteChatData(chatIdToDelete);
        } catch (dbErr) {
          console.warn("[ToolsPage] Non-blocking IndexedDB deletion cleanup notice:", dbErr);
        }

        setChats(prev => prev.filter(c => c.id !== chatIdToDelete));
        if (selectedChatId === chatIdToDelete) {
          setSelectedChatId(null);
        }
        addToast("Chat, Google Drive media, and local cache permanently deleted.", "success");
        
        // Close & Reset
        setChatIdToDelete(null);
        setDeleteConfirmText("");
        setDeleteError(null);
      } else {
        throw new Error(response.message || "Failed to permanently delete chat.");
      }
    } catch (err: any) {
      console.error("[ToolsPage] Error deleting chat:", err);
      setDeleteError(err.message || "An unexpected error occurred during deletion.");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;

    // Priority-based ranking:
    // Priority 1: Chat name (Highest)
    // Priority 2: .zip file name
    // Priority 3: "WITH" / other participant name
    const matches: { chat: typeof chats[0]; priority: number; score: number }[] = [];

    chats.forEach((chat) => {
      const name = (chat.name || "").toLowerCase();
      const fileName = (chat.fileName || "").toLowerCase();
      const otherIdentity = (chat.otherIdentity || "").toLowerCase();

      let priority = 999;
      let score = 0;

      if (name.includes(q)) {
        priority = 1;
        score = name.startsWith(q) ? 2 : 1;
      } else if (fileName.includes(q)) {
        priority = 2;
        score = fileName.startsWith(q) ? 2 : 1;
      } else if (otherIdentity.includes(q)) {
        priority = 3;
        score = otherIdentity.startsWith(q) ? 2 : 1;
      }

      if (priority <= 3) {
        matches.push({ chat, priority, score });
      }
    });

    matches.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return 0;
    });

    return matches.map(item => item.chat);
  }, [chats, searchQuery]);

  // Form states inside the visual upload modal
  const [chatName, setChatName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showDrivePrePrompt, setShowDrivePrePrompt] = useState(false);
  const [showCloseChatConfirmModal, setShowCloseChatConfirmModal] = useState(false);
  const [isDriveAuthorized, setIsDriveAuthorized] = useState<boolean | null>(null);
  const [isDriveChecking, setIsDriveChecking] = useState(false);
  const [driveCheckingError, setDriveCheckingError] = useState<string | null>(null);
  const [isOAuthProcessing, setIsOAuthProcessing] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBodyScrollRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);

  // Buffering & preloading refs
  const activeBackgroundFetchIdRef = useRef<string | null>(null);
  const backgroundPreloadTimerRef = useRef<any>(null);
  const activeChatAllMessagesRef = useRef<ParsedMessage[]>([]);
  const scrollDebounceTimerRef = useRef<any>(null);
  const prefetchedUrlsRef = useRef<Set<string>>(new Set());
  const previousActiveChatIdRef = useRef<string | null>(null);
  const chatScrollPositionsRef = useRef<Map<string, number>>(new Map());
  const isRestoringScrollRef = useRef<boolean>(false);

  // High-performance rolling buffer config, state and refs
  const CONFIG_RENDER_WINDOW_SIZE = 1000; // Visible rendering limit (windowed rendering)
  const CONFIG_BUFFER_PREV_NEXT = 500;   // Preceding/Succeeding buffer margin around visible chunk
  
  const loadedMessagesMapRef = useRef<Map<number, ParsedMessage>>(new Map());
  const chatMaxSequenceIndexRef = useRef<number>(0);
  const anchorElementRef = useRef<{ id: string; offsetFromTop: number } | null>(null);
  const isFetchingRangeRef = useRef<Set<string>>(new Set()); // e.g. "start-end"
  const lastRequestedRangeRef = useRef<{ start: number; end: number } | null>(null);

  const nextWindowLoadingRef = useRef<boolean>(false);
  const previousWindowLoadingRef = useRef<boolean>(false);

  const visibleStartSeqIdxRef = useRef<number>(0);
  const visibleEndSeqIdxRef = useRef<number>(0);

  const [visibleStartSeqIdx, setVisibleStartSeqIdxState] = useState<number>(0);
  const [visibleEndSeqIdx, setVisibleEndSeqIdxState] = useState<number>(0);

  const setVisibleStartSeqIdx = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      setVisibleStartSeqIdxState((prev) => {
        const nextVal = val(prev);
        visibleStartSeqIdxRef.current = nextVal;
        return nextVal;
      });
    } else {
      visibleStartSeqIdxRef.current = val;
      setVisibleStartSeqIdxState(val);
    }
  };

  const setVisibleEndSeqIdx = (val: number | ((prev: number) => number)) => {
    if (typeof val === "function") {
      setVisibleEndSeqIdxState((prev) => {
        const nextVal = val(prev);
        visibleEndSeqIdxRef.current = nextVal;
        return nextVal;
      });
    } else {
      visibleEndSeqIdxRef.current = val;
      setVisibleEndSeqIdxState(val);
    }
  };

  const [leftColumnHeight, setLeftColumnHeight] = useState<number>(650);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [sidebarMaxHeight, setSidebarMaxHeight] = useState<string | number>("none");

  // V2/V3 Import states
  const [isImporting, setIsImporting] = useState(false);
  const [canInstantView, setCanInstantView] = useState(false);
  const [isTriggeringInstantView, setIsTriggeringInstantView] = useState(false);
  const [bgUploadStatus, setBgUploadStatus] = useState<any>(null);
  const [importProgress, setImportProgress] = useState<{
    stage: "validating" | "parsing" | "uploading" | "saving" | "completed" | "failed";
    progress: number;
    label: string;
    message: string;
  } | null>(null);
  const [partialImportResult, setPartialImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [selectedMyIdentity, setSelectedMyIdentity] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isProcessingImportRef = useRef(false);
  const lastHandledImportIdRef = useRef<string | null>(null);

  // Security Phase 3: UX Safety, ZIP Replacement Confirmation & Safe Close states
  const [pendingZipFile, setPendingZipFile] = useState<File | null>(null);
  const [showReplaceZipModal, setShowReplaceZipModal] = useState(false);
  const [showSafeCloseModal, setShowSafeCloseModal] = useState(false);
  const [showImportInProgressWarningModal, setShowImportInProgressWarningModal] = useState(false);
  const [newlyImportedChatForPrompt, setNewlyImportedChatForPrompt] = useState<ChatSession | null>(null);

  // Cleanup on unmount & V3 import orchestration subscriptions
  useEffect(() => {
    isMountedRef.current = true;
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("selectedChatId");
      } catch (e) {}
    }

    v3ImportOrchestratorInstance.setInstantViewReadyCallback(() => {
      if (isMountedRef.current) {
        setCanInstantView((prev) => {
          if (!prev) {
            addToast("Chat is ready for Instant View! You can preview now.", "instruction");
          }
          return true;
        });
      }
    });

    v3ImportOrchestratorInstance.setBackgroundProgressCallback((status) => {
      if (isMountedRef.current) {
        setBgUploadStatus(status);
      }
    });

    return () => {
      isMountedRef.current = false;
      v3ImportOrchestratorInstance.setProgressCallback(null);
      v3ImportOrchestratorInstance.setInstantViewReadyCallback(null);
      v3ImportOrchestratorInstance.setBackgroundProgressCallback(null);
    };
  }, []);

  // WhatsApp Chat Viewer Presentation States
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [isLoadingNextWindow, setIsLoadingNextWindow] = useState<boolean>(false);
  const [isLoadingPreviousWindow, setIsLoadingPreviousWindow] = useState<boolean>(false);
  const [isScrollingToBottom, setIsScrollingToBottomState] = useState<boolean>(false);
  const isScrollingToBottomRef = useRef<boolean>(false);
  const scrollToBottomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setIsScrollingToBottom = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === "function") {
      setIsScrollingToBottomState((prev) => {
        const nextVal = val(prev);
        isScrollingToBottomRef.current = nextVal;
        return nextVal;
      });
    } else {
      isScrollingToBottomRef.current = val;
      setIsScrollingToBottomState(val);
    }
  };

  const getInitials = (name: string) => {
    const clean = (name || "").replace(/Chat with /i, "").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getAvatarBgColor = (name: string) => {
    const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-indigo-100 text-indigo-700 border-indigo-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-sky-100 text-sky-700 border-sky-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-teal-100 text-teal-700 border-teal-200"
    ];
    return colors[hash % colors.length];
  };

  // Load chats from Firestore
  useEffect(() => {
    if (googleUser && googleUser.uid) {
      setIsChatsLoading(true);
      firestorePersistenceClientInstance.getUserChats(googleUser.uid)
        .then((v2Chats) => {
          if (!isMountedRef.current) return;
          const mappedChats: ChatSession[] = v2Chats.map((c) => ({
            id: c.id,
            name: c.name,
            date: formatSeparatorDate(c.createdAt),
            fileName: c.fileName,
            myIdentity: c.myIdentity,
            otherIdentity: c.otherIdentity,
            lastMessage: c.lastMessage,
            totalMessageCount: c.totalMessageCount,
            messageCount: c.messageCount,
            createdAt: c.createdAt,
            createdTime: c.createdAt ? getFormattedCreationTime(c.createdAt) : undefined,
            driveFolderId: c.driveFolderId,
          }));
          setChats(mappedChats);
        })
        .catch((err) => {
          console.error("Failed to load chats:", err);
          addToast("Failed to load chats. Please retry.", "error");
        })
        .finally(() => {
          if (isMountedRef.current) {
            setIsChatsLoading(false);
          }
        });
    } else {
      setChats([]);
      setSelectedChatId(null);
    }
  }, [googleUser]);

  // High-performance message range loader with contiguous range detection and memory management
  const ensureMessageRangeLoaded = async (
    chatId: string, 
    userId: string, 
    startSeqIdx: number, 
    endSeqIdx: number,
    onLoaded?: (msgs: ParsedMessage[]) => void
  ) => {
    if (!userId || !chatId) return;

    // Calculate wide buffer range around visible rendering window
    const bufferStart = Math.max(0, startSeqIdx - CONFIG_BUFFER_PREV_NEXT);
    const bufferEnd = Math.min(chatMaxSequenceIndexRef.current, endSeqIdx + CONFIG_BUFFER_PREV_NEXT);

    // 1. First check IndexedDB for any cached records in [bufferStart, bufferEnd]
    try {
      const cachedIndexedDBRecords = await v3IndexedDBManagerInstance.getMessagesRange(chatId, bufferStart, bufferEnd);
      if (cachedIndexedDBRecords && cachedIndexedDBRecords.length > 0) {
        cachedIndexedDBRecords.forEach((m) => {
          if (!loadedMessagesMapRef.current.has(m.sequenceIndex)) {
            const mapped: ParsedMessage = {
              id: m.id,
              sender: m.sender,
              senderName: m.senderName,
              text: m.text,
              time: m.time || "12:00 PM",
              type: m.type as any,
              isMedia: m.type !== "text",
              mediaFileName: m.mediaFileName,
              mediaUrl: m.driveFileId ? `/api/drive/files/${m.driveFileId}` : undefined,
              caption: m.caption,
              duration: m.duration,
              driveFileId: m.driveFileId,
              timestamp: m.timestamp,
              sequenceIndex: m.sequenceIndex,
            };
            loadedMessagesMapRef.current.set(m.sequenceIndex, mapped);
          }
        });
      }
    } catch (dbErr) {
      console.warn("[ensureMessageRangeLoaded] IndexedDB local lookup non-blocking error:", dbErr);
    }

    // 2. Identify contiguous missing blocks within [bufferStart, bufferEnd]
    const missingRanges: { start: number; end: number }[] = [];
    let rangeStart: number | null = null;

    for (let i = bufferStart; i <= bufferEnd; i++) {
      if (!loadedMessagesMapRef.current.has(i)) {
        if (rangeStart === null) {
          rangeStart = i;
        }
      } else {
        if (rangeStart !== null) {
          missingRanges.push({ start: rangeStart, end: i - 1 });
          rangeStart = null;
        }
      }
    }
    if (rangeStart !== null) {
      missingRanges.push({ start: rangeStart, end: bufferEnd });
    }

    if (missingRanges.length > 0) {
      console.log(`[Rolling Buffer] Found ${missingRanges.length} missing contiguous range(s) inside [${bufferStart}, ${bufferEnd}]:`, missingRanges);
      
      const fetchPromises = missingRanges.map(async (range) => {
        const rangeKey = `${range.start}-${range.end}`;
        if (isFetchingRangeRef.current.has(rangeKey)) {
          return; // Skip if a request is already active for this exact range
        }
        isFetchingRangeRef.current.add(rangeKey);

        try {
          const fetchedV2 = await firestorePersistenceClientInstance.getChatMessagesRange(chatId, range.start, range.end);
          if (activeBackgroundFetchIdRef.current !== chatId) return;

          fetchedV2.forEach((m) => {
            const mapped: ParsedMessage = {
              id: m.id,
              sender: m.sender,
              senderName: m.senderName,
              text: m.text,
              time: m.time || "12:00 PM",
              type: m.type as any,
              isMedia: m.type !== "text",
              mediaFileName: m.mediaFileName,
              mediaUrl: m.driveFileId ? `/api/drive/files/${m.driveFileId}` : undefined,
              caption: m.caption,
              duration: m.duration,
              driveFileId: m.driveFileId,
              timestamp: m.timestamp,
              sequenceIndex: m.sequenceIndex,
            };
            loadedMessagesMapRef.current.set(m.sequenceIndex, mapped);
          });
        } catch (e) {
          console.error(`[Rolling Buffer] Range fetch failed: ${rangeKey}:`, e);
        } finally {
          isFetchingRangeRef.current.delete(rangeKey);
        }
      });

      await Promise.allSettled(fetchPromises);
    }

    if (activeBackgroundFetchIdRef.current !== chatId) return;

    // MEMORY MANAGEMENT: Prune old loaded messages from Map to keep RAM usage stable (SAD Section 15.25)
    const currentFocus = Math.floor((startSeqIdx + endSeqIdx) / 2);
    const KEEP_RANGE = 8000;
    let prunedCount = 0;
    for (const [seqIdx] of loadedMessagesMapRef.current.entries()) {
      if (Math.abs(seqIdx - currentFocus) > KEEP_RANGE) {
        loadedMessagesMapRef.current.delete(seqIdx);
        prunedCount++;
      }
    }
    if (prunedCount > 0) {
      console.log(`[Memory Management] Pruned ${prunedCount} messages from Map. Cache size: ${loadedMessagesMapRef.current.size}`);
    }

    // Slice the Map cache to get exact messages for current visible window [startSeqIdx, endSeqIdx]
    const visibleMessages: ParsedMessage[] = [];
    for (let s = startSeqIdx; s <= endSeqIdx; s++) {
      const msg = loadedMessagesMapRef.current.get(s);
      if (msg) {
        visibleMessages.push(msg);
      }
    }

    // Bind subset to active chat session state
    setChats((prev) => 
      prev.map((c) => 
        c.id === chatId 
          ? { ...c, messages: visibleMessages } 
          : c
      )
    );

    if (onLoaded) {
      onLoaded(visibleMessages);
    }
  };

  // Jump to bottom directly, fetching latest batch from Firestore
  const jumpToBottomAndLoadLatest = async () => {
    if (!selectedChatId || !googleUser) return;
    
    const maxIdx = chatMaxSequenceIndexRef.current;
    const startIdx = Math.max(0, maxIdx - CONFIG_RENDER_WINDOW_SIZE + 1);
    const endIdx = maxIdx;

    console.log(`[Jump to Bottom] Directly retrieving latest batch [${startIdx}, ${endIdx}]`);
    
    setVisibleStartSeqIdx(startIdx);
    setVisibleEndSeqIdx(endIdx);
    lastRequestedRangeRef.current = { start: startIdx, end: endIdx };

    await ensureMessageRangeLoaded(selectedChatId, googleUser.uid, startIdx, endIdx);

    setTimeout(() => {
      if (chatBodyScrollRef.current) {
        chatBodyScrollRef.current.scrollTo({
          top: chatBodyScrollRef.current.scrollHeight,
          behavior: "auto"
        });
      }
    }, 150);
  };

  // Initialize and load chat window on chat selection via V3 Loader Pipeline (Section 6)
  useEffect(() => {
    if (!selectedChatId) {
      // User closed chat to return to empty/dashboard view (without switching to another chat)
      return;
    }

    if (googleUser && googleUser.uid) {
      const currentSelectedChat = chats.find((c) => c.id === selectedChatId);
      const totalMessages = currentSelectedChat?.totalMessageCount || currentSelectedChat?.messageCount || 1500;
      const chatFolderId = currentSelectedChat?.driveFolderId || "";

      previousActiveChatIdRef.current = selectedChatId;
      if (backgroundPreloadTimerRef.current) {
        clearTimeout(backgroundPreloadTimerRef.current);
      }
      activeBackgroundFetchIdRef.current = selectedChatId;
      prefetchedUrlsRef.current.clear();
      loadedMessagesMapRef.current.clear();
      isFetchingRangeRef.current.clear();
      lastRequestedRangeRef.current = null;
      nextWindowLoadingRef.current = false;
      previousWindowLoadingRef.current = false;
      visibleStartSeqIdxRef.current = 0;
      visibleEndSeqIdxRef.current = 0;
      setIsLoadingNextWindow(false);
      setIsLoadingPreviousWindow(false);
      isScrollingToBottomRef.current = false;
      setIsScrollingToBottom(false);
      chatMaxSequenceIndexRef.current = 0;

      // FAST PATH: If messages are already present in memory (e.g. from Instant View)
      if (currentSelectedChat?.messages && currentSelectedChat.messages.length > 0) {
        setIsLoadingMessages(false);
        setChatOpenProgress(null);

        const initialMsgs: ParsedMessage[] = currentSelectedChat.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          senderName: m.senderName,
          text: m.text,
          time: m.time || "12:00 PM",
          type: m.type as any,
          isMedia: m.type !== "text",
          mediaFileName: m.mediaFileName,
          mediaUrl: m.driveFileId ? `/api/drive/files/${m.driveFileId}` : undefined,
          caption: m.caption,
          duration: m.duration,
          driveFileId: m.driveFileId,
          timestamp: m.timestamp,
          sequenceIndex: m.sequenceIndex,
        }));

        initialMsgs.forEach((msg) => {
          if (msg.sequenceIndex !== undefined) {
            loadedMessagesMapRef.current.set(msg.sequenceIndex, msg);
          }
        });

        const maxIdx = Math.max(0, totalMessages - 1);
        chatMaxSequenceIndexRef.current = maxIdx;
        const startIdx = 0;
        const endIdx = Math.max(0, initialMsgs.length - 1);

        setVisibleStartSeqIdx(startIdx);
        setVisibleEndSeqIdx(endIdx);
        lastRequestedRangeRef.current = { start: startIdx, end: endIdx };

        if (chatFolderId) {
          v3ContinuousScrollManagerInstance.init(
            selectedChatId,
            chatFolderId,
            totalMessages,
            currentSelectedChat.messages as any
          );
        }

        // Seamless zero-flicker entry: scroll to top and resume uploads
        requestAnimationFrame(() => {
          if (activeBackgroundFetchIdRef.current === selectedChatId) {
            setIsLoadingMessages(false);
            setChatOpenProgress(null);
            scrollToTop("auto");

            // Resume background uploads smoothly 1.5s after chat is displayed
            setTimeout(() => {
              v3ImportOrchestratorInstance.resumeMediaUploads();
            }, 1500);
          }
        });
        return;
      }

      setIsLoadingMessages(true);
      setChatOpenProgress({
        stage: "init",
        progressPercent: 5,
        message: "Initializing chat viewer...",
        totalMessagesInBatch: 0,
      });

      (async () => {
        try {
          // If chat has Google Drive folder configured, run through V3 Loader Pipeline
          if (chatFolderId) {
            const v3Result = await v3ChatViewerLoaderInstance.openChat(
              selectedChatId,
              chatFolderId,
              totalMessages,
              (progress) => {
                if (activeBackgroundFetchIdRef.current === selectedChatId) {
                  setChatOpenProgress(progress);
                }
              }
            );

            if (activeBackgroundFetchIdRef.current !== selectedChatId) return;

            // Initialize continuous 3-batch window manager [Previous] - [Current] - [Next]
            v3ContinuousScrollManagerInstance.init(
              selectedChatId,
              chatFolderId,
              totalMessages,
              v3Result.initialMessages
            );

            const initialMsgs: ParsedMessage[] = v3Result.initialMessages.map((m) => ({
              id: m.id,
              sender: m.sender,
              senderName: m.senderName,
              text: m.text,
              time: m.time || "12:00 PM",
              type: m.type as any,
              isMedia: m.type !== "text",
              mediaFileName: m.mediaFileName,
              mediaUrl: m.driveFileId ? `/api/drive/files/${m.driveFileId}` : undefined,
              caption: m.caption,
              duration: m.duration,
              driveFileId: m.driveFileId,
              timestamp: m.timestamp,
              sequenceIndex: m.sequenceIndex,
            }));

            // Store initial batch in memory map
            initialMsgs.forEach((msg) => {
              if (msg.sequenceIndex !== undefined) {
                loadedMessagesMapRef.current.set(msg.sequenceIndex, msg);
              }
            });

            const maxIdx = Math.max(0, totalMessages - 1);
            chatMaxSequenceIndexRef.current = maxIdx;

            const startIdx = 0;
            const endIdx = Math.max(0, initialMsgs.length - 1);

            setVisibleStartSeqIdx(startIdx);
            setVisibleEndSeqIdx(endIdx);
            lastRequestedRangeRef.current = { start: startIdx, end: endIdx };

            // Render complete initial batch (1500 messages continuous window)
            setChats((prev) =>
              prev.map((c) =>
                c.id === selectedChatId
                  ? { ...c, messages: initialMsgs }
                  : c
              )
            );

            // Fresh open on chat: Always position at Top
            requestAnimationFrame(() => {
              if (activeBackgroundFetchIdRef.current === selectedChatId) {
                setIsLoadingMessages(false);
                setChatOpenProgress(null);
                setTimeout(() => {
                  scrollToTop("auto");
                  if (chatBodyScrollRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = chatBodyScrollRef.current;
                    setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 50);
                  }
                  // Resume background uploads 1.5s after viewer is ready
                  setTimeout(() => {
                    v3ImportOrchestratorInstance.resumeMediaUploads();
                  }, 1500);
                }, 80);
              }
            });

            return;
          }

          // Fallback if no driveFolderId (e.g. legacy chat): Query Firestore
          const latestMsg = await firestorePersistenceClientInstance.getChatLatestMessage(googleUser.uid, selectedChatId);
          if (!isMountedRef.current || activeBackgroundFetchIdRef.current !== selectedChatId) return;

          const maxIdx = latestMsg ? latestMsg.sequenceIndex : 0;
          chatMaxSequenceIndexRef.current = maxIdx;

          const startIdx = 0;
          const endIdx = Math.min(CONFIG_RENDER_WINDOW_SIZE - 1, maxIdx);

          setVisibleStartSeqIdx(startIdx);
          setVisibleEndSeqIdx(endIdx);
          lastRequestedRangeRef.current = { start: startIdx, end: endIdx };

          await ensureMessageRangeLoaded(selectedChatId, googleUser.uid, startIdx, endIdx, async (visibleMsgs) => {
            if (activeBackgroundFetchIdRef.current !== selectedChatId) return;
            setIsLoadingMessages(false);
            setChatOpenProgress(null);
            setTimeout(() => {
              scrollToTop("auto");
            }, 100);
          });
        } catch (err) {
          console.error("[Chat Open V3] Failed to load chat:", err);
          addToast("Failed to open chat. Please try again.", "error");
          setIsLoadingMessages(false);
          setChatOpenProgress(null);
        }
      })();
    }

    return () => {
      if (backgroundPreloadTimerRef.current) {
        clearTimeout(backgroundPreloadTimerRef.current);
      }
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
      activeBackgroundFetchIdRef.current = null;
    };
  }, [selectedChatId, googleUser]);

  const scrollToTop = (behavior: "smooth" | "auto" = "smooth") => {
    if (chatBodyScrollRef.current) {
      chatBodyScrollRef.current.scrollTo({
        top: 0,
        behavior,
      });
    }
  };

  const checkAndFinishScrollToBottom = () => {
    if (!chatBodyScrollRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyScrollRef.current;
    // Reached bottom threshold (within 50px of actual bottom)
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
    if (isAtBottom) {
      if (scrollToBottomTimeoutRef.current) {
        clearTimeout(scrollToBottomTimeoutRef.current);
        scrollToBottomTimeoutRef.current = null;
      }
      setIsScrollingToBottom(false);
      setShowScrollBottomBtn(false);
      return true;
    }
    return false;
  };

  const scrollToBottom = async (behavior: "smooth" | "auto" = "smooth") => {
    if (isScrollingToBottomRef.current) return;

    setIsScrollingToBottom(true);

    if (scrollToBottomTimeoutRef.current) {
      clearTimeout(scrollToBottomTimeoutRef.current);
    }
    scrollToBottomTimeoutRef.current = setTimeout(() => {
      console.warn("[V3 Scroll To Bottom] Safety timeout of 15s reached");
      setIsScrollingToBottom(false);
      scrollToBottomTimeoutRef.current = null;
    }, 15000);

    try {
      const currentSelectedChat = chats.find((c) => c.id === selectedChatId);
      const chatFolderId = currentSelectedChat?.driveFolderId;

      if (selectedChatId && chatFolderId) {
        // V3 Architecture: Download & prepare Last Batch N on-demand if needed
        console.log(`[V3 Scroll To Bottom] Preparing latest batch on demand...`);
        const result = await v3ContinuousScrollManagerInstance.prepareScrollToBottom();

        const mappedMsgs: ParsedMessage[] = result.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          senderName: m.senderName,
          text: m.text,
          time: m.time || "12:00 PM",
          type: m.type as any,
          isMedia: m.type !== "text",
          mediaFileName: m.mediaFileName,
          mediaUrl: m.driveFileId ? `/api/drive/files/${m.driveFileId}` : undefined,
          caption: m.caption,
          duration: m.duration,
          driveFileId: m.driveFileId,
          timestamp: m.timestamp,
          sequenceIndex: m.sequenceIndex,
        }));

        mappedMsgs.forEach((msg) => {
          if (msg.sequenceIndex !== undefined) {
            loadedMessagesMapRef.current.set(msg.sequenceIndex, msg);
          }
        });

        const startIdx = mappedMsgs.length > 0 ? (mappedMsgs[0].sequenceIndex ?? 0) : 0;
        const endIdx = result.targetSequenceIndex;

        setVisibleStartSeqIdx(startIdx);
        setVisibleEndSeqIdx(endIdx);
        lastRequestedRangeRef.current = { start: startIdx, end: endIdx };

        // Mount latest batch messages into state
        setChats((prev) =>
          prev.map((c) =>
            c.id === selectedChatId
              ? { ...c, messages: mappedMsgs }
              : c
          )
        );

        // Wait for React to finish rendering DOM message bubbles and layout calculation
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });
      } else {
        // Fallback for legacy chats
        const maxIdx = chatMaxSequenceIndexRef.current;
        const startIdx = Math.max(0, maxIdx - CONFIG_RENDER_WINDOW_SIZE + 1);

        lastRequestedRangeRef.current = { start: startIdx, end: maxIdx };
        setVisibleStartSeqIdx(startIdx);
        setVisibleEndSeqIdx(maxIdx);

        if (selectedChatId && googleUser) {
          await ensureMessageRangeLoaded(selectedChatId, googleUser.uid, startIdx, maxIdx);
        }

        // Wait for DOM to mount
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        });
      }

      // Native WhatsApp/Telegram Glide Animation:
      // Jump instantly to ~100-150 messages above bottom, then smooth glide down to the last message
      if (chatBodyScrollRef.current) {
        const container = chatBodyScrollRef.current;
        const targetBottom = container.scrollHeight;
        // 100-150 messages range staging (approx 3500px - 4500px)
        const glideOffset = Math.min(4500, Math.max(1200, container.clientHeight * 3.5));
        const glideStart = Math.max(0, targetBottom - container.clientHeight - glideOffset);
        
        // Snap instantly to pre-bottom glide staging position (100-150 msgs above)
        container.scrollTop = glideStart;

        // Perform smooth glide to the bottom element
        container.scrollTo({
          top: targetBottom,
          behavior: "smooth",
        });
      }

      // Ensure crisp settle at absolute bottom after smooth glide completes
      await new Promise((res) => setTimeout(res, 400));
      if (chatBodyScrollRef.current) {
        chatBodyScrollRef.current.scrollTop = chatBodyScrollRef.current.scrollHeight;
      }
      setShowScrollBottomBtn(false);
    } catch (err) {
      console.error("[V3 Scroll To Bottom Error]", err);
      addToast("Failed to scroll to bottom. Please try again.", "error");
    } finally {
      if (scrollToBottomTimeoutRef.current) {
        clearTimeout(scrollToBottomTimeoutRef.current);
        scrollToBottomTimeoutRef.current = null;
      }
      setIsScrollingToBottom(false);
      if (chatBodyScrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatBodyScrollRef.current;
        setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 50);
      }
    }
  };

  const checkAndTriggerBoundaries = () => {
    if (isScrollingToBottomRef.current) return;
    if (!chatBodyScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyScrollRef.current;
    const SCROLL_THRESHOLD = 300;

    if (scrollTop < SCROLL_THRESHOLD && visibleStartSeqIdxRef.current > 0) {
      shiftUp();
    } else if (scrollTop + clientHeight > scrollHeight - SCROLL_THRESHOLD && visibleEndSeqIdxRef.current < chatMaxSequenceIndexRef.current) {
      shiftDown();
    }
  };

  const shiftUp = () => {
    if (isScrollingToBottomRef.current || previousWindowLoadingRef.current) return;
    const startIdx = visibleStartSeqIdxRef.current;
    if (startIdx <= 0 || !selectedChatId || !googleUser) return;

    const shiftAmt = 200;
    const newStart = Math.max(0, startIdx - shiftAmt);
    const newEnd = newStart + CONFIG_RENDER_WINDOW_SIZE - 1;

    if (lastRequestedRangeRef.current && lastRequestedRangeRef.current.start === newStart && lastRequestedRangeRef.current.end === newEnd) {
      return;
    }
    lastRequestedRangeRef.current = { start: newStart, end: newEnd };

    previousWindowLoadingRef.current = true;
    setIsLoadingPreviousWindow(true);

    console.log(`[Shift Up] Shifting visible window to: [${newStart}, ${newEnd}]`);

    const container = chatBodyScrollRef.current;
    if (container) {
      const children = Array.from(container.children) as HTMLElement[];
      const anchorChild = children.find(child => child.offsetTop >= container.scrollTop);
      if (anchorChild) {
        const msgId = anchorChild.getAttribute("data-message-id");
        if (msgId) {
          anchorElementRef.current = {
            id: msgId,
            offsetFromTop: anchorChild.offsetTop - container.scrollTop
          };
        }
      }
    }

    setVisibleStartSeqIdx(newStart);
    setVisibleEndSeqIdx(newEnd);

    ensureMessageRangeLoaded(selectedChatId, googleUser.uid, newStart, newEnd)
      .catch((err) => {
        console.error("[Shift Up Error]", err);
      })
      .finally(() => {
        previousWindowLoadingRef.current = false;
        setIsLoadingPreviousWindow(false);
        requestAnimationFrame(() => {
          checkAndTriggerBoundaries();
        });
      });
  };

  const shiftDown = () => {
    if (isScrollingToBottomRef.current || nextWindowLoadingRef.current) return;
    const endIdx = visibleEndSeqIdxRef.current;
    const maxIdx = chatMaxSequenceIndexRef.current;
    if (endIdx >= maxIdx || !selectedChatId || !googleUser) return;

    const shiftAmt = 200;
    const newEnd = Math.min(maxIdx, endIdx + shiftAmt);
    const newStart = Math.max(0, newEnd - CONFIG_RENDER_WINDOW_SIZE + 1);

    if (lastRequestedRangeRef.current && lastRequestedRangeRef.current.start === newStart && lastRequestedRangeRef.current.end === newEnd) {
      return;
    }
    lastRequestedRangeRef.current = { start: newStart, end: newEnd };

    nextWindowLoadingRef.current = true;
    setIsLoadingNextWindow(true);

    console.log(`[Shift Down] Shifting visible window to: [${newStart}, ${newEnd}]`);

    const container = chatBodyScrollRef.current;
    if (container) {
      const children = Array.from(container.children) as HTMLElement[];
      const anchorChild = children.find(child => child.offsetTop >= container.scrollTop);
      if (anchorChild) {
        const msgId = anchorChild.getAttribute("data-message-id");
        if (msgId) {
          anchorElementRef.current = {
            id: msgId,
            offsetFromTop: anchorChild.offsetTop - container.scrollTop
          };
        }
      }
    }

    setVisibleStartSeqIdx(newStart);
    setVisibleEndSeqIdx(newEnd);

    ensureMessageRangeLoaded(selectedChatId, googleUser.uid, newStart, newEnd)
      .catch((err) => {
        console.error("[Shift Down Error]", err);
      })
      .finally(() => {
        nextWindowLoadingRef.current = false;
        setIsLoadingNextWindow(false);
        requestAnimationFrame(() => {
          checkAndTriggerBoundaries();
        });
      });
  };

  // Scroll anchoring effect to prevent visual scrolling shifts
  useEffect(() => {
    if (anchorElementRef.current && chatBodyScrollRef.current) {
      const container = chatBodyScrollRef.current;
      const anchorId = anchorElementRef.current.id;
      const element = container.querySelector(`[data-message-id="${anchorId}"]`) as HTMLElement;
      if (element) {
        const newScrollTop = element.offsetTop - anchorElementRef.current.offsetFromTop;
        container.scrollTop = newScrollTop;
      }
      anchorElementRef.current = null;
    }
  }, [visibleStartSeqIdx, visibleEndSeqIdx]);

  // Desktop middle-click (mouse wheel click) controlled auto-scroll engine with max speed limit
  useEffect(() => {
    const container = chatBodyScrollRef.current;
    if (!container) return;

    let isAutoScrolling = false;
    let startY = 0;
    let currentY = 0;
    let animFrameId: number | null = null;
    const MAX_SPEED_PX_PER_FRAME = 24; // Cap speed to prevent boundary skipping (~1440px/sec)
    const DEAD_ZONE_PX = 10; // Neutral resting zone around initial click point

    const handleMouseDown = (e: MouseEvent) => {
      // Button 1 is mouse middle button / wheel click
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();

        if (isAutoScrolling) {
          stopAutoScroll();
          return;
        }

        isAutoScrolling = true;
        startY = e.clientY;
        currentY = e.clientY;
        document.body.style.cursor = "ns-resize";

        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        window.addEventListener("mousedown", handleGlobalClick, true);
        window.addEventListener("mouseup", handleMouseUp, true);
        window.addEventListener("wheel", handleWheelInterrupt, { passive: true });

        const step = () => {
          if (!isAutoScrolling || !container) return;
          const diff = currentY - startY;

          if (Math.abs(diff) > DEAD_ZONE_PX) {
            const direction = diff > 0 ? 1 : -1;
            const distance = Math.abs(diff) - DEAD_ZONE_PX;
            // Progressive quadratic scaling with hard max limit
            const speed = Math.min(MAX_SPEED_PX_PER_FRAME, Math.pow(distance / 20, 1.4));
            container.scrollTop += direction * speed;
          }

          animFrameId = requestAnimationFrame(step);
        };

        animFrameId = requestAnimationFrame(step);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isAutoScrolling) {
        currentY = e.clientY;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // If user dragged a significant distance and released mouse, stop autoscroll
      if (isAutoScrolling && Math.abs(e.clientY - startY) > 25) {
        stopAutoScroll();
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      if (isAutoScrolling && e.button !== 1) {
        stopAutoScroll();
      }
    };

    const handleWheelInterrupt = () => {
      if (isAutoScrolling) {
        stopAutoScroll();
      }
    };

    const stopAutoScroll = () => {
      if (!isAutoScrolling) return;
      isAutoScrolling = false;
      document.body.style.cursor = "";
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleGlobalClick, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
      window.removeEventListener("wheel", handleWheelInterrupt);
    };

    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      stopAutoScroll();
      container.removeEventListener("mousedown", handleMouseDown);
    };
  }, [selectedChatId]);

  const triggerMediaViewportBuffering = () => {
    if (!selectedChatId || !chatBodyScrollRef.current) return;

    const { scrollTop, scrollHeight } = chatBodyScrollRef.current;
    if (scrollHeight <= 0) return;

    const totalItems = computedMessages.length;
    if (totalItems === 0) return;

    // Fast and efficient scroll-to-index calculation
    const averageItemHeight = scrollHeight / totalItems;
    const activeIndex = Math.floor(scrollTop / averageItemHeight);

    // Forward range: approximately 300-500 messages (using 400)
    // Backward range: around 100-200 messages (using 150)
    const forwardCount = 400;
    const backwardCount = 150;

    const startIdx = Math.max(0, activeIndex - backwardCount);
    const endIdx = Math.min(totalItems, activeIndex + forwardCount);

    const viewportMessages = computedMessages.slice(startIdx, endIdx);
    const mediaToPrefetch = viewportMessages.filter(
      (msg) => msg.isMedia || msg.type !== "text"
    );

    mediaToPrefetch.forEach((msg) => {
      const targetUrl = msg.mediaUrl || (msg.driveFileId ? `/api/drive/files/${msg.driveFileId}` : undefined);
      if (!targetUrl) return;

      if (!prefetchedUrlsRef.current.has(targetUrl)) {
        prefetchedUrlsRef.current.add(targetUrl);
        prefetchAuthenticatedMedia(msg.mediaUrl, msg.driveFileId);
      }
    });
  };

  const handleScroll = () => {
    if (chatBodyScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyScrollRef.current;

      // Track active chat's scroll position in memory for instant reopen restore (ignore initial reset during restoration)
      if (selectedChatId && !isRestoringScrollRef.current) {
        chatScrollPositionsRef.current.set(selectedChatId, scrollTop);
      }

      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // Fixed threshold: button shows when scrolled up by >50px (approx 4-5 messages)
      const isScrolledUp = distanceFromBottom > 50;
      setShowScrollBottomBtn(isScrolledUp);

      if (!isScrolledUp) {
        if (scrollToBottomTimeoutRef.current) {
          clearTimeout(scrollToBottomTimeoutRef.current);
          scrollToBottomTimeoutRef.current = null;
        }
        setIsScrollingToBottom(false);
      }

      const currentSelectedChat = chats.find((c) => c.id === selectedChatId);
      const isV3Chat = !!currentSelectedChat?.driveFolderId;

      if (isV3Chat) {
        // Continuous sliding window engine (Section 6 & 7)
        const container = chatBodyScrollRef.current;
        let activeSeqIndex: number | undefined = undefined;

        if (container && computedMessages.length > 0) {
          // Accurate sequence index lookup from the top-most visible message in container
          const children = container.children;
          for (let i = 0; i < children.length; i++) {
            const el = children[i] as HTMLElement;
            if (el && el.offsetTop + el.offsetHeight >= scrollTop) {
              const seqAttr = el.getAttribute("data-sequence-index");
              if (seqAttr !== null) {
                const parsed = parseInt(seqAttr, 10);
                if (!isNaN(parsed)) {
                  activeSeqIndex = parsed;
                  break;
                }
              }
            }
          }

          // Fallback to proportional estimate if DOM lookup doesn't find attribute
          if (activeSeqIndex === undefined) {
            const approxIndex = Math.min(
              computedMessages.length - 1,
              Math.max(0, Math.floor((scrollTop / Math.max(1, scrollHeight)) * computedMessages.length))
            );
            activeSeqIndex = computedMessages[approxIndex]?.sequenceIndex;
          }

          if (activeSeqIndex !== undefined) {
            v3ContinuousScrollManagerInstance.handleScrollPosition(
              activeSeqIndex,
              (updatedMessages) => {
                // Scroll anchoring: preserve visual position during bidirectional batch prepends
                const anchorSeq = activeSeqIndex;
                const anchorEl = anchorSeq !== undefined ? (container.querySelector(`[data-sequence-index="${anchorSeq}"]`) as HTMLElement) : null;
                const anchorOffsetTop = anchorEl ? anchorEl.offsetTop - container.scrollTop : null;

                const mapped: ParsedMessage[] = updatedMessages.map((m) => ({
                  id: m.id,
                  sender: m.sender,
                  senderName: m.senderName,
                  text: m.text,
                  time: m.time || "12:00 PM",
                  type: m.type as any,
                  isMedia: m.type !== "text",
                  mediaFileName: m.mediaFileName,
                  mediaUrl: m.driveFileId ? `/api/drive/files/${m.driveFileId}` : undefined,
                  caption: m.caption,
                  duration: m.duration,
                  driveFileId: m.driveFileId,
                  timestamp: m.timestamp,
                  sequenceIndex: m.sequenceIndex,
                }));

                setChats((prev) =>
                  prev.map((c) =>
                    c.id === selectedChatId
                      ? { ...c, messages: mapped }
                      : c
                  )
                );

                if (anchorOffsetTop !== null && anchorSeq !== undefined) {
                  requestAnimationFrame(() => {
                    const newAnchorEl = container.querySelector(`[data-sequence-index="${anchorSeq}"]`) as HTMLElement;
                    if (newAnchorEl) {
                      container.scrollTop = newAnchorEl.offsetTop - anchorOffsetTop;
                    }
                  });
                }
              }
            );
          }
        }
      } else {
        if (isScrollingToBottomRef.current) {
          checkAndFinishScrollToBottom();
        } else {
          checkAndTriggerBoundaries();
        }
      }

      // Debounced background media preloading on scroll
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
      scrollDebounceTimerRef.current = setTimeout(() => {
        triggerMediaViewportBuffering();
      }, 150);
    }
  };

  interface GroupedMessage extends ParsedMessage {
    showSenderHeader: boolean;
    showDateSeparator: boolean;
    dateHeaderLabel: string;
  }

  const computedMessages = useMemo(() => {
    if (!selectedChatId) return [];
    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat || !chat.messages) return [];

    const list: GroupedMessage[] = [];
    let prevMsg: ParsedMessage | null = null;

    chat.messages.forEach((msg) => {
      let showSenderHeader = true;
      let showDateSeparator = false;
      let dateHeaderLabel = "";

      let formattedDate = "Today";
      let msgDate = new Date();

      if (msg.timestamp) {
        const d = new Date(msg.timestamp);
        if (!isNaN(d.getTime())) {
          msgDate = d;
          formattedDate = formatSeparatorDate(msg.timestamp);
        }
      } else if (msg.time) {
        formattedDate = formatSeparatorDate(msg.id.split("-")[0] || null);
      }

      if (prevMsg) {
        let prevFormattedDate = "Today";
        let prevMsgDate = new Date();

        if (prevMsg.timestamp) {
          const pd = new Date(prevMsg.timestamp);
          if (!isNaN(pd.getTime())) {
            prevMsgDate = pd;
            prevFormattedDate = formatSeparatorDate(prevMsg.timestamp);
          }
        } else if (prevMsg.time) {
          prevFormattedDate = formatSeparatorDate(prevMsg.id.split("-")[0] || null);
        }

        // Check Date Separator
        if (formattedDate !== prevFormattedDate) {
          showDateSeparator = true;
          dateHeaderLabel = formattedDate;
        }

        // Check Sender Grouping within 2 minutes
        const timeDiff = Math.abs(msgDate.getTime() - prevMsgDate.getTime());
        const sameSender = msg.senderName === prevMsg.senderName && msg.sender === prevMsg.sender;
        if (sameSender && timeDiff <= 2 * 60 * 1000 && !showDateSeparator) {
          showSenderHeader = false;
        }
      } else {
        showDateSeparator = true;
        dateHeaderLabel = formattedDate;
      }

      list.push({
        ...msg,
        showSenderHeader,
        showDateSeparator,
        dateHeaderLabel,
      });

      prevMsg = msg;
    });

    return list;
  }, [selectedChatId, chats]);

  // Set max-height on the sidebar container on Desktop to freeze at exactly 3 items if more than 3 exist
  useEffect(() => {
    const updateSidebarHeight = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setSidebarMaxHeight("none");
        return;
      }

      if (filteredChats.length <= 3) {
        setSidebarMaxHeight("none");
        return;
      }

      const container = document.getElementById("chats-sidebar-container");
      if (container) {
        const cardChildren = Array.from(container.querySelectorAll(".chat-card-item")) as HTMLElement[];
        if (cardChildren.length >= 3) {
          const firstThree = cardChildren.slice(0, 3);
          const totalHeight = firstThree.reduce((acc, child) => acc + child.offsetHeight, 0);
          const gapHeight = 2 * 10; // gap space-y-2.5 is 10px (2 gaps for 3 items)
          setSidebarMaxHeight(totalHeight + gapHeight);
          return;
        }
      }
      setSidebarMaxHeight(320);
    };

    const timer = setTimeout(updateSidebarHeight, 30);
    return () => clearTimeout(timer);
  }, [filteredChats.length, chats.length, isMobileOrTablet]);

  // Handle resizing of the chat viewer wrapper relative to Left Column height
  useEffect(() => {
    const handleResize = () => {
      if (leftColumnRef.current) {
        const h = leftColumnRef.current.offsetHeight;
        if (h > 0) {
          setLeftColumnHeight(h);
        }
      }
      setIsMobileOrTablet(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    let observer: ResizeObserver | null = null;
    if (leftColumnRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(leftColumnRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
    };
  }, [chats, filteredChats, sidebarMaxHeight, isChatsLoading]);

  // Lock body scroll when page-level global modals or fullscreen are active
  useEffect(() => {
    const isGlobalModalActive = isCreateModalOpen || showSignInModal || chatIdToDelete !== null || showDrivePrePrompt || showReplaceZipModal || showSafeCloseModal || showImportInProgressWarningModal || newlyImportedChatForPrompt !== null;
    if (isFullscreen || isGlobalModalActive) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isFullscreen, isCreateModalOpen, showSignInModal, chatIdToDelete, showDrivePrePrompt, showReplaceZipModal, showSafeCloseModal, showImportInProgressWarningModal, newlyImportedChatForPrompt]);

  // Lifecycle & Session Eviction (V3 Architecture Sections 7, 8, 9)
  // CASE 1: On fresh page load / hard reload / new session, evict temporary IndexedDB message caches
  useEffect(() => {
    (async () => {
      try {
        console.log("[ToolsPage] Session start: Initializing fresh session & clearing stale temporary IndexedDB data");
        await v3IndexedDBManagerInstance.clearAllSessionData();
      } catch (err) {
        console.warn("[ToolsPage] Session start eviction notice:", err);
      }
    })();
  }, []);

  // Security Phase 3: Warn user before tab close/refresh if operation running or unsaved data exists
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isImporting || isDeletingChat || (isCreateModalOpen && (chatName.trim() || uploadedFile))) {
        e.preventDefault();
        e.returnValue = "An operation is currently in progress or unsaved form data exists. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isImporting, isDeletingChat, isCreateModalOpen, chatName, uploadedFile]);

  // Sign-In trigger popup prompt for guest sessions
  useEffect(() => {
    const hasDismissed = sessionStorage.getItem("tools_auth_modal_dismissed");
    if (!googleUser && !hasDismissed) {
      const timer = setTimeout(() => {
        setShowSignInModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [googleUser]);

  // Scroll behaviors
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const handleChatScroll = () => {
    if (chatBodyScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyScrollRef.current;
      const isFar = scrollHeight - scrollTop - clientHeight > 150;
      setShowScrollToBottom(isFar);
    }
  };

  const handleScrollToBottom = () => {
    if (chatBodyScrollRef.current) {
      chatBodyScrollRef.current.scrollTo({
        top: chatBodyScrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (scrollToBottomTimeoutRef.current) {
      clearTimeout(scrollToBottomTimeoutRef.current);
      scrollToBottomTimeoutRef.current = null;
    }
    setIsScrollingToBottom(false);
    setIsLoadingNextWindow(false);
    setIsLoadingPreviousWindow(false);
    setShowScrollToBottom(false);
  }, [selectedChatId]);

  // Security Phase 3: ZIP Replacement & Verification Helper
  const processZipSelection = async (file: File) => {
    const val = await v3ImportOrchestratorInstance.validateWhatsAppZip(file);
    if (!val.isValid) {
      addToast(val.error || "Invalid WhatsApp Backup ZIP", "error");
      setUploadedFile(null);
      return;
    }
    setUploadedFile(file);
    addToast("WhatsApp Backup Verified", "success");
    await checkDriveStatus();
  };

  const handleConfirmReplaceZip = async () => {
    if (!pendingZipFile) return;
    const fileToProcess = pendingZipFile;
    setPendingZipFile(null);
    setShowReplaceZipModal(false);
    await processZipSelection(fileToProcess);
  };

  const handleCancelReplaceZip = () => {
    setPendingZipFile(null);
    setShowReplaceZipModal(false);
  };

  // File drag & drop static visual support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (isImporting || isDeletingChat) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith(".zip")) {
        if (uploadedFile) {
          setPendingZipFile(file);
          setShowReplaceZipModal(true);
          return;
        }
        await processZipSelection(file);
      } else {
        addToast("Invalid WhatsApp Backup ZIP", "error");
        setUploadedFile(null);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImporting || isDeletingChat) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.toLowerCase().endsWith(".zip")) {
        if (uploadedFile) {
          setPendingZipFile(file);
          setShowReplaceZipModal(true);
          if (e.target) e.target.value = "";
          return;
        }
        await processZipSelection(file);
      } else {
        addToast("Invalid WhatsApp Backup ZIP", "error");
        setUploadedFile(null);
        if (e.target) e.target.value = "";
      }
    }
  };


  const getAuthHeaders = async (): Promise<Record<string, string>> => {
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
        console.warn("[ToolsPage] Failed to obtain Firebase ID token:", err);
      }
    }
    return headers;
  };

  const checkDriveStatus = async () => {
    setIsDriveChecking(true);
    setDriveCheckingError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl("/api/auth/status"), { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && result.data) {
        const authorized = result.data.authorized;
        setIsDriveAuthorized(authorized);
        if (!authorized) {
          setShowDrivePrePrompt(true);
        }
      } else {
        throw new Error("Invalid response format from status endpoint");
      }
    } catch (err: any) {
      console.error("[ToolsPage] Failed to check Google Drive authorization:", err);
      setIsDriveAuthorized(false);
      setDriveCheckingError(err?.message || "Failed to check Google Drive status");
      setShowDrivePrePrompt(true);
    } finally {
      setIsDriveChecking(false);
    }
  };

  const handleStartOAuthFlow = async () => {
    setIsOAuthProcessing(true);
    setOauthError(null);
    addToast("Requesting Google authorization secure link...", "instruction");

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl("/api/auth/google/url"), { headers });
      if (!response.ok) {
        throw new Error(`Failed to retrieve OAuth URL (HTTP ${response.status})`);
      }
      const result = await response.json();
      if (!result.success || !result.data?.authUrl) {
        throw new Error(result.error?.message || "Invalid Google Auth URL response");
      }

      const authUrl = result.data.authUrl;
      const googleEmail = googleUser?.email;
      let finalUrl = authUrl;

      if (googleEmail) {
        try {
          const urlObj = new URL(authUrl);
          urlObj.searchParams.set("login_hint", googleEmail);
          finalUrl = urlObj.toString();
        } catch (e) {
          console.warn("[ToolsPage] Failed to parse authUrl, using default", e);
        }
      }

      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        finalUrl,
        "google_oauth_popup",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup) {
        throw new Error("Popup was blocked. Please allow popups to link Google Drive.");
      }

      let popupClosedInterval: NodeJS.Timeout | null = null;
      let messageListener: ((e: MessageEvent) => void) | null = null;

      const cleanup = () => {
        if (popupClosedInterval) clearInterval(popupClosedInterval);
        if (messageListener) window.removeEventListener("message", messageListener);
      };

      const verifyAndComplete = async () => {
        cleanup();
        addToast("Verifying Google Drive authorization status...", "instruction");
        
        try {
          const statusHeaders = await getAuthHeaders();
          const verifyResponse = await fetch(getApiUrl("/api/auth/status"), { headers: statusHeaders });
          if (!verifyResponse.ok) {
            throw new Error(`Verification endpoint failed with HTTP ${verifyResponse.status}`);
          }
          const verifyResult = await verifyResponse.json();
          if (verifyResult.success && verifyResult.data?.authorized) {
            setIsDriveAuthorized(true);
            setShowDrivePrePrompt(false);
            addToast("Google Drive successfully linked and verified!", "success");
            setIsOAuthProcessing(false);
          } else {
            throw new Error("Google Drive is not yet authorized or token exchange failed.");
          }
        } catch (err: any) {
          console.error("[ToolsPage] OAuth verification failed:", err);
          setOauthError(err?.message || "Google Drive verification failed.");
          setIsDriveAuthorized(false);
          setIsOAuthProcessing(false);
        }
      };

      messageListener = (event: MessageEvent) => {
        const origin = event.origin;
        let backendOrigin = "";
        try {
          const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL;
          if (backendUrl) {
            backendOrigin = new URL(backendUrl).origin;
          }
        } catch (e) {}

        const isValidOrigin = 
          origin.endsWith(".run.app") || 
          origin.includes("localhost") || 
          origin.includes("127.0.0.1") ||
          origin.endsWith(".onrender.com") ||
          origin.includes("suhebdev.rf.gd") ||
          origin === window.location.origin ||
          (backendOrigin && origin === backendOrigin);

        if (!isValidOrigin) {
          return;
        }

        if (event.data?.type === "OAUTH_SUCCESS" || event.data?.type === "OAUTH_AUTH_SUCCESS") {
          verifyAndComplete();
        } else if (event.data?.type === "OAUTH_FAILURE") {
          cleanup();
          setOauthError(event.data?.error || "Authorization cancelled or failed.");
          setIsDriveAuthorized(false);
          setIsOAuthProcessing(false);
        }
      };

      window.addEventListener("message", messageListener);

      popupClosedInterval = setInterval(() => {
        if (popup.closed) {
          setTimeout(async () => {
            try {
              const statusHeaders = await getAuthHeaders();
              const verifyResponse = await fetch(getApiUrl("/api/auth/status"), { headers: statusHeaders });
              const verifyResult = await verifyResponse.json();
              if (verifyResult.success && verifyResult.data?.authorized) {
                verifyAndComplete();
              } else {
                cleanup();
                setOauthError("Popup was closed before completing authorization.");
                setIsDriveAuthorized(false);
                setIsOAuthProcessing(false);
              }
            } catch (e) {
              cleanup();
              setOauthError("Popup closed and verification failed.");
              setIsDriveAuthorized(false);
              setIsOAuthProcessing(false);
            }
          }, 1500);
        }
      }, 1000);

    } catch (err: any) {
      console.error("[ToolsPage] OAuth request failed:", err);
      setOauthError(err?.message || "Failed to start Google Drive authorization flow.");
      setIsDriveAuthorized(false);
      setIsOAuthProcessing(false);
    }
  };

  const handleImportSuccess = (result: any) => {
    if (!isMountedRef.current) return;

    const finalRes = result as any;
    const chatId = finalRes?.chat?.id;

    // Prevent duplicate processing if already handled for this chat
    if (chatId && lastHandledImportIdRef.current === chatId) {
      return;
    }
    if (chatId) {
      lastHandledImportIdRef.current = chatId;
    }

    const isInstant = result && result.isInstantView;

    // 1. Set progress and status based on isInstant mode
    if (isInstant) {
      // For Instant View: do NOT show completed state because media is still uploading in the background.
      // Immediately close the modal.
      setIsImporting(false);
      setCanInstantView(false);
      setIsCreateModalOpen(false);
    } else {
      // Normal full completion: show the completion status card in the modal and success toast
      setImportProgress({
        stage: "completed",
        progress: 100,
        label: "Import Successful",
        message: "WhatsApp Chat Archive has been successfully parsed and saved."
      });
      setImportSuccess(true);
      setIsImporting(false);
      setCanInstantView(false);
      addToast("Import completed successfully!", "success");
    }

    // 2. Extract final chat session
    let newlyCreatedChatSession: ChatSession | null = null;
    if (finalRes && finalRes.chat) {
      const newChatSession: ChatSession = {
        id: finalRes.chat.id,
        name: chatName.trim() || finalRes.chat.name || "Imported Chat",
        date: formatSeparatorDate(finalRes.chat.createdAt),
        fileName: uploadedFile ? uploadedFile.name : (partialImportResult?.fileName || "Imported Chat"),
        myIdentity: finalRes.chat.myIdentity,
        otherIdentity: finalRes.chat.otherIdentity,
        lastMessage: finalRes.messages?.[finalRes.messages.length - 1]?.text || "No messages",
        messages: finalRes.messages,
        totalMessageCount: finalRes.chat.totalMessageCount ?? finalRes.chat.messageCount ?? finalRes.messages?.length ?? 0,
        messageCount: finalRes.chat.messageCount ?? finalRes.chat.totalMessageCount ?? finalRes.messages?.length ?? 0,
        createdAt: finalRes.chat.createdAt || new Date().toISOString(),
        createdTime: getFormattedCreationTime(finalRes.chat.createdAt),
        driveFolderId: finalRes.chat.driveFolderId,
      };
      newlyCreatedChatSession = newChatSession;

      // Add to sidebar chats list (DEDUPLICATED BY ID)
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== newChatSession.id);
        return [newChatSession, ...filtered];
      });

      // ONLY for Instant View: auto-open the chat immediately without prompt modal
      if (isInstant) {
        setSelectedChatId(newChatSession.id);
      }

      // Scroll the sidebar so the newly imported chat is visible if necessary.
      setTimeout(() => {
        const container = document.getElementById("chats-sidebar-container");
        if (container) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
    }

    // 3. Reset import states
    const resetDelay = isInstant ? 50 : 1200;
    setTimeout(() => {
      if (!isMountedRef.current) return;

      if (!isInstant) {
        setIsCreateModalOpen(false);
        // Show prompt modal for newly imported chat in normal flow
        if (newlyCreatedChatSession) {
          setNewlyImportedChatForPrompt(newlyCreatedChatSession);
        }
      }

      // Reset temporary import form state
      setUploadedFile(null);
      setChatName("");
      setPartialImportResult(null);
      setSelectedMyIdentity(null);
      setImportError(null);
      setImportSuccess(false);
      setImportProgress(null);
      setCanInstantView(false);
      lastHandledImportIdRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Reset progress callback
      v3ImportOrchestratorInstance.setProgressCallback(null);
      
      // Clear execution lock
      isProcessingImportRef.current = false;
    }, resetDelay);
  };

  const handleInstantViewClick = async () => {
    if (!canInstantView || isTriggeringInstantView) return;
    try {
      setIsTriggeringInstantView(true);
      // 1. Toast fires immediately
      addToast("Preparing Instant View... Finalizing chat preview.", "instruction");

      // 2. Pause media uploads and await Firestore session persistence
      const result = await v3ImportOrchestratorInstance.triggerInstantView();

      // 3. Close the modal cleanly
      setIsCreateModalOpen(false);
      setIsTriggeringInstantView(false);
      setCanInstantView(false);

      // 4. Open chat session into viewer (which shows standard spinner and loading screen)
      if (result && isMountedRef.current) {
        handleImportSuccess(result);
      }
    } catch (err: any) {
      console.error("[ToolsPage] Instant View trigger error:", err);
      addToast(`Instant View error: ${err?.message || "Failed to open chat"}`, "error");
      setIsTriggeringInstantView(false);
      v3ImportOrchestratorInstance.resumeMediaUploads();
    }
  };

  const handleStartImport = async () => {
    if (isProcessingImportRef.current || isImporting) return;
    if (!uploadedFile) {
      addToast("Please upload a valid .zip WhatsApp archive", "error");
      return;
    }

    isProcessingImportRef.current = true;
    setIsImporting(true);
    setCanInstantView(false);
    setImportError(null);
    setImportSuccess(false);
    setPartialImportResult(null);

    v3ImportOrchestratorInstance.setProgressCallback((stage, progress, label, message) => {
      if (isMountedRef.current) {
        setImportProgress({
          stage: stage as any,
          progress,
          label,
          message,
        });
      }
    });

    try {
      const result = await v3ImportOrchestratorInstance.startImport(uploadedFile, chatName);
      if (!isMountedRef.current) return;

      if ("requiresIdentitySelection" in result && result.requiresIdentitySelection) {
        setPartialImportResult(result);
        addToast("Identity resolution requires manual selection.", "instruction");
        isProcessingImportRef.current = false;
        setIsImporting(false);
      } else {
        handleImportSuccess(result);
      }
    } catch (err: any) {
      console.error("[ToolsPage] Import pipeline failed:", err);
      if (isMountedRef.current) {
        const errMsg = err?.message || "An unexpected error occurred during import.";
        setImportError(errMsg);
        addToast(`Import failed: ${errMsg}`, "error");
        setIsImporting(false);
        setCanInstantView(false);
      }
      isProcessingImportRef.current = false;
    }
  };

  const handleContinueImport = async () => {
    if (isProcessingImportRef.current || isImporting) return;
    if (!partialImportResult || !selectedMyIdentity) {
      addToast("Please select your identity to continue.", "error");
      return;
    }

    isProcessingImportRef.current = true;
    setIsImporting(true);
    setCanInstantView(false);
    setImportError(null);
    setImportSuccess(false);

    try {
      const result = await v3ImportOrchestratorInstance.completeImport(
        partialImportResult,
        selectedMyIdentity,
        chatName
      );
      if (!isMountedRef.current) return;

      handleImportSuccess(result);
    } catch (err: any) {
      console.error("[ToolsPage] Resuming import pipeline failed:", err);
      if (isMountedRef.current) {
        const errMsg = err?.message || "An unexpected error occurred while resuming import.";
        setImportError(errMsg);
        addToast(`Import resume failed: ${errMsg}`, "error");
        setIsImporting(false);
        setCanInstantView(false);
      }
      isProcessingImportRef.current = false;
    }
  };

  const handleCancelImport = () => {
    if (isImporting) return;
    
    // Clear selected identity, partialImportResult, progress subscription, temporary import state
    setSelectedMyIdentity(null);
    setPartialImportResult(null);
    setImportProgress(null);
    setImportSuccess(false);
    setImportError(null);
    setUploadedFile(null);
    setChatName("");
    setCanInstantView(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Reset Drive auth state
    setIsDriveAuthorized(null);
    setOauthError(null);
    setIsOAuthProcessing(false);
    setShowDrivePrePrompt(false);

    v3ImportOrchestratorInstance.setProgressCallback(null);
    isProcessingImportRef.current = false;
  };

  const handleCloseCreateModalDirect = () => {
    setIsCreateModalOpen(false);
    setShowSafeCloseModal(false);
    setShowImportInProgressWarningModal(false);
    setChatName("");
    setUploadedFile(null);
    setPendingZipFile(null);
    setShowReplaceZipModal(false);
    setImportProgress(null);
    setImportSuccess(false);
    setImportError(null);
    setPartialImportResult(null);
    setSelectedMyIdentity(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Reset Drive auth state
    setIsDriveAuthorized(null);
    setOauthError(null);
    setIsOAuthProcessing(false);
    setShowDrivePrePrompt(false);

    v3ImportOrchestratorInstance.setProgressCallback(null);
    isProcessingImportRef.current = false;
  };

  const handleCloseCreateModal = () => {
    if (isImporting || isProcessingImportRef.current) {
      setShowImportInProgressWarningModal(true);
      return;
    }
    if (chatName.trim() || uploadedFile) {
      setShowSafeCloseModal(true);
      return;
    }
    handleCloseCreateModalDirect();
  };


  const handleSaveChat = () => {
    addToast("Real database save and index pipelines are suspended for Version 2 transition.", "instruction");
    setIsCreateModalOpen(false);
    setChatName("");
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const dismissSignInModal = () => {
    setShowSignInModal(false);
    try {
      sessionStorage.setItem("tools_auth_modal_dismissed", "true");
    } catch (e) {
      console.error("Failed to write to sessionStorage:", e);
    }
  };

  const triggerGoogleLoginFromPopup = () => {
    setShowSignInModal(false);
    try {
      sessionStorage.setItem("tools_auth_modal_dismissed", "true");
    } catch (e) {
      console.error("Failed to write to sessionStorage:", e);
    }
    onGoogleLogin();
  };

  const handleOpenCreateModal = () => {
    if (isImporting || isDeletingChat) {
      addToast("An operation is currently in progress. Please wait.", "error");
      return;
    }
    if (!googleUser) {
      addToast("You must sign in with Google to use this tool.", "error");
      return;
    }
    setIsCreateModalOpen(true);
  };

  const isAnyModalActive = isCreateModalOpen || showSignInModal || chatIdToDelete !== null || showDrivePrePrompt || showReplaceZipModal || showSafeCloseModal || showImportInProgressWarningModal || newlyImportedChatForPrompt !== null;

  const handleRequestCloseChat = () => {
    setShowCloseChatConfirmModal(true);
  };

  const handleConfirmCloseChat = () => {
    setShowCloseChatConfirmModal(false);
    if (selectedChatId) {
      // Evict active chat messages from memory completely
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChatId ? { ...c, messages: [] } : c
        )
      );
    }
    v3ContinuousScrollManagerInstance.clearMemory();
    mediaMapManagerInstance.clearActiveChatMap();
    setSelectedChatId(null);
    setIsFullscreen(false);
    previousActiveChatIdRef.current = null;
    chatScrollPositionsRef.current.clear();
    loadedMessagesMapRef.current.clear();
    isFetchingRangeRef.current.clear();
    lastRequestedRangeRef.current = null;
  };

  const renderChatHeader = (chat: ChatSession) => {
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-neutral-900 text-white select-none relative z-10 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          {isMobileOrTablet && (
            <button 
              onClick={handleRequestCloseChat} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors mr-1 cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div className={`w-9 h-9 rounded-full border border-white/10 grid place-items-center font-bold text-xs font-sans shrink-0 select-none shadow-2xs ${getAvatarBgColor(chat.name)}`}>
            <span className="leading-none flex items-center justify-center -mt-[0.5px]">{getInitials(chat.name)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold truncate tracking-tight">{chat.name}</h3>
              {bgUploadStatus && bgUploadStatus.isUploading && bgUploadStatus.chatId === chat.id && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[9px] font-mono tracking-tight shrink-0 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-400" />
                  <span>Media Syncing ({bgUploadStatus.completedMedia}/{bgUploadStatus.totalMedia})</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-neutral-300 font-mono mt-0.5 truncate">
              {(
                chat.totalMessageCount ??
                chat.messageCount ??
                chat.messages?.length ??
                0
              ).toLocaleString()} message(s) • {chat.fileName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Drive Folder Link (if exists) */}
          {chat.driveFolderId && (
            <a 
              href={`https://drive.google.com/drive/folders/${chat.driveFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Open Google Drive Folder"
            >
              <FolderOpen className="w-4 h-4" />
            </a>
          )}

          {/* Fullscreen toggle (Desktop only) */}
          {!isMobileOrTablet && (
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chat"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close/Deselect Chat Button */}
          <button 
            onClick={handleRequestCloseChat} 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderChatPreviewBody = () => {
    if (!selectedChatId) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-neutral-50/50 text-center relative select-none h-full min-h-0">
          <div className="absolute inset-0 bg-radial-gradient from-indigo-50/10 via-transparent to-transparent pointer-events-none opacity-60" />
          
          <div className="relative z-10 space-y-5 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
              <MessageCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-800 uppercase font-mono tracking-wider">No Chat Selected</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                Left sidebar se kisi chat card par click karein ya fir **"+ New Chat"** dabakar WhatsApp `.zip` file upload karein.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleOpenCreateModal}
                disabled={isImporting}
                className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New WhatsApp .zip</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isLoadingMessages) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-neutral-50/50 text-center select-none h-full min-h-0">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-500 font-medium">Loading conversation messages...</p>
        </div>
      );
    }

    const chat = chats.find(c => c.id === selectedChatId);
    if (!chat || chat.messages === undefined) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-neutral-50/50 text-center select-none h-full min-h-0">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-500 font-medium">Loading conversation messages...</p>
        </div>
      );
    }

    const messagesList = computedMessages;

    if (!messagesList || messagesList.length === 0) {
      return (
        <div className="flex-grow flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
          {/* Header */}
          {renderChatHeader(chat)}
          
          <div className="flex-grow relative overflow-hidden flex flex-col">
            <WhatsAppBackgroundTexture />
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center select-none relative z-10">
              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-neutral-200/50 max-w-xs space-y-1">
                <MessageSquare className="w-6 h-6 text-neutral-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-neutral-700">No Messages Extracted</p>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  We couldn't extract any valid text messages from this chat log.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-grow flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
        {/* Chat Header */}
        {renderChatHeader(chat)}

        {/* Custom background texture */}
        <WhatsAppBackgroundTexture />

        {/* Messages Scroll Area */}
        <div 
          ref={chatBodyScrollRef}
          onScroll={handleScroll}
          className={`flex-grow overflow-y-auto px-4 sm:px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-2.5 relative z-10 chat-scrollbar ${showCloseChatConfirmModal ? "pointer-events-none select-none" : ""} ${isAnyModalActive ? "pointer-events-none" : ""}`}
          style={{ backgroundColor: "transparent" }}
        >
          {/* Upward window batch loading indicator */}
          {isLoadingPreviousWindow && (
            <div className="w-full flex justify-center py-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 px-4 py-2 shadow-sm backdrop-blur-xs text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span>⏳ Loading previous chats...</span>
              </div>
            </div>
          )}

          {messagesList.map((rawMsg) => {
            let msg = rawMsg;
            if (msg.type === "text" && msg.text) {
              const cleanT = msg.text.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").trim();
              const attachMatch = cleanT.match(/^([^\n\r]+?)\s*(?:\(file attached\)|\(archivo adjunto\)|\(arquivo anexado\)|\(Datei angehängt\)|\(fichier joint\)|\(file allegato\)|\(файл вложен\))|<attached:\s*([^>]+)>/i);
              if (attachMatch) {
                const rawFileName = (attachMatch[1] || attachMatch[2] || "").trim();
                const cleanFileName = rawFileName
                  .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
                  .replace(/\.+$/, "")
                  .trim();
                const ext = cleanFileName.split(".").pop()?.toLowerCase() || "";
                const baseName = cleanFileName.replace(/\.[a-zA-Z0-9]+$/, "").toLowerCase();
                let inferredType: "audio" | "image" | "video" | "document" | "sticker" = "document";
                if (["opus", "mp3", "ogg", "m4a", "wav", "aac", "amr", "flac"].includes(ext) || baseName.startsWith("aud-") || baseName.startsWith("ptt-") || cleanFileName.toLowerCase().includes("audio")) {
                  inferredType = "audio";
                } else if (["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp", "avif"].includes(ext) || baseName.startsWith("img-")) {
                  inferredType = "image";
                } else if (["mp4", "mov", "3gp", "mkv", "avi", "webm", "m4v"].includes(ext) || baseName.startsWith("vid-")) {
                  inferredType = "video";
                } else if (baseName.startsWith("stk-") || cleanFileName.toLowerCase().includes("sticker")) {
                  inferredType = "sticker";
                }
                msg = {
                  ...msg,
                  type: inferredType,
                  mediaFileName: msg.mediaFileName || cleanFileName,
                };
              }
            }

            const isMe = msg.sender === "me";
            const isMediaBubble = (msg.type === "image" || msg.type === "video" || msg.type === "sticker") && !msg.isViewOnce && !msg.isMediaOmitted;

            // Prepare media URL if it is media
            let mediaUrl: string | undefined = undefined;
            if (msg.mediaUrl) {
              mediaUrl = msg.mediaUrl;
            } else if (msg.driveFileId) {
              mediaUrl = `/api/drive/files/${msg.driveFileId}`;
            } else if (msg.mediaFileName) {
              const cleanFn = msg.mediaFileName.replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "").replace(/\.+$/, "").trim();
              const resolvedDriveId = mediaMapManagerInstance.getDriveFileId(cleanFn) || mediaMapManagerInstance.getDriveFileId(msg.mediaFileName);
              if (resolvedDriveId) {
                mediaUrl = `/api/drive/files/${resolvedDriveId}`;
              } else {
                const cachedUrl =
                  mediaCacheManagerInstance.getActiveUrl(`${chat.id}_${msg.mediaFileName}`) ||
                  mediaCacheManagerInstance.getActiveUrl(`${chat.id}_${cleanFn}`) ||
                  mediaCacheManagerInstance.getActiveUrl(msg.mediaFileName) ||
                  mediaCacheManagerInstance.getActiveUrl(cleanFn);
                if (cachedUrl) {
                  mediaUrl = cachedUrl;
                }
              }
            }

            return (
              <div 
                key={msg.id}
                data-message-id={msg.id}
                data-sequence-index={msg.sequenceIndex}
                className="relative group isolate [contain:paint] [transform:translateZ(0)]"
              >

                {/* Date separator rendering */}
                {msg.showDateSeparator && (
                  <div className="flex justify-center my-4 select-none w-full">
                    <span className="bg-[#ffefd5] text-[10px] font-bold text-neutral-700 px-3.5 py-1 rounded-md border border-amber-200/60 shadow-2xs uppercase tracking-wider font-mono">
                      {msg.dateHeaderLabel}
                    </span>
                  </div>
                )}

                {/* System message rendering */}
                {msg.sender === "system" || msg.senderName === "system" || msg.senderName === "System" ? (
                  <div className="flex justify-center my-2 select-none w-full">
                    <span className="bg-[#ffefd5] text-[10.5px] font-medium text-neutral-800 px-3.5 py-1.5 rounded-md border border-amber-200/60 text-center shadow-2xs max-w-md">
                      <BeautifulEmojiText text={msg.text} />
                    </span>
                  </div>
                ) : (
                  /* Standard message bubbles layout */
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"} w-full ${msg.showSenderHeader ? "mt-3.5" : "mt-0.5"} isolate`}>
                    
                    <div className={msg.type === "sticker" && mediaUrl
                      ? `relative max-w-[140px] select-none isolate [contain:paint] [transform:translateZ(0)] ${isMe ? "rounded-tr-none" : "rounded-tl-none"}`
                      : `${msg.type === "image" || msg.type === "video" || msg.type === "sticker" ? "p-[3px]" : msg.type === "audio" ? "px-2.5 pt-2 pb-1.5" : "px-3.5 py-2"} max-w-[85%] sm:max-w-[70%] shadow-[0_1.5px_1px_rgba(0,0,0,0.08)] text-left relative font-sans break-words [word-break:break-word] isolate [contain:paint] [transform:translateZ(0)] ${
                          isMe 
                            ? "bg-[#d9fdd3] text-neutral-900 rounded-lg rounded-tr-none border-b border-[#e2f7cb]" 
                            : "bg-white text-neutral-900 rounded-lg rounded-tl-none border-b border-neutral-200/45"
                        }`
                    }>
                      
                      {/* Sender display header if consecutive grouping allows and not an internal parsed message ID */}
                      {msg.showSenderHeader && !isMe && msg.senderName && !msg.senderName.startsWith("msg_") && !msg.senderName.startsWith("parsed-") && !/^msg_\d+_[a-z0-9]+_\d+$/i.test(msg.senderName) && (
                        <span className={`block text-[11px] font-bold text-indigo-600 mb-1 font-mono tracking-tight select-none ${msg.type === "image" || msg.type === "video" || msg.type === "sticker" ? "px-1.5 pt-1.5" : ""}`}>
                          {msg.senderName}
                        </span>
                      )}

                      {/* WhatsApp Reply Message Preview */}
                      {msg.isReply && (
                        <div className={`mb-1.5 rounded-lg border-l-[4px] ${isMe ? "bg-emerald-900/5 border-emerald-600" : "bg-neutral-100 border-indigo-500"} px-2.5 py-1.5 text-xs flex flex-col gap-0.5 select-none cursor-pointer hover:opacity-90`}>
                          <span className={`font-bold text-[10.5px] truncate ${isMe ? "text-emerald-700" : "text-indigo-600"}`}>
                            {msg.replyToSenderName || "Original Sender"}
                          </span>
                          <span className="text-[11px] text-neutral-600 truncate leading-normal">
                            {(() => {
                              const t = (msg.replyToText || "").trim();
                              const type = msg.replyToType || "text";
                              if (type === "image") return `📷 Photo${t ? `: ${t}` : ""}`;
                              if (type === "video") return `🎥 Video${t ? `: ${t}` : ""}`;
                              if (type === "audio") return `🎤 Voice message${t ? `: ${t}` : ""}`;
                              if (type === "document") return `📄 Document${t ? `: ${t}` : ""}`;
                              if (type === "sticker") return `😊 Sticker${t ? `: ${t}` : ""}`;
                              return t || "Attachment";
                            })()}
                          </span>
                        </div>
                      )}

                      {/* Deleted message style */}
                      {msg.text === "This message was deleted" || msg.text === "You deleted this message" ? (
                        <div className="flex items-center gap-1.5 text-neutral-400 italic text-[11px] sm:text-xs py-1 select-none pr-12">
                          <Link2Off className="w-3.5 h-3.5 shrink-0 text-neutral-300" />
                          <span>This message was deleted</span>
                        </div>
                      ) : msg.isViewOnce ? (
                        /* WhatsApp View Once Message Style */
                        <div className="flex items-center gap-2.5 py-1 px-0.5 select-none pr-12">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            msg.viewOnceStatus === "opened"
                              ? isMe ? "bg-[#e2f7cb]/60 text-neutral-500" : "bg-neutral-100 text-neutral-500"
                              : isMe ? "bg-[#d9fdd3] text-emerald-600 animate-pulse" : "bg-indigo-50 text-indigo-600 animate-pulse"
                          } border border-current/25`}>
                            <span className="text-[10px] font-bold border border-current rounded-full w-4.5 h-4.5 flex items-center justify-center font-mono">1</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1 text-xs sm:text-[13px] font-medium text-neutral-800">
                              {msg.viewOnceMediaType === "image" && <span>📷 Photo</span>}
                              {msg.viewOnceMediaType === "video" && <span>🎥 Video</span>}
                              {msg.viewOnceMediaType === "audio" && <span>🎤 Voice message</span>}
                              {msg.viewOnceMediaType === "document" && <span>📄 Document</span>}
                              {(!msg.viewOnceMediaType || msg.viewOnceMediaType === "unknown") && <span>✨ View Once</span>}
                            </div>
                            <span className="text-[10px] text-neutral-400 font-medium leading-none mt-0.5">
                              {msg.viewOnceStatus === "opened" ? "Opened" : "Unopened View Once"}
                            </span>
                          </div>
                        </div>
                      ) : msg.isMediaOmitted ? (
                        /* WhatsApp Media Omitted Style */
                        <div className="flex items-center gap-2.5 py-1 px-0.5 select-none pr-12 text-neutral-500 italic">
                          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-400">
                            {msg.type === "image" && <Image className="w-4 h-4" />}
                            {msg.type === "video" && <Film className="w-4 h-4" />}
                            {msg.type === "audio" && <Volume2 className="w-4 h-4" />}
                            {msg.type === "document" && <FileArchive className="w-4 h-4" />}
                            {msg.type === "sticker" && <Smile className="w-4 h-4" />}
                            {msg.type !== "image" && msg.type !== "video" && msg.type !== "audio" && msg.type !== "document" && msg.type !== "sticker" && <Paperclip className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs sm:text-[13px] font-medium text-neutral-500 not-italic">
                              {msg.type === "image" && "📷 Photo (Omitted)"}
                              {msg.type === "video" && "🎥 Video (Omitted)"}
                              {msg.type === "audio" && "🎤 Voice note (Omitted)"}
                              {msg.type === "document" && "📄 Document (Omitted)"}
                              {msg.type === "sticker" && "😊 Sticker (Omitted)"}
                              {msg.type !== "image" && msg.type !== "video" && msg.type !== "audio" && msg.type !== "document" && msg.type !== "sticker" && "📎 Media omitted"}
                            </span>
                            <span className="text-[9.5px] text-neutral-400 font-sans tracking-tight">Excluded from backup export</span>
                          </div>
                        </div>
                      ) : (
                        /* Standard message contents based on type */
                        <>
                          {msg.type === "text" && (
                            (msg.text || "").trim() === "" &&
                            !msg.mediaUrl &&
                            !msg.driveFileId &&
                            !msg.mediaFileName ? (
                              <div className="flex items-center gap-1.5 text-neutral-500 text-xs sm:text-[13px] font-medium py-0.5 select-none pr-12">
                                <span>👁 Opened</span>
                              </div>
                            ) : (
                              <div className="text-xs sm:text-[13.5px] leading-relaxed font-sans text-neutral-900 break-words whitespace-pre-wrap relative select-text pb-1.5 pr-11">
                                <BeautifulEmojiText text={msg.text} />
                              </div>
                            )
                          )}

                          {msg.type === "image" && (
                            mediaUrl ? (
                              <DynamicImageBubble 
                                mediaUrl={mediaUrl} 
                                alt={msg.mediaFileName || "Attached image"} 
                                time={msg.time}
                                caption={msg.caption}
                                onClick={() => setFullscreenImage(mediaUrl)}
                                isMe={isMe}
                              />
                            ) : (
                              <div className="space-y-1.5 relative pb-1">
                                <div className="w-[260px] aspect-[4/3] bg-neutral-100 rounded-xl border border-neutral-200 flex flex-col items-center justify-center relative overflow-hidden select-none max-w-full">
                                  <div className="flex flex-col items-center justify-center p-4 text-center select-none">
                                    <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center mb-2 border border-neutral-200">
                                      <Image className="w-4 h-4 text-neutral-400" />
                                    </div>
                                    <p className="text-[10.5px] font-semibold text-neutral-600 truncate max-w-[200px]">{msg.mediaFileName || "image_file.jpg"}</p>
                                    <p className="text-[9px] text-neutral-400 mt-0.5">Media file not found in local backup</p>
                                  </div>
                                  <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-sans text-white uppercase font-bold tracking-wider select-none">
                                    IMAGE_FILE
                                  </div>
                                  {!msg.caption && (
                                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-sans text-white/95 select-none tracking-tight">
                                      {msg.time}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                          {msg.type === "image" && msg.caption && (
                            <div className="text-xs sm:text-[13px] text-neutral-800 font-sans leading-relaxed relative pr-12 pb-1.5 break-words whitespace-pre-wrap select-text mt-1">
                              <BeautifulEmojiText text={msg.caption} />
                            </div>
                          )}

                          {msg.type === "video" && (
                            mediaUrl ? (
                              <DynamicVideoBubble 
                                mediaUrl={mediaUrl} 
                                time={msg.time}
                                caption={msg.caption}
                                onClick={() => setFullscreenVideo(mediaUrl)}
                                isMe={isMe}
                              />
                            ) : (
                              <div className="space-y-1.5 relative pb-1">
                                <div className="w-[260px] aspect-[4/3] bg-neutral-100 rounded-xl border border-neutral-200 flex flex-col items-center justify-center relative overflow-hidden select-none max-w-full">
                                  <div className="flex flex-col items-center justify-center p-4 text-center select-none">
                                    <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center mb-2 border border-neutral-200">
                                      <Film className="w-4 h-4 text-neutral-400" />
                                    </div>
                                    <p className="text-[10.5px] font-semibold text-neutral-600 truncate max-w-[200px]">{msg.mediaFileName || "video_file.mp4"}</p>
                                    <p className="text-[9px] text-neutral-400 mt-0.5">Media file not found in local backup</p>
                                  </div>
                                  <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-sans text-white uppercase font-bold tracking-wider select-none">
                                    VIDEO_FILE
                                  </div>
                                  {!msg.caption && (
                                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-sans text-white/95 select-none tracking-tight">
                                      {msg.time}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                          {msg.type === "video" && msg.caption && (
                            <div className="text-xs sm:text-[13px] text-neutral-800 font-sans leading-relaxed relative pr-12 pb-1.5 break-words whitespace-pre-wrap select-text mt-1">
                              <BeautifulEmojiText text={msg.caption} />
                            </div>
                          )}

                          {msg.type === "audio" && (
                            <div className="relative font-sans w-full max-w-full">
                              <AuthenticatedAudio 
                                src={mediaUrl || undefined}
                                driveFileId={msg.driveFileId}
                                mediaFileName={msg.mediaFileName}
                                duration={msg.duration}
                                chatFolderId={chat.driveFolderId}
                                chatId={chat.id}
                                isMe={isMe}
                                senderName={msg.senderName || (isMe ? (googleUser?.displayName || "Me") : chat.name)}
                                senderAvatar={isMe ? (googleUser?.photoURL || undefined) : undefined}
                                time={msg.time}
                              />
                            </div>
                          )}

                          {/* Document attachment style */}
                          {msg.type === "document" && (
                            mediaUrl ? (
                              <AuthenticatedDocument 
                                src={mediaUrl} 
                                mediaFileName={msg.mediaFileName}
                              />
                            ) : (
                              <div className="w-full min-w-[200px] sm:min-w-[250px] max-w-full">
                                <div className="flex items-center gap-2.5 bg-neutral-50/50 p-2 rounded-xl border border-neutral-200/35 transition-colors select-none">
                                  <div className="w-8.5 h-8.5 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shrink-0">
                                    <FileArchive className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <div className="text-[11px] font-semibold text-neutral-800 truncate" title={msg.mediaFileName}>
                                      {msg.mediaFileName || "Document_Report.pdf"}
                                    </div>
                                    <div className="text-[8.5px] text-neutral-400 font-medium uppercase font-mono mt-0.5 tracking-wider">
                                      Google Drive file
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          )}

                          {/* Sticker attachment style */}
                          {msg.type === "sticker" && (
                            <div className="relative select-none max-w-[130px] max-h-[130px] p-0.5">
                              {mediaUrl ? (
                                <SafeImage 
                                  src={mediaUrl} 
                                  alt="Sticker" 
                                  className="w-full h-full object-contain bg-transparent"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center p-2.5 border-2 border-dashed border-neutral-200/60 rounded-xl bg-neutral-50/30">
                                  <span className="text-lg mb-1">🐻</span>
                                  <p className="text-[8.5px] text-neutral-400 font-sans truncate max-w-full font-mono">{msg.mediaFileName || "sticker.webp"}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Timestamp checkmarks for visual accuracy */}
                      {!(isMediaBubble && !msg.caption) && msg.type !== "audio" && (
                        <span className={msg.type === "sticker" && mediaUrl
                          ? "absolute bottom-[-15px] right-1 text-[9px] font-sans text-neutral-400 select-none tracking-tight flex items-center gap-0.5"
                          : "absolute bottom-[2px] right-2 text-[9px] font-sans text-neutral-400 select-none tracking-tight flex items-center gap-0.5"
                        }>
                          <span>{msg.time}</span>
                          {isMe && (
                            <span className="text-blue-500 ml-0.5 font-bold">✓✓</span>
                          )}
                        </span>
                      )}

                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Downward window batch loading indicator */}
          {isLoadingNextWindow && (
            <div className="w-full flex justify-center py-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 px-4 py-2 shadow-sm backdrop-blur-xs text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <span>⏳ Loading more chats...</span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Scroll-To-Bottom button */}
        {showScrollBottomBtn && (
          <button 
            onClick={() => scrollToBottom("auto")}
            disabled={isScrollingToBottom}
            className={`absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-5 z-25 bg-white hover:bg-neutral-50 text-neutral-700 h-10 rounded-full flex items-center justify-center shadow-lg border border-neutral-200 transition-all select-none ${
              isScrollingToBottom
                ? "w-10 opacity-90 cursor-not-allowed bg-neutral-100"
                : "w-10 hover:scale-110 active:scale-95 cursor-pointer"
            } animate-in fade-in zoom-in duration-200`}
            title={isScrollingToBottom ? "Loading..." : "Scroll to bottom"}
          >
            {isScrollingToBottom ? (
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            ) : (
              <ArrowDown className="w-4 h-4 stroke-[2.5px]" />
            )}
          </button>
        )}

        {/* Native WhatsApp In-Viewer Close Chat & Memory Eviction Confirmation Overlay */}
        <AnimatePresence>
          {showCloseChatConfirmModal && (
            <div 
              className="absolute inset-0 z-[45] flex items-center justify-center p-4"
              onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
            >
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-black/65" 
                onClick={() => setShowCloseChatConfirmModal(false)} 
              />
              <motion.div 
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-neutral-900 text-white rounded-2xl shadow-2xl p-5 border border-white/10 font-sans text-left z-10"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-neutral-800 text-emerald-400 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-neutral-100 leading-snug">
                      Close Chat & Clear Memory?
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Closing this chat will clear active session memory. When reopened, the conversation will reload freshly from the beginning.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 mt-5 w-full">
                  <button
                    type="button"
                    onClick={() => setShowCloseChatConfirmModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold border border-white/15 text-neutral-300 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Keep Open
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCloseChat}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Close & Clear
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 select-text text-left relative">
      <Helmet>
        <title>WhatsApp ZIP Viewer Online – Open Exported Chat Files with Media</title>
        <meta name="description" content="Open exported WhatsApp ZIP chat files online with media previews, deleted messages, reactions, stickers, and interactive conversation browsing. Secure WhatsApp export viewer and ZIP parser." />
        <meta name="keywords" content="whatsapp zip viewer, whatsapp export viewer, exported whatsapp chat viewer, whatsapp zip parser online, open whatsapp backup zip, whatsapp conversation viewer, whatsapp media export viewer" />
        <link rel="canonical" href="https://suhebdev.rf.gd/Tools/" />

        {/* Open Graph */}
        <meta property="og:title" content="WhatsApp ZIP Viewer Online – Open Exported Chat Files with Media" />
        <meta property="og:description" content="Open exported WhatsApp ZIP chat files online with media previews, deleted messages, reactions, stickers, and interactive conversation browsing. Secure WhatsApp export viewer and ZIP parser." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://suhebdev.rf.gd/Tools/" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="WhatsApp ZIP Viewer Online – Open Exported Chat Files with Media" />
        <meta name="twitter:description" content="Open exported WhatsApp ZIP chat files online with media previews, deleted messages, reactions, stickers, and interactive conversation browsing. Secure WhatsApp export viewer and ZIP parser." />

        {/* Structured Data (WebApplication) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "WhatsApp Chat Parser & Interactive Viewer",
            "applicationCategory": "UtilityApplication",
            "operatingSystem": "Web Browser",
            "url": "https://suhebdev.rf.gd/Tools/",
            "description": "View exported WhatsApp ZIP chats with media, deleted messages, reactions, stickers, and interactive conversation browsing."
          })}
        </script>
      </Helmet>

      <div className={`space-y-8 transition-all duration-300 ${
        isAnyModalActive ? "pointer-events-none select-none" : ""
      }`}>
        
        {/* Page Header */}
        <div className="border-b border-neutral-200/60 pb-5 select-none">
          <span className="text-[9px] font-mono font-black text-indigo-500 block uppercase tracking-widest">// BACKUP VIEWER & UTILITY</span>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight mt-1.5 font-sans">
            WhatsApp Chat Viewer & Reader
          </h1>
          <p className="text-xs text-neutral-500 mt-2 font-mono leading-relaxed max-w-2xl">
            Upload your WhatsApp chat export (.zip) to instantly read it just like the real WhatsApp interface, without dealing with messy text logs.
          </p>
        </div>

        {/* Main Split Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (SSO Profile & Saved List Index) */}
          <div className="lg:col-span-4">
            <div ref={leftColumnRef} className="flex flex-col gap-6">
              
              {/* Profile Card */}
              <div className="w-full bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1e1e1e] via-[#4d4d4d] to-neutral-300" />
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                      // SYSTEM AUTH STATUS
                    </span>
                  </div>
                  
                  <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4 min-h-[140px] flex flex-col justify-center items-center transition-all duration-300">
                    <AnimatePresence mode="wait">
                      {googleUser ? (
                        <motion.div
                           key="logged-in"
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           className="w-full text-center space-y-3"
                        >
                          <div className="flex items-center justify-center relative">
                            {googleUser.picture ? (
                              <img
                                src={googleUser.picture}
                                alt="Google avatar"
                                className="w-12 h-12 rounded-full border-2 border-emerald-500 shadow-sm mx-auto"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shadow-sm mx-auto">
                                {googleUser.name?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                            )}
                            <span className="absolute bottom-0 right-[38%] w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-neutral-800 tracking-tight">{googleUser.name}</h4>
                            <p className="text-[9px] text-neutral-500 font-mono max-w-full truncate">{googleUser.email}</p>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={onGoogleLogout}
                              className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 text-[9.5px] font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Disconnect Session</span>
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="logged-out"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="text-center space-y-4"
                        >
                          <p className="text-[10px] font-mono text-neutral-400 select-none">
                            Currently running in [GUEST_MODE] // SSO Session is idle.
                          </p>
                          
                          <button
                            onClick={onGoogleLogin}
                            className="flex items-center gap-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 shadow-sm rounded-xl px-4 py-2 text-xs font-bold text-neutral-700 transition-all duration-200 active:scale-[0.98] select-none cursor-pointer mx-auto"
                          >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.13-4.53z" fill="#EA4335"/>
                            </svg>
                            <span>Login with Google</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Saved Chats Card list */}
              <div className="w-full bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-neutral-800" />
                    <span className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">Loaded Chats ({filteredChats.length})</span>
                  </div>
                  <button
                    onClick={handleOpenCreateModal}
                    disabled={isImporting}
                    className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full px-3 py-1.5 text-[10.5px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search chats by name, zip, or contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 pl-9 bg-neutral-50 hover:bg-neutral-100/50 focus:bg-white border border-neutral-200 rounded-xl focus:border-indigo-500 outline-none transition-all placeholder:text-neutral-400 font-medium"
                  />
                  <div className="absolute left-3 top-3.5 text-neutral-400">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3.5 text-neutral-400 hover:text-black">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div 
                  id="chats-sidebar-container" 
                  className={`space-y-2.5 ${filteredChats.length > 3 ? "overflow-y-auto pr-1 custom-scrollbar" : "overflow-visible"}`}
                  style={{ 
                    maxHeight: isMobileOrTablet ? "none" : (sidebarMaxHeight !== "none" ? `${sidebarMaxHeight}px` : undefined),
                    overflowY: isMobileOrTablet ? "visible" : (filteredChats.length > 3 ? "auto" : "visible")
                  }}
                >
                  {isChatsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="border border-neutral-100 p-3.5 rounded-2xl bg-neutral-50/50 flex gap-3 animate-pulse">
                          <div className="w-9 h-9 rounded-full bg-neutral-200 shrink-0" />
                          <div className="flex-grow space-y-2 min-w-0">
                            <div className="h-3.5 bg-neutral-200 rounded-md w-1/2" />
                            <div className="h-3 bg-neutral-150 rounded-md w-3/4" />
                            <div className="h-2.5 bg-neutral-100 rounded-md w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/30 flex flex-col items-center justify-center select-none">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3 border border-neutral-200">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-neutral-600 font-bold">No chats created yet</p>
                      <p className="text-[10px] text-neutral-400 mt-1 max-w-[180px] leading-relaxed font-sans">Import a WhatsApp chat file (.txt/zip) to start viewing your conversations.</p>
                    </div>
                  ) : filteredChats.length > 0 ? (
                    filteredChats.map((chat) => {
                      // Extract Date and Time parts using short month and short weekday
                      const { dateBadge, timeBadge } = formatChatCardDateTime(chat);

                      // Compute formatted message count (e.g. 4.1k msgs or 850 msgs)
                      const totalMsgs = chat.totalMessageCount ?? chat.messageCount ?? (chat.messages ? chat.messages.length : 0);
                      const formattedMsgCount = totalMsgs >= 1000 
                        ? `${(totalMsgs / 1000).toFixed(1).replace(/\.0$/, "")}k msgs` 
                        : `${totalMsgs} msgs`;

                      return (
                        <div
                          key={chat.id}
                          onClick={() => {
                            if (selectedChatId !== chat.id) {
                              const isSameChat = previousActiveChatIdRef.current === chat.id;
                              const hasLoadedMemory = (chat.messages && chat.messages.length > 0);
                              if (!isSameChat || !hasLoadedMemory) {
                                setIsLoadingMessages(true);
                              }
                              setSelectedChatId(chat.id);
                            }
                            if (isMobileOrTablet) {
                              setIsFullscreen(true);
                            }
                          }}
                          className={`chat-card-item border p-3.5 rounded-2xl cursor-pointer transition-all duration-200 ease-out relative overflow-hidden flex flex-col gap-2 select-none ${
                            selectedChatId === chat.id 
                              ? "border-indigo-600 bg-indigo-50/20 shadow-xs ring-1 ring-indigo-500/10 scale-[1.01]" 
                              : "border-neutral-100 bg-neutral-50/50 hover:bg-neutral-100/50 hover:border-neutral-200/80 active:scale-[0.99]"
                          }`}
                        >
                          {/* Highlighting left accent line */}
                          {selectedChatId === chat.id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-l-2xl" />
                          )}

                          {/* Row 1: Logo Avatar + Chat Name + Delete Button */}
                          <div className="flex items-center gap-2.5 w-full">
                            {/* Avatar initials with dynamic color coding */}
                            <div className={`w-8 h-8 rounded-full border grid place-items-center font-bold text-[10.5px] font-sans shrink-0 shadow-2xs select-none ${getAvatarBgColor(chat.name)}`}>
                              <span className="leading-none flex items-center justify-center -mt-[0.5px]">{getInitials(chat.name)}</span>
                            </div>

                            {/* Chat Name area */}
                            <div className="flex-grow min-w-0">
                              <h4 className="text-xs font-bold text-neutral-800 tracking-tight truncate" title={chat.name}>
                                {chat.name}
                              </h4>
                            </div>

                            {/* Delete Action Button */}
                            <button
                              disabled={isDeletingChat || isImporting}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDeletingChat || isImporting) return;
                                setChatIdToDelete(chat.id);
                              }}
                              className="text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-1 rounded-lg cursor-pointer shrink-0 flex items-center justify-center w-7 h-7"
                              title={isDeletingChat ? "Deletion in progress..." : "Delete Chat"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Row 2: Date + Time + Msg Count Badge */}
                          <div className="flex items-center gap-1.5 flex-nowrap text-[9px] font-mono text-neutral-500 overflow-hidden">
                            {dateBadge && (
                              <span className="bg-neutral-200/60 text-neutral-700 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                                {dateBadge}
                              </span>
                            )}
                            {timeBadge && (
                              <span className="bg-neutral-200/60 text-neutral-600 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                                {timeBadge}
                              </span>
                            )}
                            <span className="hidden sm:inline-flex ml-auto bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                              {formattedMsgCount}
                            </span>
                          </div>

                          {/* Row 3: Zip File Name + Other Identity + Chat Open Button */}
                          <div className="flex items-center gap-1.5 pt-0.5 w-full">
                            {/* 1. Zip filename container (Stable width with ellipsis) */}
                            <div 
                              className="flex items-center gap-1 text-[8.5px] text-neutral-500 font-mono bg-white border border-neutral-200/70 px-2 py-1 rounded-lg flex-1 min-w-0 max-w-[42%] overflow-hidden" 
                              title={chat.fileName}
                            >
                              <FileArchive className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate block whitespace-nowrap">{chat.fileName}</span>
                            </div>

                            {/* 2. Other participant identity container (Stable width with ellipsis) */}
                            <div 
                              className="flex items-center gap-1 text-[8.5px] text-neutral-600 font-medium bg-white border border-neutral-200/70 px-2 py-1 rounded-lg flex-1 min-w-0 overflow-hidden" 
                              title={`Participant: ${chat.otherIdentity || "Partner"}`}
                            >
                              <span className="text-[7.5px] font-mono font-bold text-neutral-400 uppercase tracking-wider shrink-0">WITH:</span>
                              <span className="truncate block whitespace-nowrap">{chat.otherIdentity || "Partner"}</span>
                            </div>

                            {/* 3. Chat Open Button (Fixed stable size) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedChatId !== chat.id) {
                                  const isSameChat = previousActiveChatIdRef.current === chat.id;
                                  const hasLoadedMemory = (chat.messages && chat.messages.length > 0);
                                  if (!isSameChat || !hasLoadedMemory) {
                                    setIsLoadingMessages(true);
                                  }
                                  setSelectedChatId(chat.id);
                                }
                                if (isMobileOrTablet) {
                                  setIsFullscreen(true);
                                }
                              }}
                              className={`px-2.5 py-1 text-[9.5px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 shrink-0 whitespace-nowrap cursor-pointer shadow-2xs ${
                                selectedChatId === chat.id
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "bg-neutral-900 text-white hover:bg-neutral-800"
                              }`}
                            >
                              <span>Open</span>
                              <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 px-4 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/30 select-none">
                      <p className="text-xs text-neutral-400 font-mono">No matching chats found.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column (Message Panel or SafePortal) */}
          {!isMobileOrTablet ? (
            <div 
              className={
                isFullscreen
                  ? "fixed inset-0 z-[999999] bg-white flex flex-col overflow-hidden w-screen h-screen m-0"
                  : "lg:col-span-8 flex flex-col bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm w-full"
              }
              style={{ height: isFullscreen ? "100vh" : `${leftColumnHeight}px` }}
            >
              {renderChatPreviewBody()}
            </div>
          ) : (
            isFullscreen && (
              <SafePortal>
                <div 
                  className="fixed inset-0 z-[999999] bg-white flex flex-col overflow-hidden w-screen h-screen m-0"
                  style={{ height: "100vh", width: "100vw" }}
                >
                  {renderChatPreviewBody()}
                </div>
              </SafePortal>
            )
          )}

        </div>
      </div>

      {/* Zoom / Fullscreen image view modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <SafePortal>
            <InteractiveImageViewer src={fullscreenImage} onClose={() => setFullscreenImage(null)} />
          </SafePortal>
        )}
      </AnimatePresence>

      {/* Fullscreen video view modal */}
      <AnimatePresence>
        {fullscreenVideo && (
          <SafePortal>
            <InteractiveVideoViewer src={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
          </SafePortal>
        )}
      </AnimatePresence>

      {/* ========================================
          MODALS SECTION (Using SafePortal overlays)
          ======================================== */}
      
      {/* MODAL 1: Create New Chat Form */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <SafePortal>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70"
                onClick={handleCloseCreateModal}
              />
              
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-t-[5px] border-t-indigo-600 max-h-[90vh] overflow-y-auto custom-scrollbar font-sans text-left z-[10010]"
              >
                <button 
                  onClick={handleCloseCreateModal}
                  disabled={isImporting}
                  className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                 <div className="space-y-6">
                  {!importSuccess && (
                    <div>
                      <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-widest px-2.5 py-0.5 bg-indigo-50 rounded-full border border-indigo-100">
                        V3 ARCHITECTURE: ZERO-LATENCY INSTANT PREVIEW
                      </span>
                      <h3 className="text-lg font-black text-black mt-2 leading-tight">
                        Parse WhatsApp Backup ZIP
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        Upload your WhatsApp backup ZIP log archive to preview readable conversation dialogues.
                      </p>
                    </div>
                  )}

                  {importSuccess ? (
                    <div className="space-y-6 text-center py-6">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                        <Check className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-emerald-950 animate-pulse">Import Completed!</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
                          WhatsApp Chat Archive has been successfully parsed and saved. You will land inside the imported conversation immediately.
                        </p>
                      </div>

                      {importProgress && (
                        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 space-y-3 mx-auto max-w-md text-left">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-neutral-800">{importProgress.label}</span>
                            <span className="font-mono font-bold text-indigo-600">{importProgress.progress}%</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                              style={{ width: `${importProgress.progress}%` }}
                            />
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-emerald-600 font-semibold">
                            <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                            <span>Import complete</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : partialImportResult ? (
                    <div className="space-y-4">
                      <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100">
                        <h4 className="text-sm font-black text-indigo-950">Identify Yourself</h4>
                        <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
                          Select which participant represents <span className="font-bold">YOU</span>. The remaining participant(s) will automatically be treated as the other side.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                          Select Your Identity:
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {partialImportResult.participants.map((participant: any) => {
                            const pName = typeof participant === "string" ? participant : participant.name;
                            const count = typeof participant === "object" ? participant.messageCount : undefined;
                            return (
                              <label 
                                key={pName}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  selectedMyIdentity === pName
                                    ? "border-indigo-600 bg-indigo-50/30 text-indigo-950 shadow-sm"
                                    : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="radio" 
                                    name="selectedMyIdentity"
                                    value={pName}
                                    checked={selectedMyIdentity === pName}
                                    onChange={() => setSelectedMyIdentity(pName)}
                                    disabled={isImporting}
                                    className="w-4 h-4 text-indigo-600 border-neutral-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span>{pName}</span>
                                </div>
                                {typeof count === "number" && (
                                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full font-medium">
                                    {count} msgs
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {importProgress && (
                        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 space-y-3.5 mt-4">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-neutral-800">{importProgress.label}</span>
                            <span className="font-mono font-bold text-indigo-600">{importProgress.progress}%</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                              style={{ width: `${importProgress.progress}%` }}
                            />
                          </div>

                          {importProgress.message && (
                            <p className="text-[10px] font-mono text-neutral-500 italic">
                              {importProgress.message}
                            </p>
                          )}

                          {/* Loading indicator */}
                          {isImporting && (
                            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                              <span>Processing import pipeline...</span>
                            </div>
                          )}

                          {/* Error state */}
                          {importProgress.stage === "failed" && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                              <div className="space-y-1">
                                <span className="font-bold">Error Occurred</span>
                                <p className="text-[10px] leading-relaxed break-all">{importProgress.message || "An error occurred."}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Chat Label Name:</label>
                        <input 
                          type="text" 
                          placeholder="e.g., Aman Gupta Personal Chat"
                          value={chatName}
                          onChange={(e) => setChatName(e.target.value)}
                          disabled={isImporting}
                          className="w-full text-xs font-semibold px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">Upload ZIP file (.zip only):</label>
                        <div 
                          onDragOver={isImporting ? undefined : handleDragOver}
                          onDrop={isImporting ? undefined : handleDrop}
                          onClick={isImporting ? undefined : () => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors select-none ${
                            isImporting ? "opacity-60 cursor-not-allowed border-neutral-200 bg-neutral-50" : "cursor-pointer"
                          } ${
                            uploadedFile 
                              ? "border-emerald-300 bg-emerald-50/20" 
                              : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50"
                          }`}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept=".zip"
                            onChange={handleFileUpload}
                            disabled={isImporting}
                            className="hidden"
                          />
                          
                          {uploadedFile ? (
                            <>
                              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2.5 mx-auto">
                                <Check className="w-5 h-5" />
                              </div>
                              <span className="text-[11px] font-bold text-neutral-800 break-all">{uploadedFile.name}</span>
                              <span className="text-[9px] font-mono text-emerald-600 mt-1 font-semibold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded">
                                ZIP loaded (Waiting for V3 Parser)
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 bg-neutral-100 text-neutral-500 rounded-full flex items-center justify-center mb-2.5 mx-auto">
                                <Upload className="w-5 h-5 text-neutral-400" />
                              </div>
                              <span className="text-xs font-bold text-neutral-700">Drag & Drop or Click to Select File</span>
                              <span className="text-[9.5px] font-mono text-indigo-600 mt-1.5 font-semibold uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                WhatsApp Exported ZIP Archive
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {importProgress && (
                        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 space-y-3.5 mt-4">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-neutral-800">{importProgress.label}</span>
                            <span className="font-mono font-bold text-indigo-600">{importProgress.progress}%</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                              style={{ width: `${importProgress.progress}%` }}
                            />
                          </div>

                          {importProgress.message && (
                            <p className="text-[10px] font-mono text-neutral-500 italic">
                              {importProgress.message}
                            </p>
                          )}

                          {/* Loading indicator */}
                          {isImporting && (
                            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium">
                              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                              <span>Processing import pipeline...</span>
                            </div>
                          )}

                          {/* Error state */}
                          {importProgress.stage === "failed" && (
                            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                              <div className="space-y-1">
                                <span className="font-bold">Error Occurred</span>
                                <p className="text-[10px] leading-relaxed break-all">{importProgress.message || "An error occurred."}</p>
                              </div>
                            </div>
                          )}

                          {/* Success state */}
                          {importProgress.stage === "completed" && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                              <div className="space-y-1">
                                <span className="font-bold">Success!</span>
                                <p className="text-[10px] leading-relaxed">WhatsApp Chat Archive has been successfully parsed and saved.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!importSuccess && (
                    <div className="space-y-3 pt-3">
                      {partialImportResult ? (
                        <>
                          <div className={`w-full ${isImporting ? "flex flex-col sm:flex-row items-stretch sm:items-center gap-2" : ""}`}>
                            <button
                              onClick={handleContinueImport}
                              disabled={!selectedMyIdentity || isImporting}
                              className={`py-3 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 select-none w-full ${
                                isImporting ? "sm:flex-1 sm:min-w-0" : ""
                              } ${
                                (selectedMyIdentity && !isImporting)
                                  ? "bg-indigo-600 hover:bg-neutral-950 text-white cursor-pointer hover:shadow-lg active:scale-[0.98]" 
                                  : isImporting
                                  ? "bg-indigo-600/90 text-white cursor-not-allowed border border-indigo-500/50 shadow-none"
                                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200/50 shadow-none"
                              }`}
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span className="truncate">Resuming...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>Continue Import</span>
                                </>
                              )}
                            </button>

                            {isImporting && (
                              <button
                                type="button"
                                onClick={handleInstantViewClick}
                                disabled={!canInstantView || isTriggeringInstantView}
                                className={`w-full sm:w-auto sm:shrink-0 py-3 px-4 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center select-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${
                                  isTriggeringInstantView
                                    ? "bg-neutral-800 text-white cursor-wait border border-neutral-700 ring-1 ring-neutral-700/50"
                                    : canInstantView
                                    ? "bg-black hover:bg-neutral-900 text-white cursor-pointer hover:shadow-lg active:scale-[0.98] border border-neutral-800 ring-1 ring-neutral-700/50"
                                    : "bg-[#212121] text-neutral-400 cursor-not-allowed border border-neutral-800/80 shadow-none"
                                }`}
                                title={canInstantView ? "Open and view chat immediately while media uploads in background" : "Instant View unlocks after text messages are prepared"}
                              >
                                {isTriggeringInstantView ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mr-1.5" />
                                    <span>Opening...</span>
                                  </>
                                ) : (
                                  <span>Instant View</span>
                                )}
                              </button>
                            )}
                          </div>

                          <button
                            onClick={handleCancelImport}
                            disabled={isImporting}
                            className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-500 hover:text-black rounded-xl text-xs font-mono font-bold border border-neutral-200/60 transition-all text-center select-none cursor-pointer"
                          >
                            Cancel Action
                          </button>
                        </>
                      ) : (
                        <>
                          {uploadedFile && (isDriveChecking || isDriveAuthorized === null) ? (
                            <div className="bg-neutral-50/80 border border-neutral-200/60 rounded-xl p-3.5 text-left flex items-center gap-3 animate-in fade-in duration-200">
                              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                              <div className="space-y-0.5">
                                <span className="text-[10.5px] font-bold text-neutral-800 font-mono">Establishing Google Drive Connection</span>
                                <p className="text-[9.5px] text-neutral-500 leading-normal font-sans">
                                  Verifying authorization status to prepare the media upload path...
                                </p>
                              </div>
                            </div>
                          ) : (
                            uploadedFile && isDriveAuthorized === false && (
                              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-left space-y-1.5 animate-in fade-in duration-200">
                                <div className="flex gap-2 items-start text-amber-800">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span className="text-[10.5px] font-bold">Google Drive Authorization Required</span>
                                </div>
                                <p className="text-[9.5px] text-amber-600 leading-normal font-sans">
                                  To protect your chat media files, backing up to Google Drive is mandatory.
                                </p>
                                <button
                                  type="button"
                                  onClick={handleStartOAuthFlow}
                                  className="w-full text-center py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm shadow-amber-100 flex items-center justify-center gap-1.5"
                                >
                                  <Cloud className="w-3 h-3" />
                                  <span>Link Google Drive Now</span>
                                </button>
                              </div>
                            )
                          )}

                          <div className={`w-full ${isImporting ? "flex flex-col sm:flex-row items-stretch sm:items-center gap-2" : ""}`}>
                            <button
                              onClick={handleStartImport}
                              disabled={!chatName.trim() || !uploadedFile || isImporting || isDriveAuthorized !== true}
                              className={`py-3 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 select-none w-full ${
                                isImporting ? "sm:flex-1 sm:min-w-0" : ""
                              } ${
                                (chatName.trim() && uploadedFile && !isImporting && isDriveAuthorized === true)
                                  ? "bg-indigo-600 hover:bg-neutral-950 text-white cursor-pointer hover:shadow-lg active:scale-[0.98]" 
                                  : isImporting
                                  ? "bg-indigo-600/90 text-white cursor-not-allowed border border-indigo-500/50 shadow-none"
                                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200/50 shadow-none"
                              }`}
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span className="truncate">Importing Chat...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>Start Import</span>
                                </>
                              )}
                            </button>

                            {isImporting && (
                              <button
                                type="button"
                                onClick={handleInstantViewClick}
                                disabled={!canInstantView || isTriggeringInstantView}
                                className={`w-full sm:w-auto sm:shrink-0 py-3 px-4 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center select-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-200 ${
                                  isTriggeringInstantView
                                    ? "bg-neutral-800 text-white cursor-wait border border-neutral-700 ring-1 ring-neutral-700/50"
                                    : canInstantView
                                    ? "bg-black hover:bg-neutral-900 text-white cursor-pointer hover:shadow-lg active:scale-[0.98] border border-neutral-800 ring-1 ring-neutral-700/50"
                                    : "bg-[#212121] text-neutral-400 cursor-not-allowed border border-neutral-800/80 shadow-none"
                                }`}
                                title={canInstantView ? "Open and view chat immediately while media uploads in background" : "Instant View unlocks after text messages are prepared"}
                              >
                                {isTriggeringInstantView ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mr-1.5" />
                                    <span>Opening...</span>
                                  </>
                                ) : (
                                  <span>Instant View</span>
                                )}
                              </button>
                            )}
                          </div>

                          <button
                            onClick={handleCloseCreateModal}
                            disabled={isImporting}
                            className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-500 hover:text-black rounded-xl text-xs font-mono font-bold border border-neutral-200/60 transition-all text-center select-none cursor-pointer"
                          >
                            Cancel Action
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* MODAL 2: Google Sign-In prompt Popup */}
      <AnimatePresence>
        {showSignInModal && (
          <SafePortal>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70"
                onClick={dismissSignInModal}
              />
              
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-t-[5px] border-t-amber-500 text-center z-[10010]"
              >
                <button 
                  onClick={dismissSignInModal}
                  className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-1">
                    <Lock className="w-5 h-5 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-black text-black">Sign-In Session Recommended</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed">Connect your Google auth session to access advanced WhatsApp parsed analysis pipelines.</p>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <button
                      onClick={triggerGoogleLoginFromPopup}
                      className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 shadow-sm rounded-xl px-4 py-2.5 text-xs font-bold text-neutral-700 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.13-4.53z" fill="#EA4335"/>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>

                    <button
                      onClick={dismissSignInModal}
                      className="w-full py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-black rounded-lg text-[10px] font-mono font-bold border border-neutral-200/50 transition-all text-center cursor-pointer"
                    >
                      Bypass / Continue as Guest
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* MODAL 3: Delete Confirmation */}
      <AnimatePresence>
        {chatIdToDelete && (
          <SafePortal>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70" 
                onClick={isDeletingChat ? undefined : () => {
                  setChatIdToDelete(null);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }} 
              />
              
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 text-left z-[10010]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 text-left">
                    <h3 className="text-xs font-black font-mono tracking-wider text-neutral-900 uppercase">Confirm Deletion</h3>
                    <p className="text-[9.5px] font-mono text-neutral-400">Action cannot be undone</p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-3 text-left">
                  <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                    Are you sure you want to permanently delete this WhatsApp chat session?
                  </p>
                  
                  <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-3 space-y-1">
                    <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">Chat Name</span>
                    <span className="block text-xs font-bold text-neutral-800 break-all font-mono select-all">
                      {chatToDelete?.name || "WhatsApp Chat"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                      Type the chat name to confirm
                    </label>
                    <input
                      type="text"
                      disabled={isDeletingChat}
                      placeholder="Type exact chat name..."
                      value={deleteConfirmText}
                      onChange={(e) => {
                        setDeleteConfirmText(e.target.value);
                        if (deleteError) setDeleteError(null);
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500 disabled:opacity-50"
                    />
                  </div>

                  {deleteError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] p-2.5 rounded-xl font-mono leading-relaxed break-words">
                      ⚠️ {deleteError}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end gap-2 select-none">
                  <button
                    disabled={isDeletingChat}
                    onClick={() => {
                      setChatIdToDelete(null);
                      setDeleteConfirmText("");
                      setDeleteError(null);
                    }}
                    className="px-3.5 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl text-[11px] font-mono font-bold transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    No, Keep it
                  </button>
                  <button
                    disabled={isDeletingChat || !chatToDelete || deleteConfirmText !== chatToDelete.name}
                    onClick={handleSecureDeleteChat}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-mono font-bold transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isDeletingChat ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Yes, Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* Google Drive Pre-Prompt Modal */}
      <AnimatePresence>
        {showDrivePrePrompt && (
          <SafePortal>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70"
                onClick={isOAuthProcessing ? undefined : () => setShowDrivePrePrompt(false)}
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border-t-[5px] border-t-indigo-600 font-sans text-left z-[10010]"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                    {isOAuthProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CloudLightning className="w-6 h-6" />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-neutral-800 mb-2">
                    {isOAuthProcessing ? "Connecting to Google Drive..." : "Back Up Chat Media?"}
                  </h3>
                  <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
                    {isOAuthProcessing 
                      ? "A secure popup window has been launched to authenticate with your Google account. Please complete the flow in the popup to continue."
                      : "We can automatically back up your chat media attachments directly to a secure folder in your Google Drive. Continue to link Google Drive?"}
                  </p>

                  {oauthError && (
                    <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs mb-4 text-left flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Authorization Failed</span>
                        <p className="text-[10px] leading-relaxed break-all font-mono">{oauthError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 w-full">
                    <button
                      disabled={isOAuthProcessing}
                      onClick={() => setShowDrivePrePrompt(false)}
                      className="flex-1 text-xs font-semibold px-4 py-3 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      No, Parse Locally
                    </button>
                    <button
                      disabled={isOAuthProcessing}
                      onClick={handleStartOAuthFlow}
                      className="flex-1 text-xs font-bold px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isOAuthProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <span>Yes, Continue</span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* Security Phase 3 MODAL: Replace ZIP Confirmation */}
      <AnimatePresence>
        {showReplaceZipModal && (
          <SafePortal>
            <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70" 
                onClick={handleCancelReplaceZip} 
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border-t-[5px] border-t-amber-500 font-sans text-left z-[10030]"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-3 border border-amber-100">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-800 mb-1.5">
                    Replace Selected ZIP Backup?
                  </h3>
                  <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                    You already have <span className="font-bold text-neutral-800">{uploadedFile?.name}</span> loaded. Replacing it will clear the current file selection.
                  </p>

                  {pendingZipFile && (
                    <div className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-5 text-left font-mono text-[10.5px]">
                      <span className="text-neutral-400 block uppercase tracking-wider text-[8.5px] font-bold">New File Selected:</span>
                      <span className="text-neutral-800 font-bold block truncate">{pendingZipFile.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={handleCancelReplaceZip}
                      className="flex-1 text-xs font-semibold px-4 py-2.5 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Keep Existing
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReplaceZip}
                      className="flex-1 text-xs font-bold px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Replace ZIP
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* Security Phase 3 MODAL: Safe Close Confirmation (State B) */}
      <AnimatePresence>
        {showSafeCloseModal && (
          <SafePortal>
            <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70" 
                onClick={() => setShowSafeCloseModal(false)} 
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border-t-[5px] border-t-rose-500 font-sans text-left z-[10030]"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-3 border border-rose-100">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-800 mb-1.5">
                    Discard Unsaved Inputs?
                  </h3>
                  <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
                    You have unsubmitted form entries or a loaded WhatsApp backup file. Closing now will clear your selections.
                  </p>

                  <div className="flex items-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => setShowSafeCloseModal(false)}
                      className="flex-1 text-xs font-semibold px-4 py-2.5 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Keep Editing
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCreateModalDirect}
                      className="flex-1 text-xs font-bold px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Discard & Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* Security Phase 3 MODAL: Import In Progress Warning (State C) */}
      <AnimatePresence>
        {showImportInProgressWarningModal && (
          <SafePortal>
            <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70" 
                onClick={() => setShowImportInProgressWarningModal(false)} 
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border-t-[5px] border-t-indigo-600 font-sans text-left z-[10030]"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3 border border-indigo-100">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-800 mb-1.5">
                    Import Currently Active
                  </h3>
                  <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
                    A WhatsApp archive import is currently running. Closing the modal will interrupt the pipeline. Please wait for completion.
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowImportInProgressWarningModal(false)}
                    className="w-full text-xs font-bold px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Got It, Continue Waiting
                  </button>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

      {/* Modal: Open Current Imported Chat Prompt */}
      <AnimatePresence>
        {newlyImportedChatForPrompt && (
          <SafePortal>
            <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/70" 
                onClick={() => setNewlyImportedChatForPrompt(null)} 
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border-t-[5px] border-t-emerald-600 font-sans text-left z-[10030]"
              >
                <button
                  type="button"
                  onClick={() => setNewlyImportedChatForPrompt(null)}
                  className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                  title="Close without opening"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3.5 border border-emerald-100 shadow-2xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 mb-1">
                    Import Successful!
                  </h3>
                  <p className="text-xs text-neutral-500 mb-4 leading-relaxed max-w-xs">
                    Your WhatsApp backup has been completely parsed and saved. Would you like to open it now?
                  </p>

                  {/* Imported Chat Summary Card */}
                  <div className="w-full bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3.5 mb-5 text-left flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border grid place-items-center font-bold text-xs font-sans shrink-0 select-none shadow-2xs ${getAvatarBgColor(newlyImportedChatForPrompt.name)}`}>
                      <span className="leading-none flex items-center justify-center -mt-[0.5px]">
                        {getInitials(newlyImportedChatForPrompt.name)}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-xs font-bold text-neutral-800 tracking-tight truncate" title={newlyImportedChatForPrompt.name}>
                        {newlyImportedChatForPrompt.name}
                      </h4>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5 truncate">
                        {(newlyImportedChatForPrompt.totalMessageCount ?? newlyImportedChatForPrompt.messageCount ?? 0) >= 1000
                          ? `${((newlyImportedChatForPrompt.totalMessageCount ?? newlyImportedChatForPrompt.messageCount ?? 0) / 1000).toFixed(1).replace(/\.0$/, "")}k messages`
                          : `${newlyImportedChatForPrompt.totalMessageCount ?? newlyImportedChatForPrompt.messageCount ?? 0} messages`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => setNewlyImportedChatForPrompt(null)}
                      className="flex-1 text-xs font-semibold px-4 py-2.5 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      Later
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const chatToOpen = newlyImportedChatForPrompt;
                        setNewlyImportedChatForPrompt(null);
                        if (chatToOpen) {
                          setIsLoadingMessages(true);
                          setSelectedChatId(chatToOpen.id);
                          if (isMobileOrTablet) {
                            setIsFullscreen(true);
                          }
                        }
                      }}
                      className="flex-1 text-xs font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Open Chat</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </SafePortal>
        )}
      </AnimatePresence>

    </div>
  );
}
