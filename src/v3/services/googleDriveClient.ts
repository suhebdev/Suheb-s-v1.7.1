/**
 * ============================================================================
 * Client Google Drive Proxy Service (V3 Architecture)
 * ============================================================================
 * Responsibility: Secure client wrapper for backend Google Drive endpoints:
 * - Create Chat folders and subfolders
 * - Upload original TXT source
 * - Upload GZIP batch payloads & oversized text messages
 * - Upload binary media assets
 */

import { getApiUrl } from "../../lib/api";
import { isFirebaseConfigured, getFirebaseAuth } from "../../lib/firebase";

export interface CreateChatFolderResponse {
  chatFolderId: string;
  driveFolderId?: string;
  chatTextFolderId: string;
  driveFolderName: string;
}

export interface DriveUploadResponse {
  driveFileId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export class GoogleDriveClient {
  private async getHeaders(): Promise<Record<string, string>> {
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
        console.warn("[GoogleDriveClient] Failed to obtain Firebase ID token:", err);
      }
    }
    return headers;
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(getApiUrl("/api/drive/verify"), { headers });
      if (response.ok) {
        const data = await response.json();
        return !!data.authorized;
      }
      return false;
    } catch (err) {
      console.error("[GoogleDriveClient] Failed to verify connection:", err);
      return false;
    }
  }

  public async createChatFolder(chatName: string, chatId: string): Promise<CreateChatFolderResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(getApiUrl("/api/drive/folders/chat"), {
      method: "POST",
      headers,
      body: JSON.stringify({ chatName, chatId }),
    });

    if (!response.ok) {
      let errMsg = `Failed to create chat folder (status: ${response.status})`;
      try {
        const errData = await response.json();
        if (errData?.error?.message) errMsg = errData.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    const resultData = data?.data || {};
    const resolvedChatFolderId = resultData.chatFolderId || resultData.driveFolderId || "";
    return {
      chatFolderId: resolvedChatFolderId,
      driveFolderId: resolvedChatFolderId,
      chatTextFolderId: resultData.chatTextFolderId || "",
      driveFolderName: resultData.driveFolderName || "",
    };
  }

  public async getOrCreateSubfolder(parentFolderId: string, subfolderName: string): Promise<string> {
    const headers = await this.getHeaders();
    const response = await fetch(getApiUrl("/api/drive/folders/subfolder"), {
      method: "POST",
      headers,
      body: JSON.stringify({ parentFolderId, subfolderName }),
    });

    if (!response.ok) {
      let errMsg = `Failed to create subfolder '${subfolderName}' (status: ${response.status})`;
      try {
        const errData = await response.json();
        if (errData?.error?.message) errMsg = errData.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.data.subfolderId;
  }

  public async uploadBase64File(
    folderId: string,
    fileName: string,
    mimeType: string,
    base64Data: string
  ): Promise<DriveUploadResponse> {
    const headers = await this.getHeaders();
    const response = await fetch(getApiUrl("/api/drive/upload"), {
      method: "POST",
      headers,
      body: JSON.stringify({ folderId, fileName, mimeType, base64Data }),
    });

    if (!response.ok) {
      let errMsg = `Failed to upload '${fileName}' to Drive (status: ${response.status})`;
      try {
        const errData = await response.json();
        if (errData?.error?.message) errMsg = errData.error.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data.data;
  }

  public async listFolderFiles(folderId: string, query?: string): Promise<Array<{ id: string; name: string; mimeType: string; size?: number }>> {
    const headers = await this.getHeaders();
    const baseUrl = getApiUrl(`/api/drive/folders/${folderId}/files`);
    const finalUrl = query ? `${baseUrl}?q=${encodeURIComponent(query)}` : baseUrl;

    const response = await fetch(finalUrl, { headers });
    if (!response.ok) {
      throw new Error(`Failed to list files in folder '${folderId}' (status: ${response.status})`);
    }

    const data = await response.json();
    return data.data || [];
  }

  public async downloadFileArrayBuffer(fileId: string): Promise<ArrayBuffer> {
    const headers = await this.getHeaders();
    const response = await fetch(getApiUrl(`/api/drive/files/${fileId}`), { headers });
    if (!response.ok) {
      throw new Error(`Failed to download file '${fileId}' (status: ${response.status})`);
    }
    return await response.arrayBuffer();
  }

  public async downloadFileBlob(fileId: string): Promise<Blob> {
    const headers = await this.getHeaders();
    const response = await fetch(getApiUrl(`/api/drive/files/${fileId}`), { headers });
    if (!response.ok) {
      throw new Error(`Failed to download file blob '${fileId}' (status: ${response.status})`);
    }
    return await response.blob();
  }
}

export const googleDriveClientInstance = new GoogleDriveClient();
