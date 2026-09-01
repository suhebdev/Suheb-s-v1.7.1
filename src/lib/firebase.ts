import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, User as FirebaseUser } from "firebase/auth";
import { initializeFirestore, Firestore, doc, setDoc, enableIndexedDbPersistence } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

let app: FirebaseApp | null = null;
let authObj: Auth | null = null;
let dbObj: Firestore | null = null;

export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
};

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not fully configured yet. Please complete the Firebase setup in AI Studio.");
  }
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  const firebaseApp = getFirebaseApp();
  if (!authObj) {
    authObj = getAuth(firebaseApp);
  }
  return authObj;
}

export function getFirebaseFirestore(): Firestore {
  const firebaseApp = getFirebaseApp();
  if (!dbObj) {
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    const firestoreSettings = {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
    };
    if (dbId && dbId !== "(default)") {
      dbObj = initializeFirestore(firebaseApp, firestoreSettings, dbId);
    } else {
      dbObj = initializeFirestore(firebaseApp, firestoreSettings);
    }
    
    // Enable offline persistence for zero latency and robust offline fallback in sandboxed iframe environments
    if (typeof window !== "undefined") {
      enableIndexedDbPersistence(dbObj).catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn("Firestore offline persistence failed (multiple tabs open).");
        } else if (err.code === "unimplemented") {
          console.warn("Firestore offline persistence is not supported by this browser.");
        } else {
          console.warn("Firestore offline persistence fallback notice:", err);
        }
      });
    }
  }
  return dbObj;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncUserToFirestore(user: FirebaseUser): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const db = getFirebaseFirestore();
    const userRef = doc(db, "users", user.uid);
    const userDoc = {
      userId: user.uid,
      displayName: user.displayName || "Google User",
      email: user.email || "",
      picture: user.photoURL || "",
      createdAt: user.metadata.creationTime || new Date().toISOString()
    };
    await setDoc(userRef, userDoc, { merge: true });
    console.log("Successfully synced user to Firestore:", user.uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loginWithGoogleFirebase(): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  // Using signInWithPopup as recommended for this sandbox environment
  const result = await signInWithPopup(auth, provider);
  await syncUserToFirestore(result.user);
  return result.user;
}

export async function logoutFirebase(): Promise<void> {
  if (isFirebaseConfigured()) {
    const auth = getFirebaseAuth();
    await auth.signOut();
  }
}
