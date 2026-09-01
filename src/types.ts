export interface SkillCallout {
  id: string;
  title: string;
  subtitle: string;
  details: string[];
  techStack: string[];
  x: number; // Percent from left (for SVG placement)
  y: number; // Percent from top
  labelX: number; // For badge placement
  labelY: number;
  linePath: string; // SVG path command for leader lines
}

export interface BusinessMetric {
  label: string;
  value: string;
  desc: string;
}

export interface NavigationItem {
  name: string;
  href: string;
  iconName: string;
}

// ==========================================
// VERSION 3.0 FIRESTORE DATA ARCHITECTURE
// ==========================================

export interface V2User {
  userId: string;
  displayName: string;
  email: string;
  picture?: string;
  createdAt?: string; // ISO date-time of profile registration
  driveRootFolderId?: string; // Root Google Drive folder ID 'WhatsAppToolMedia'
  driveConnectedAt?: string; // ISO date-time of Google Drive authentication
  driveTokens?: string; // Encrypted Google OAuth session tokens (Backend Only)
}

/**
 * V3 Canonical Lightweight Firestore Metadata for imported WhatsApp Chat
 * Stored at: /users/{userId}/tools_chats/{chatId}
 */
export interface V3ToolsChatMetadata {
  id: string; // Unique identifier of the chat
  name: string; // Custom display name assigned by user
  fileName: string; // Original filename of WhatsApp ZIP file
  myIdentity: string; // The user's display name inside WhatsApp
  otherIdentity: string; // Other participant display name
  driveFolderId: string; // Google Drive folder ID ({chatName}_{chatId})
  totalMessageCount: number; // Total parsed message count
  storageVersion: number; // 3 for V3
  isImported: boolean; // True when import and Drive upload successfully finalized
  createdAt: string; // ISO timestamp
}

// Alias for V2/V3 transition compatibility
export type V2Chat = V3ToolsChatMetadata & {
  lastMessage?: string;
  date?: string;
  messageCount?: number;
};
export type V3Chat = V3ToolsChatMetadata;

export interface V2Message {
  id: string; // Unique message identifier
  text: string; // Message textual content
  sender: "me" | "other" | "system"; // Sender role classification
  senderName: string; // Original sender display name
  timestamp: string; // ISO 8601 timestamp for robust chronological sorting
  time: string; // Display-formatted short time e.g., "10:30 PM"
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "oversized_text" | "view_once_opened"; // Content category
  mediaFileName?: string; // Original attached filename
  caption?: string; // Optional attached media description/caption
  duration?: string; // Optional voice/audio note duration (e.g. "0:12")
  driveFileId?: string; // Google Drive file ID of the uploaded binary asset
  sequenceIndex: number; // Strict zero-based sequential index to preserve exact conversation order
  localFile?: File; // Mapped local File object for uploading or previewing (Phase 3.6)
  localFileUrl?: string; // Local Object URL representing the file content (Phase 3.6)
  discoveredFileId?: string; // The ID of the discovered file mapped to this message (Phase 3.6)
  
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
