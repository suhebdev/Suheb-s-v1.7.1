/**
 * ============================================================================
 * V3 Message & Batch Types Specification (Section 4.3 & 4.5)
 * ============================================================================
 */

export interface V3MediaExtension {
  fileName: string;
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

export interface V3OversizedTextExtension {
  preview: string;
  lineCount: number;
  byteSize: number;
  externalFile: string;
}

export interface V3ParsedMessage {
  id: string;
  sender: "me" | "other" | "system";
  senderName: string;
  sequenceIndex: number;
  text: string;
  time: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "oversized_text" | "view_once_opened";
  edited?: boolean;
  largeText?: boolean;
  media?: V3MediaExtension;
  oversizedText?: V3OversizedTextExtension;
  mediaFileName?: string;
  driveFileId?: string;
  mediaUrl?: string;
  duration?: string;
  caption?: string;
  isReply?: boolean;
  replyToSenderName?: string;
  replyToText?: string;
}

export interface V3BatchPayload {
  version: 3;
  chatId: string;
  batchIndex: number;
  totalBatches?: number;
  messageCount: number;
  startSequenceIndex: number;
  endSequenceIndex: number;
  messages: V3ParsedMessage[];
}
