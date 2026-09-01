/**
 * ============================================================================
 * Backend Authentication & Cryptography Service (SAD Section 16.9)
 * ============================================================================
 * Responsibility: Managing Google OAuth authorization state, token validation,
 * and reversible secure encryption for client access tokens.
 */

import { ValidationError } from "../errors";
import crypto from "crypto";
import { google } from "googleapis";
import { ConfigLoader } from "../config";
import { IBackendFirestoreService } from "./firestoreService";

export interface IBackendAuthService {
  /**
   * Generates a secure authorization URL to redirect users for Google consent.
   */
  getGoogleAuthUrl(userId: string, email?: string, redirectUriOverride?: string): Promise<string>;

  /**
   * Validates state parameter and extracts userId if signature matches.
   */
  validateAndExtractUserId(state: string): string;

  /**
   * Receives authorization code from consent callback, exchanges it for 
   * credentials, encrypts them, and records them in the User document.
   */
  exchangeAndStoreTokens(userId: string, authCode: string, state?: string, redirectUriOverride?: string): Promise<void>;

  /**
   * Retrieves a valid, unexpired Access Token for the user.
   * If expired, automatically refreshes it using the stored encrypted Refresh Token.
   */
  getValidAccessToken(userId: string): Promise<string | null>;

  /**
   * Disconnects the user's Google Drive by removing tokens from database.
   */
  disconnect(userId: string): Promise<void>;

  /**
   * Encrypts plain token strings into safe AES hex-strings prior to DB writes.
   */
  encryptToken(plainText: string): string;

  /**
   * Decrypts AES ciphered tokens back into plain text credentials.
   */
  decryptToken(cipherText: string): string;
}

export class BackendAuthService implements IBackendAuthService {
  private algorithm = "aes-256-cbc";
  
  constructor(
    private readonly encryptionKey: string,
    private readonly firestoreService: IBackendFirestoreService
  ) {}

  private getOAuth2Client(redirectUriOverride?: string): any {
    const config = ConfigLoader.load();
    const finalRedirectUri = redirectUriOverride || config.googleRedirectUri || "http://localhost:3000/api/drive/callback";
    return new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      finalRedirectUri
    );
  }

  private generateOAuthState(userId: string): string {
    const timestamp = Date.now().toString();
    const dataToSign = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac("sha256", this.encryptionKey);
    hmac.update(dataToSign);
    const signature = hmac.digest("hex");
    return `${userId}:${timestamp}:${signature}`;
  }

  public validateAndExtractUserId(state: string): string {
    const parts = state.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid state parameter format.");
    }
    const [userId, timestamp, signature] = parts;
    const stateTime = parseInt(timestamp, 10);
    if (isNaN(stateTime) || Date.now() - stateTime > 15 * 60 * 1000) {
      throw new Error("OAuth state parameter has expired. Please retry authorization.");
    }
    const dataToSign = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac("sha256", this.encryptionKey);
    hmac.update(dataToSign);
    const expectedSignature = hmac.digest("hex");
    if (signature !== expectedSignature) {
      throw new Error("OAuth state validation failed. Possible tampered state or CSRF attack detected.");
    }
    return userId;
  }

  private validateOAuthState(state: string, userId: string): boolean {
    try {
      const extractedUserId = this.validateAndExtractUserId(state);
      return extractedUserId === userId;
    } catch (err) {
      return false;
    }
  }

  public async getGoogleAuthUrl(userId: string, email?: string, redirectUriOverride?: string): Promise<string> {
    const oauth2Client = this.getOAuth2Client(redirectUriOverride);
    const state = this.generateOAuthState(userId);
    
    const scopes = [
      "https://www.googleapis.com/auth/drive.file"
    ];

    const authOptions: any = {
      access_type: "offline",
      scope: scopes,
      state: state,
      prompt: "consent" // Force Consent to consistently obtain a Refresh Token
    };

    if (redirectUriOverride) {
      authOptions.redirect_uri = redirectUriOverride;
    }

    if (email) {
      authOptions.login_hint = email;
    }

    const authUrl = oauth2Client.generateAuthUrl(authOptions);

    console.log(`[BackendAuthService] Generated secure auth URL with signed CSRF state, redirectUri: ${redirectUriOverride || "default"}, login_hint: ${email || "none"} for user: ${userId}`);
    return authUrl;
  }

  public async exchangeAndStoreTokens(userId: string, authCode: string, state?: string, redirectUriOverride?: string): Promise<void> {
    console.log(`[BackendAuthService] Received authorization code (length: ${authCode?.length || 0}) for user: ${userId}`);

    if (state) {
      const isStateValid = this.validateOAuthState(state, userId);
      if (!isStateValid) {
        console.error(`[BackendAuthService] State validation failed for user: ${userId}`);
        throw new ValidationError("Google OAuth state validation failed. Possible CSRF attack detected.");
      }
    }

    const oauth2Client = this.getOAuth2Client(redirectUriOverride);
    try {
      console.log(`[BackendAuthService] Executing oauth2Client.getToken(authCode)...`);
      const { tokens } = await oauth2Client.getToken(
        redirectUriOverride
          ? { code: authCode, redirect_uri: redirectUriOverride }
          : authCode
      );
      
      console.log(`[BackendAuthService] Token exchange response for user ${userId}:`, {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        expiryDate: tokens.expiry_date,
        expiresIn: (tokens as any).expires_in
      });

      if (!tokens.access_token) {
        throw new ValidationError("Did not receive a valid Access Token from Google OAuth code exchange.");
      }

      // Read existing tokens if any, so we preserve refresh_token if Google didn't issue a new one
      let existingTokens: any = {};
      try {
        const existingTokensStr = await this.firestoreService.getUserTokens(userId);
        if (existingTokensStr) {
          existingTokens = JSON.parse(this.decryptToken(existingTokensStr));
        }
      } catch (err: any) {
        console.warn(`[BackendAuthService] Could not parse existing tokens for merging: ${err.message}`);
      }

      const mergedTokens = {
        ...existingTokens,
        ...tokens,
        refresh_token: tokens.refresh_token || existingTokens.refresh_token,
        expiry_date: tokens.expiry_date || (Date.now() + ((tokens as any).expires_in || 3600) * 1000)
      };

      console.log(`[BackendAuthService] Merged token credentials for ${userId}:`, {
        hasAccessToken: !!mergedTokens.access_token,
        hasRefreshToken: !!mergedTokens.refresh_token,
        expiryDate: mergedTokens.expiry_date
      });

      // Encrypt the credentials object containing tokens
      const encryptedTokens = this.encryptToken(JSON.stringify(mergedTokens));

      // Store in firestore user document
      await this.firestoreService.storeUserTokens(userId, encryptedTokens);
      console.log(`[BackendAuthService] Exchanged auth code and successfully saved credentials for user: ${userId}`);
    } catch (error: any) {
      console.error("[BackendAuthService] Error during token exchange:", {
        message: error.message,
        code: error.code,
        status: error.status,
        responseData: error.response?.data
      });
      throw new ValidationError(`Failed to exchange Google OAuth code: ${error.message || error}`);
    }
  }

  public async getValidAccessToken(userId: string): Promise<string | null> {
    const encryptedStr = await this.firestoreService.getUserTokens(userId);
    if (!encryptedStr) {
      console.log(`[BackendAuthService] No tokens found in DB for user: ${userId}`);
      return null;
    }

    let tokens: any;
    try {
      const decryptedStr = this.decryptToken(encryptedStr);
      tokens = JSON.parse(decryptedStr);
    } catch (err: any) {
      console.error(`[BackendAuthService] Decryption or JSON parse failed for ${userId}:`, err.message);
      return null;
    }

    if (!tokens || !tokens.access_token) {
      console.warn(`[BackendAuthService] Tokens object missing access_token for user: ${userId}`);
      return null;
    }

    // Check if expired or expiring soon (within 5 minutes buffer)
    const isExpired = tokens.expiry_date ? (Date.now() + 5 * 60 * 1000) > tokens.expiry_date : false;
    if (!isExpired) {
      return tokens.access_token;
    }

    // Attempt automatic refresh using Refresh Token
    if (!tokens.refresh_token) {
      console.warn(`[BackendAuthService] Access Token expired, but no Refresh Token exists for user: ${userId}. Returning access token as fallback.`);
      return tokens.access_token;
    }

    console.log(`[BackendAuthService] Access Token expired or expiring soon for user ${userId}. Refreshing...`);
    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token
      });

      const refreshResponse = await oauth2Client.refreshAccessToken();
      const newCredentials = refreshResponse.credentials;

      const updatedTokens = {
        ...tokens,
        ...newCredentials,
        refresh_token: newCredentials.refresh_token || tokens.refresh_token // Preserve old refresh token if new one is missing
      };

      const reEncryptedStr = this.encryptToken(JSON.stringify(updatedTokens));
      await this.firestoreService.storeUserTokens(userId, reEncryptedStr);

      console.log(`[BackendAuthService] Access Token successfully refreshed and persisted for user: ${userId}`);
      return updatedTokens.access_token;
    } catch (err: any) {
      console.error(`[BackendAuthService] Failed to automatically refresh access token for user ${userId}:`, {
        message: err.message,
        code: err.code,
        responseData: err.response?.data
      });
      return tokens.access_token || null;
    }
  }

  public async disconnect(userId: string): Promise<void> {
    await this.firestoreService.disconnectUserDrive(userId);
    console.log(`[BackendAuthService] Disconnected Google Drive for user: ${userId}`);
  }

  public encryptToken(plainText: string): string {
    try {
      const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(plainText, "utf8", "hex");
      encrypted += cipher.final("hex");
      return `${iv.toString("hex")}:${encrypted}`;
    } catch (err: any) {
      console.error("[BackendAuthService] Token encryption failed:", err.message);
      return plainText;
    }
  }

  public decryptToken(cipherText: string): string {
    try {
      if (!cipherText.includes(":")) return cipherText;
      const [ivHex, encryptedHex] = cipherText.split(":");
      const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err: any) {
      console.error("[BackendAuthService] Token decryption failed:", err.message);
      return cipherText;
    }
  }
}

