/**
 * ============================================================================
 * Backend Google Drive Service (SAD Section 16 & Section 2.3 Lesson 5)
 * ============================================================================
 * Responsibility: Executing server-authenticated file operations on the 
 * user's Google Drive. Acts as a direct proxy for client files.
 */

import { NotImplementedError } from "../errors";
import { IBackendAuthService } from "./authService";
import { IBackendFirestoreService } from "./firestoreService";
import { google } from "googleapis";
import { ConfigLoader } from "../config";

export interface IDriveUploadResult {
  driveFileId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export interface IBackendDriveService {
  /**
   * Asserts whether a user has active authorizations and valid credentials.
   */
  isUserConnected(userId: string): Promise<boolean>;

  /**
   * Creates the primary 'WhatsAppToolMedia' root folder if it does not already exist.
   * Returns the stable Google Drive Folder ID.
   */
  getOrCreateRootFolder(userId: string): Promise<string>;

  /**
   * Creates a dedicated chat-specific folder inside the root directory.
   */
  createChatFolder(userId: string, rootFolderId: string, chatName: string, chatId: string): Promise<string>;

  /**
   * Creates a named subfolder inside a given parent folder.
   */
  getOrCreateSubfolder(userId: string, parentFolderId: string, subfolderName: string): Promise<string>;

  /**
   * Receives binary payload and buffers it directly to the designated Google Drive folder.
   */
  uploadFile(userId: string, folderIdOrChatId: string, fileBuffer: Buffer, fileName: string, mimeType: string): Promise<IDriveUploadResult>;

  /**
   * Downloads a binary file's stream from Google Drive along with its mimeType and HTTP streaming headers.
   */
  downloadFile(
    userId: string,
    fileId: string,
    rangeHeader?: string
  ): Promise<{ mimeType: string; data: any; size?: number; contentRange?: string; status: number }>;

  /**
   * Lists files located inside a specified parent folder.
   */
  listFiles(userId: string, parentFolderId: string, query?: string): Promise<Array<{ id: string; name: string; mimeType: string; size?: number }>>;

  /**
   * Permanently deletes a specific chat folder from Google Drive, cleaning up all media files within it.
   */
  deleteChatFolder(userId: string, chatId: string): Promise<void>;
}

export class BackendDriveService implements IBackendDriveService {
  constructor(
    private readonly authService: IBackendAuthService,
    private readonly firestoreService: IBackendFirestoreService
  ) {}

  public async isUserConnected(userId: string): Promise<boolean> {
    try {
      const token = await this.authService.getValidAccessToken(userId);
      if (!token) {
        console.error(`[BackendDriveService] isUserConnected failed for ${userId}: getValidAccessToken returned null.`);
        return false;
      }

      console.log(`[BackendDriveService] Testing Drive API access for user: ${userId}`);
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ access_token: token });
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      const about = await drive.about.get({ fields: "user" });
      console.log(`[BackendDriveService] Google Drive API connection verified for user ${userId}: email = ${about.data.user?.emailAddress || "unknown"}`);
      return true;
    } catch (err: any) {
      console.error(`[BackendDriveService] Drive API verification failed for ${userId}:`, {
        message: err.message,
        code: err.code,
        status: err.status,
        responseData: err.response?.data
      });
      return false;
    }
  }

  private getOAuth2Client(): any {
    const config = ConfigLoader.load();
    return new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
  }

  public async getOrCreateRootFolder(userId: string): Promise<string> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User Google Drive is not connected or authorization is invalid.");
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    let rootFolderId = await this.firestoreService.getUserRootFolderId(userId);

    if (rootFolderId) {
      try {
        const response = await drive.files.get({
          fileId: rootFolderId,
          fields: "id, name, mimeType, trashed",
        });
        const file = response.data;
        if (file && !file.trashed && file.mimeType === "application/vnd.google-apps.folder") {
          console.log(`[BackendDriveService] Stored root folder ${rootFolderId} exists and is valid. Reusing...`);
          return rootFolderId;
        } else {
          console.log(`[BackendDriveService] Stored root folder ID ${rootFolderId} exists but is invalid/trashed.`);
        }
      } catch (err: any) {
        console.log(`[BackendDriveService] Stored root folder ${rootFolderId} could not be retrieved: ${err.message}`);
      }
    }

    console.log(`[BackendDriveService] Searching for existing WhatsAppToolMedia folder in user's Google Drive...`);
    try {
      const searchResponse = await drive.files.list({
        q: "name = 'WhatsAppToolMedia' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: "files(id, name, trashed, createdTime)",
        orderBy: "createdTime",
        spaces: "drive",
      });
      const files = searchResponse.data.files || [];
      if (files.length > 0) {
        const existingFolderId = files[0].id;
        if (existingFolderId) {
          console.log(`[BackendDriveService] Found existing folder named 'WhatsAppToolMedia' with ID ${existingFolderId} in Drive. Reusing...`);
          await this.firestoreService.storeUserRootFolderId(userId, existingFolderId);
          return existingFolderId;
        }
      }
    } catch (err: any) {
      console.error(`[BackendDriveService] Error searching for existing folder:`, err.message);
    }

    console.log(`[BackendDriveService] No existing folder found. Creating new 'WhatsAppToolMedia' root folder...`);
    try {
      const fileMetadata = {
        name: "WhatsAppToolMedia",
        mimeType: "application/vnd.google-apps.folder",
      };
      const createResponse = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id",
      });
      const newFolderId = createResponse.data.id;
      if (!newFolderId) {
        throw new Error("Failed to obtain folder ID from Google Drive folder creation response.");
      }
      console.log(`[BackendDriveService] Created 'WhatsAppToolMedia' root folder with ID ${newFolderId}. Storing...`);
      await this.firestoreService.storeUserRootFolderId(userId, newFolderId);
      return newFolderId;
    } catch (err: any) {
      console.error(`[BackendDriveService] Failed to create Google Drive folder:`, err.message);
      throw new Error(`Failed to create Google Drive root folder 'WhatsAppToolMedia': ${err.message}`);
    }
  }

  public async createChatFolder(userId: string, rootFolderId: string, chatName: string, chatId: string): Promise<string> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User Google Drive is not connected or authorization is invalid.");
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    let chatFolderId = await this.firestoreService.getChatDriveFolderId(userId, chatId);

    if (chatFolderId) {
      try {
        const response = await drive.files.get({
          fileId: chatFolderId,
          fields: "id, name, mimeType, trashed",
        });
        const file = response.data;
        if (file && !file.trashed && file.mimeType === "application/vnd.google-apps.folder") {
          console.log(`[BackendDriveService] Stored chat folder ${chatFolderId} exists and is valid. Reusing...`);
          return chatFolderId;
        } else {
          console.log(`[BackendDriveService] Stored chat folder ID ${chatFolderId} exists but is invalid/trashed.`);
        }
      } catch (err: any) {
        console.log(`[BackendDriveService] Stored chat folder ${chatFolderId} could not be retrieved: ${err.message}`);
      }
    }

    const folderName = `${chatName}_${chatId}`;
    console.log(`[BackendDriveService] Searching for existing chat folder named '${folderName}' inside root folder ${rootFolderId}...`);
    try {
      const searchResponse = await drive.files.list({
        q: `name = '${folderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, trashed, createdTime)",
        orderBy: "createdTime",
        spaces: "drive",
      });
      const files = searchResponse.data.files || [];
      if (files.length > 0) {
        const existingFolderId = files[0].id;
        if (existingFolderId) {
          console.log(`[BackendDriveService] Found existing chat folder named '${folderName}' with ID ${existingFolderId}. Reusing and storing...`);
          await this.firestoreService.storeChatDriveFolderId(userId, chatId, existingFolderId);
          return existingFolderId;
        }
      }
    } catch (err: any) {
      console.error(`[BackendDriveService] Error searching for existing chat folder:`, err.message);
    }

    console.log(`[BackendDriveService] No existing chat folder found. Creating new '${folderName}' inside root folder...`);
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootFolderId],
      };
      const createResponse = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id",
      });
      const newFolderId = createResponse.data.id;
      if (!newFolderId) {
        throw new Error("Failed to obtain folder ID from Google Drive folder creation response.");
      }
      console.log(`[BackendDriveService] Created chat folder with ID ${newFolderId}. Storing...`);
      await this.firestoreService.storeChatDriveFolderId(userId, chatId, newFolderId);
      return newFolderId;
    } catch (err: any) {
      console.error(`[BackendDriveService] Failed to create chat folder:`, err.message);
      throw new Error(`Failed to create Google Drive chat folder '${folderName}': ${err.message}`);
    }
  }

  public async getOrCreateSubfolder(userId: string, parentFolderId: string, subfolderName: string): Promise<string> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User Google Drive is not connected or authorization is invalid.");
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[BackendDriveService] Searching for subfolder '${subfolderName}' inside parent '${parentFolderId}'...`);
    try {
      const searchResponse = await drive.files.list({
        q: `name = '${subfolderName}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name, trashed)",
        spaces: "drive",
      });
      const files = searchResponse.data.files || [];
      if (files.length > 0 && files[0].id) {
        console.log(`[BackendDriveService] Found existing subfolder '${subfolderName}' with ID: ${files[0].id}`);
        return files[0].id;
      }
    } catch (err: any) {
      console.error(`[BackendDriveService] Error searching for subfolder '${subfolderName}':`, err.message);
    }

    console.log(`[BackendDriveService] Creating new subfolder '${subfolderName}' inside parent '${parentFolderId}'...`);
    try {
      const fileMetadata = {
        name: subfolderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      };
      const createResponse = await drive.files.create({
        requestBody: fileMetadata,
        fields: "id",
      });
      const newFolderId = createResponse.data.id;
      if (!newFolderId) {
        throw new Error(`Failed to obtain folder ID for created subfolder '${subfolderName}'.`);
      }
      return newFolderId;
    } catch (err: any) {
      console.error(`[BackendDriveService] Failed to create subfolder '${subfolderName}':`, err.message);
      throw new Error(`Failed to create subfolder '${subfolderName}': ${err.message}`);
    }
  }

  public async uploadFile(
    userId: string,
    folderIdOrChatId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<IDriveUploadResult> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User Google Drive is not connected or authorization is invalid.");
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    let targetFolderId = folderIdOrChatId;

    try {
      // 1. Resolve the Root Folder (Phase 2.3)
      const rootFolderId = await this.getOrCreateRootFolder(userId);

      // 2. Resolve the Chat Folder (Phase 2.4)
      const chatName = await this.firestoreService.getChatName(userId, folderIdOrChatId);
      if (chatName) {
        console.log(`[BackendDriveService] Resolving chat folder for chatId ${folderIdOrChatId} (chatName: ${chatName})...`);
        targetFolderId = await this.createChatFolder(userId, rootFolderId, chatName, folderIdOrChatId);
      } else {
        console.log(`[BackendDriveService] folderIdOrChatId (${folderIdOrChatId}) is not a recognized chatId or has no name. Treating as direct folder ID.`);
      }

      // 3. Import readable stream from buffer
      const { Readable } = await import("stream");
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);

      // 4. Upload the file to Google Drive
      console.log(`[BackendDriveService] Uploading file '${fileName}' to Google Drive folder '${targetFolderId}'...`);
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId],
        },
        media: {
          mimeType: mimeType,
          body: bufferStream,
        },
        fields: "id, name, mimeType, size",
      });

      const file = response.data;
      if (!file || !file.id) {
        throw new Error("Failed to receive valid file metadata from Google Drive API.");
      }

      console.log(`[BackendDriveService] Successfully uploaded file '${fileName}' to Google Drive. File ID: ${file.id}`);

      return {
        driveFileId: file.id,
        originalFileName: file.name || fileName,
        mimeType: file.mimeType || mimeType,
        fileSize: file.size ? parseInt(file.size, 10) : fileBuffer.length,
      };
    } catch (err: any) {
      console.error(`[BackendDriveService] Error uploading file to Google Drive:`, err.message || err);
      throw new Error(`Google Drive upload failed: ${err.message || err}`);
    }
  }

  public async downloadFile(
    userId: string,
    fileId: string,
    rangeHeader?: string
  ): Promise<{ mimeType: string; data: any; size?: number; contentRange?: string; status: number }> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User Google Drive is not connected or authorization is invalid.");
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 1. Get file metadata first (mimeType, file size)
    console.log(`[BackendDriveService] Fetching metadata for Google Drive file ${fileId}...`);
    const metadataResponse = await drive.files.get({
      fileId,
      fields: "mimeType, size",
    });
    const mimeType = metadataResponse.data.mimeType || "application/octet-stream";
    const fileSize = metadataResponse.data.size ? parseInt(metadataResponse.data.size, 10) : undefined;

    // 2. Stream binary content with range headers forwarded if requested
    console.log(`[BackendDriveService] Streaming binary content for Google Drive file ${fileId} with mimeType ${mimeType}, range: ${rangeHeader || "full"}...`);
    const requestHeaders: Record<string, string> = {};
    if (rangeHeader) {
      requestHeaders["Range"] = rangeHeader;
    }

    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "stream",
        headers: requestHeaders,
      }
    );

    const contentRange = (response.headers as any)?.["content-range"] || (response.headers as any)?.["Content-Range"];
    const status = response.status || (rangeHeader ? 206 : 200);

    return {
      mimeType,
      data: response.data,
      size: fileSize,
      contentRange,
      status,
    };
  }

  public async listFiles(
    userId: string,
    parentFolderId: string,
    query?: string
  ): Promise<Array<{ id: string; name: string; mimeType: string; size?: number }>> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error("User Google Drive is not connected or authorization is invalid.");
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    let q = `'${parentFolderId}' in parents and trashed = false`;
    if (query) {
      q += ` and (${query})`;
    }

    const response = await drive.files.list({
      q,
      fields: "files(id, name, mimeType, size)",
      orderBy: "name",
      pageSize: 1000,
      spaces: "drive",
    });

    const files = response.data.files || [];
    return files.map((f) => ({
      id: f.id || "",
      name: f.name || "",
      mimeType: f.mimeType || "",
      size: f.size ? parseInt(f.size, 10) : undefined,
    }));
  }

  public async deleteChatFolder(userId: string, chatId: string): Promise<void> {
    const accessToken = await this.authService.getValidAccessToken(userId);
    if (!accessToken) {
      console.log(`[BackendDriveService] User Google Drive is not connected or authorization is invalid for deletion. Skipping Drive deletion.`);
      return;
    }

    const chatFolderId = await this.firestoreService.getChatDriveFolderId(userId, chatId);
    if (!chatFolderId) {
      console.log(`[BackendDriveService] No Google Drive folder stored for chat ${chatId}. Skipping Drive deletion.`);
      return;
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`[BackendDriveService] Permanently deleting Google Drive folder ${chatFolderId} for chat ${chatId}...`);
    try {
      await drive.files.delete({
        fileId: chatFolderId,
      });
      console.log(`[BackendDriveService] Successfully deleted Google Drive folder ${chatFolderId} for chat ${chatId}.`);
    } catch (err: any) {
      console.error(`[BackendDriveService] Error deleting Google Drive folder ${chatFolderId}:`, err.message || err);
      if (err.status === 404 || err.code === 404) {
        console.log(`[BackendDriveService] Google Drive folder ${chatFolderId} was already deleted (404).`);
      } else {
        throw new Error(`Google Drive folder deletion failed: ${err.message || err}`);
      }
    }
  }
}
