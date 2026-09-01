import { V2User, V2Chat, V2Message } from "../types";

export type UploadSessionState =
  | "Created"
  | "Validating"
  | "Extracting"
  | "Discovering"
  | "Parsing"
  | "Mapping"
  | "WaitingForPermission"
  | "Verifying"
  | "Uploading"
  | "Saving"
  | "Rendering"
  | "Completed"
  | "Failed"
  | "Cancelled";

export interface DiscoveredFile {
  id: string; // Unique within session
  name: string; // Filename (e.g. "IMG-001.jpg")
  extension: string; // Lowercase extension without dot (e.g. "jpg")
  size: number; // File size in bytes
  category: "chat" | "image" | "video" | "audio" | "document" | "sticker" | "unknown";
  path: string; // Relative path inside ZIP
  file: File; // The browser File object
}

export interface RawParsedMessage {
  id: string;
  text: string;
  senderName: string;
  sender?: "me" | "other" | "system";
  timestamp: string; // ISO String
  time: string; //Formatted display time e.g., "10:30 PM"
  type: "text" | "image" | "video" | "audio" | "document" | "sticker";
  mediaFileName?: string;
  caption?: string;
  duration?: string;
  sequenceIndex: number;

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

export interface UploadSession {
  id: string; // Matches chat ID
  chatName: string;
  zipFile: File;
  state: UploadSessionState;
  progress: number; // 0 to 100
  errorMessage?: string;
  
  // Stored processing stages metadata
  extractedFilesCount?: number;
  discoveredFiles?: DiscoveredFile[];
  parsedMessages?: RawParsedMessage[];
  mappedMessages?: V2Message[];
  driveRootFolderId?: string;
  driveChatFolderId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Re-export core schemas to centralize types
export type { V2User, V2Chat, V2Message };
