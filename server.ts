import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { ServiceContainer } from "./src/v3/backend/container";
import { ConfigLoader } from "./src/v3/backend/config";
import { globalErrorHandler } from "./src/v3/backend/middleware";
import { applicationFirewall } from "./backend/Security";
import healthRoutes from "./backend/routes/healthRoutes";

dotenv.config();

// Initialize server-side Firebase Admin SDK
let db: Firestore | null = null;
try {
  const rawCreds =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;

  if (rawCreds && rawCreds.trim()) {
    let decodedServiceAccount: any;
    const trimmed = rawCreds.trim();
    if (trimmed.startsWith("{")) {
      decodedServiceAccount = JSON.parse(trimmed);
    } else {
      decodedServiceAccount = JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
    }

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(decodedServiceAccount),
      });
    }
    db = getFirestore();
    console.log("[FIREBASE-ADMIN] Initialized server-side Firebase Admin SDK using provided service account key successfully.");
  } else {
    try {
      if (getApps().length === 0) {
        const configPath = path.join(process.cwd(), "firebase-applet-config.json");
        let projectId: string | undefined;
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          projectId = config.projectId;
        }
        initializeApp({
          projectId: projectId,
        });
      }
      db = getFirestore();
      console.log("[FIREBASE-ADMIN] Initialized server-side Firebase Admin SDK using application default credentials.");
    } catch (adcError: any) {
      console.warn("[FIREBASE-ADMIN] No service account credentials provided and default initialization failed. Firestore Admin SDK will not be available on server yet. Error:", adcError.message || adcError);
    }
  }
} catch (error) {
  console.error("[FIREBASE-ADMIN] Error initializing server-side Admin SDK:", error);
}

// Configuration variables loading
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "d6a54e115bc78f1ee2b15bd8a7993338";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure CORS to allow secure decoupled client requests
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global Application Firewall & Request Guard
  app.use(applicationFirewall);

  // Initialize and wire V2 backend dependency container
  const backend = ServiceContainer.get();

  // Mount V2 endpoints
  app.use("/api/auth", backend.authRouter);
  app.use("/api/drive", backend.driveRouter);
  app.use("/api/chats", backend.chatRouter);

  // Mount health check router
  app.use("/api", healthRoutes);

  // Centralized global error handling interceptor
  app.use(globalErrorHandler);

  // Vite middleware setup to mount SPA pages correctly in dev vs prod environments
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`[VITE] Vite middleware loaded successfully.`);
  } else {
    // In production build paths
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`[PRODUCTION] Static distributable files served from: ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Full-stack application listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal startup error leading to server failure:", err);
});
