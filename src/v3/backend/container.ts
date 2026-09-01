/**
 * ============================================================================
 * Backend Dependency Injection Container (SAD Section 16 & Section 6.10)
 * ============================================================================
 * Responsibility: Single entry point for compiling environment config,
 * instantiating all services, and wiring routing layers cleanly.
 */

import { ConfigLoader, BackendConfig } from "./config";
import { BackendAuthService, IBackendAuthService } from "./services/authService";
import { BackendDriveService, IBackendDriveService } from "./services/driveService";
import { BackendFirestoreService, IBackendFirestoreService } from "./services/firestoreService";
import { BackendUploadSessionManager, IBackendUploadSessionManager } from "./services/uploadSessionManager";
import { createAuthRouter } from "./routes/authRoutes";
import { createDriveRouter } from "./routes/driveRoutes";
import { createChatRouter } from "./routes/chatRoutes";
import { Router } from "express";

export interface BackendContainer {
  config: BackendConfig;
  authService: IBackendAuthService;
  driveService: IBackendDriveService;
  firestoreService: IBackendFirestoreService;
  uploadSessionManager: IBackendUploadSessionManager;
  authRouter: Router;
  driveRouter: Router;
  chatRouter: Router;
}

export class ServiceContainer {
  private static instance: BackendContainer | null = null;

  public static get(): BackendContainer {
    if (this.instance) {
      return this.instance;
    }

    // 1. Load and validate environment configuration
    const config = ConfigLoader.load();

    // 2. Instantiate core services in proper dependency order
    const firestoreService = new BackendFirestoreService();
    const authService = new BackendAuthService(config.encryptionKey, firestoreService);
    const driveService = new BackendDriveService(authService, firestoreService);
    const uploadSessionManager = new BackendUploadSessionManager(authService, driveService, firestoreService);

    // 3. Compile express routers with injected service dependencies
    const authRouter = createAuthRouter(authService, driveService);
    const driveRouter = createDriveRouter(driveService, uploadSessionManager, authService);
    const chatRouter = createChatRouter(firestoreService, driveService);

    this.instance = {
      config,
      authService,
      driveService,
      firestoreService,
      uploadSessionManager,
      authRouter,
      driveRouter,
      chatRouter,
    };

    console.log("[ServiceContainer] All backend service dependencies wired and initialized successfully.");
    return this.instance;
  }
}
