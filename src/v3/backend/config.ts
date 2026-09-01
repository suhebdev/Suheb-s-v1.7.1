/**
 * ============================================================================
 * Configuration Loader Layer (SAD Section 5.2)
 * ============================================================================
 * Responsibility: Secure loading, type-coercion, and runtime validation of
 * system environment variables.
 */

import { ValidationError } from "./errors";

export interface BackendConfig {
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  encryptionKey: string;
  firebaseServiceAccountBase64?: string;
  isProd: boolean;
}

export class ConfigLoader {
  private static configInstance: BackendConfig | null = null;

  public static clearCache(): void {
    this.configInstance = null;
  }

  public static load(): BackendConfig {
    if (this.configInstance) {
      return this.configInstance;
    }

    const isProd = process.env.NODE_ENV === "production";
    const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || "";
    const encryptionKey = process.env.ENCRYPTION_KEY || "d6a54e115bc78f1ee2b15bd8a7993338";
    const firebaseServiceAccountBase64 =
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_ADMIN_CREDENTIALS;

    if (encryptionKey.length < 16) {
      throw new ValidationError("CRITICAL: ENCRYPTION_KEY must be at least 16 characters for secure AES block cipher operations.");
    }

    this.configInstance = {
      googleClientId,
      googleClientSecret,
      googleRedirectUri,
      encryptionKey,
      firebaseServiceAccountBase64,
      isProd,
    };

    console.log("[ConfigLoader] Environment configuration loaded and validated successfully.");
    return this.configInstance;
  }
}
