/**
 * ============================================================================
 * Backend Request/Response DTOs Layer (SAD Section 3.15)
 * ============================================================================
 * Responsibility: Defining strict contractual structures for data crossing
 * the network boundaries of API endpoints.
 */

// Global Unified Envelope Response
export interface ApiResponseEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// 1. Google OAuth Authorization Initiate DTOs
export interface DriveAuthInitResponse {
  authUrl: string;
}

// 2. Drive Verification Response DTOs
export interface DriveConnectionStatusResponse {
  authorized: boolean;
  email?: string;
  driveRootFolderId?: string;
}

// 3. Chat Initialization Requests & Folders DTOs
export interface InitializeChatFolderRequest {
  chatId: string;
  chatName: string;
}

export interface InitializeChatFolderResponse {
  driveFolderId: string;
  driveFolderName: string;
}

// 4. Batch Verification Requests DTOs
export interface VerifyUploadSessionRequest {
  sessionId: string;
  messagesCount: number;
  filesList: {
    id: string;
    name: string;
    size: number;
    category: string;
  }[];
}

export interface VerifyUploadSessionResponse {
  sessionVerified: boolean;
  actionRequired?: "GRANT_PERMISSIONS" | "RETRY_VERIFICATION";
  driveRootFolderId: string;
  driveChatFolderId: string;
}
