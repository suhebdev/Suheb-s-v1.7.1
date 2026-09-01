import { IBackendAuthService } from "./authService";
import { IBackendDriveService, IDriveUploadResult } from "./driveService";
import { IBackendFirestoreService } from "./firestoreService";

export interface IUploadSessionFile {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

export interface IUploadSessionResult {
  success: boolean;
  chatId: string;
  chatFolderId: string;
  files: IDriveUploadResult[];
}

export interface IBackendUploadSessionManager {
  /**
   * Orchestrates a complete file upload session for a specific chat.
   */
  processUploadSession(
    userId: string,
    chatId: string,
    files: IUploadSessionFile[]
  ): Promise<IUploadSessionResult>;
}

export class BackendUploadSessionManager implements IBackendUploadSessionManager {
  constructor(
    private readonly authService: IBackendAuthService,
    private readonly driveService: IBackendDriveService,
    private readonly firestoreService: IBackendFirestoreService
  ) {}

  public async processUploadSession(
    userId: string,
    chatId: string,
    files: IUploadSessionFile[]
  ): Promise<IUploadSessionResult> {
    console.log(`[UploadSessionManager] Initiating session orchestration for user: ${userId}, chat: ${chatId}`);

    // 1. Validate authenticated session
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User authentication session is invalid or has expired.");
    }

    // 2. Validate Google Drive connection
    const isConnected = await this.driveService.isUserConnected(userId);
    if (!isConnected) {
      throw new Error("User Google Drive connection is not authenticated or authorized.");
    }

    // 3. Resolve Root Folder
    console.log(`[UploadSessionManager] Resolving permanent Google Drive root folder...`);
    const rootFolderId = await this.driveService.getOrCreateRootFolder(userId);
    if (!rootFolderId) {
      throw new Error("Could not resolve or create the permanent root folder 'WhatsAppToolMedia'.");
    }

    // 4. Resolve Chat Folder
    const chatName = await this.firestoreService.getChatName(userId, chatId);
    if (!chatName) {
      throw new Error(`Chat document with ID '${chatId}' could not be resolved or does not have a valid name.`);
    }

    console.log(`[UploadSessionManager] Resolving chat folder for '${chatName}' (${chatId})...`);
    const chatFolderId = await this.driveService.createChatFolder(userId, rootFolderId, chatName, chatId);
    if (!chatFolderId) {
      throw new Error(`Could not resolve or create the chat folder for chat: ${chatId}`);
    }

    // 5. For each media file, call Media Upload Engine
    const uploadedFiles: IDriveUploadResult[] = [];
    console.log(`[UploadSessionManager] Uploading ${files.length} media file(s) to chat folder...`);

    for (const file of files) {
      try {
        console.log(`[UploadSessionManager] Orchestrating upload of file: '${file.fileName}'...`);
        // We pass the resolved chatFolderId directly to uploadFile
        const uploadResult = await this.driveService.uploadFile(
          userId,
          chatFolderId,
          file.fileBuffer,
          file.fileName,
          file.mimeType
        );
        uploadedFiles.push(uploadResult);
      } catch (err: any) {
        console.error(`[UploadSessionManager] Error uploading file '${file.fileName}':`, err.message || err);
        throw new Error(`Upload session failed during file upload for '${file.fileName}': ${err.message || err}`);
      }
    }

    console.log(`[UploadSessionManager] Successfully completed upload session orchestration. Total files: ${uploadedFiles.length}`);

    return {
      success: true,
      chatId,
      chatFolderId,
      files: uploadedFiles,
    };
  }
}
