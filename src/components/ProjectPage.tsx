import React, { useState, useEffect, FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send,
  Smartphone, 
  Code2, 
  Zap, 
  Database, 
  Bell, 
  Gamepad2, 
  Users, 
  Trophy, 
  Download, 
  Clock, 
  AlertTriangle,
  Lock,
  Globe, 
  Shield, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Terminal, 
  ArrowRight, 
  ChevronRight, 
  AlertCircle,
  Cpu,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  MessageSquare,
  HardDrive,
  Key,
  CheckCircle2,
  X
} from "lucide-react";
import { AnimatedPrice, SettingsIconAnimated } from "./Components";

// Real Projects data structures embedded verbatim
export interface ProjectVariant {
  id: "web" | "saas" | "expo" | string;
  label: string;
  subtitle: string;
  codeFileName: string;
  techStack: string[];
  folderStructure: string;
  setupSteps: string[];
  codeContent: string;
}

export interface BuiltProjectItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  price: string;
  variants: {
    web: ProjectVariant;
    expo: ProjectVariant;
  };
}

export const embeddedBuiltProjects: BuiltProjectItem[] = [
  {
    id: "firebase-otp",
    title: "Firebase Authentication (Phone Number + OTP)",
    badge: "PRODUCTION READY SECURE SMS SIGN-IN Gateway",
    description: "A production-grade, frictionless OTP verification template configured using standard Firebase Auth. Enables micro-businesses to implement swift SMS authentication in under 5 minutes. Includes custom UI fields, automatic validation state controls, and guides.",
    price: "₹99",
    variants: {
      web: {
        id: "web",
        label: "Web Integration SDK",
        subtitle: "Firebase Web SDK 10+ Complete Code & Guide",
        codeFileName: "firebase-phone-auth-web.zip",
        techStack: ["React 18+", "Firebase Auth v10", "Recaptcha Verifier", "Tailwind CSS"],
        folderStructure: `Phone_Auth_OTP_Web_SDK.zip/
├── App.jsx                # Layout wrapper & OTP authentication context provider
├── main.jsx               # Native DOM element rendering hook entrypoint
├── config.js              # Initialized Firebase client SDK options config
├── auth.js                # Send SMS OTP & verify input authentication rules
├── AuthPage.jsx           # Phone verification layout & Verification input UI
└── HomePage.jsx           # Secure dashboard profile details & log session screen`,
        setupSteps: [
          "Enable Phone Authentication inside your Firebase developer console 'Authentication > Sign-in method' panel.",
          "Open 'config.js' and replace parameters inside 'firebaseConfig' with your own Firebase Project API keys.",
          "Import 'sendOtp' and 'verifyOtp' from 'auth.js' into your authentication trigger functions inside 'AuthPage.jsx'.",
          "Set up the invisible recaptcha container div (<div id=\"recaptcha-container\"></div>) in your main page and test live SMS deliveries."
        ],
        codeContent: `// ==========================================
// FIREBASE WEBSDK SECURE PHONE LOGIN PROTOCOL
// Created by Suheb Khan // VibeCoder Systems
// ==========================================

import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_apiKey_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function dispatchSMSVerification(phoneNumber: string, containerId: string) {
  try {
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        console.log("Invisible Recaptcha handshake verified successfully!");
      }
    });

    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return { success: true, confirmationResult };
  } catch (error: any) {
    console.error("SMS dispatcher error handshake failed:", error);
    return { success: false, error: error.message };
  }
}`
      },
      expo: {
        id: "expo",
        label: "Expo React Native App",
        subtitle: "Expo App Router + Mobile Touch Layout System",
        codeFileName: "firebase-phone-auth-expo.zip",
        techStack: ["Expo Router", "React Native", "Firebase Native SDK", "Async Storage"],
        folderStructure: `app/
├── (auth)/
│   ├── index.js           # Interactive phone input, invisible Recaptcha binding
│   └── verify.js          # Dynamic 6-digit verification code input screen
├── _layout.js             # Session security list & Global Font providers
├── config/
│   └── firebase.js        # Native Firebase Persistent Auth Initializer
└── package.json           # Touch target ready React Native dependencies`,
        setupSteps: [
          "Include our managed auth files (index.js, verify.js, firebase.js) inside your Expo project structure.",
          "Generate your SHA-1 application fingerprint credentials inside your terminal or Android Studio.",
          "Associate the generated SHA-1 signature inside your Firebase Android App settings page to permit OTP requests.",
          "Run 'npx expo start' and load your project inside Expo Go to trigger real mobile verification SMS deliveries."
        ],
        codeContent: `// ==========================================
// EXPO REACT NATIVE MOBILE FIREBASE AUTH
// Created by Suheb Khan // VibeCoder Systems
// ==========================================

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "YOUR_MOBILE_apiKey_SECRET",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});`
      }
    }
  },
  {
    id: "firebase-google-oauth",
    title: "Firebase Authentication via Google OAuth",
    badge: "PRODUCTION READY GOOGLE SSO FLOW",
    description: "A production-grade, seamless Google Sign-In system. Let users log in or register instantly using their existing Google account credentials. Features safe JWT profile synchronization, elegant custom client action triggers, and secure redirect handlers.",
    price: "₹99",
    variants: {
      web: {
        id: "web",
        label: "Web Integration SDK",
        subtitle: "Secure Popup-based Google SSO for Web Apps",
        codeFileName: "firebase-google-auth-web.zip",
        techStack: ["React 18+", "Firebase WebSDK 10", "GoogleAuthProvider", "Tailwind CSS"],
        folderStructure: `Google_Auth_Web_SDK.zip/
├── App.jsx                # Layout wrapper & Google SSO authorization context
├── main.jsx               # HTML physical mount point & root renderer
├── config.js              # Initialized Firebase clients & API keys config
├── auth.js                # Google popup Sign-In implementation callbacks
├── AuthPage.jsx           # Clean layout with custom Google sign button UI
└── HomePage.jsx           # Dashboard panel displaying retrieved profile Claims`,
        setupSteps: [
          "Configure Google Sign-In inside your Firebase Console 'Authentication' menu, and retrieve the web clients Client ID.",
          "In Google Cloud Console, verify that authorized redirect URIs are configured properly (e.g., matching localhost:3000).",
          "Update 'config.js' with your project keys, and invoke 'signInWithGoogle' from 'auth.js' on click of the sign-in button.",
          "Run 'npm run dev', click the sign button, and receive your returned Google user profile claims instantly."
        ],
        codeContent: `// ==========================================
// FIREBASE WEB SECURE GOOGLE SSO PROVIDER
// Created by Suheb Khan // VibeCoder Systems
// ==========================================

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const fbConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com"
};

const app = initializeApp(fbConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

export async function handleGoogleSignIn() {
  try {
    const response = await signInWithPopup(auth, provider);
    const idToken = await response.user.getIdToken();
    return {
      success: true,
      user: {
        name: response.user.displayName,
        email: response.user.email,
        avatar: response.user.photoURL
      },
      idToken
    };
  } catch (error: any) {
    console.error("Google SSO connection aborted:", error);
    return { success: false, error: error.message };
  }
}`
      },
      expo: {
        id: "expo",
        label: "Expo React Native App",
        subtitle: "Expo Auth Session + Managed Mobile Sign-In Stack",
        codeFileName: "firebase-google-auth-expo.zip",
        techStack: ["Expo Auth Session", "Web Browser proxy", "Firebase Auth Native", "Deep Linking"],
        folderStructure: `Google_Auth_React_Native_Application.zip/
├── src/
│   ├── firebase/
│   │   ├── auth.js        # Native Google Sign-In and sign-out logic
│   │   └── config.js      # App key configuration and credentials initializer
│   ├── pages/
│   │   ├── HomePage.jsx   # Profile visual layout & token detail viewer
│   │   └── AuthPage.jsx   # Custom UI screen triggering Expo AuthSession
│   ├── App.jsx            # Multi-screen application router configuration
│   └── main.jsx           # Mount/register physical mobile application root
├── app.json               # Mobile deep linking URL custom scheme definitions
├── babel.config.js        # Babel configuration settings for react-native
├── package.json           # Native mobile app dependencies and script keys
├── README.md              # Clear setup guidelines & execution checklist
└── .gitignore             # Local files, nodes and caching ignore mappings`,
        setupSteps: [
          "Add 'firebase/auth.js', 'firebase/config.js' and components from the zip into your 'src' folder.",
          "Open 'app.json' and make sure the 'scheme' key is registered (e.g., '\"scheme\": \"yourcustomscheme\"') to ensure redirect deep link support.",
          "Initialize Google OAuth client IDs for Android, iOS, and Web inside 'src/firebase/auth.js' hook options.",
          "Start your bundler using 'npx expo start' and use our hook context functions to trigger native authentication prompts."
        ],
        codeContent: `// ==========================================
// EXPO Managed GOOGLE SSO INTEGRATION FLOW
// Created by Suheb Khan // VibeCoder Systems
// ==========================================

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

const firebaseConfig = { apiKey: "YOUR_EXPO_MOBILE_API_KEY_SECRET" };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function useGoogleMobileSignInHook() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID_apps.googleusercontent.com'
  });

  return { request, response, promptAsync };
}`
      }
    }
  }
];

interface ProjectPageProps {
  key?: string;
  onHireClick: () => void;
  onRequestCustomBuild?: () => void;
  onSetSelectedPurchaseItem: (item: any) => void;
  onAddToast: (message: string, type: "success" | "error" | "instruction" | "alert") => void;
  projectPlatformStates: Record<string, "web" | "expo">;
  setProjectPlatformStates: React.Dispatch<React.SetStateAction<Record<string, "web" | "expo">>>;
}

export default function ProjectPage({
  onHireClick,
  onRequestCustomBuild,
  onSetSelectedPurchaseItem,
  onAddToast,
  projectPlatformStates,
  setProjectPlatformStates
}: ProjectPageProps) {
  const [activeModal, setActiveModal] = useState<"whatsapp" | "lostgames" | "security-firewall" | "firebase-otp" | "firebase-google-oauth" | null>(null);
  
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal]);

  const triggerSystemAlert = (message: string) => {
    let mappedType: "success" | "error" | "instruction" | "alert" = "alert";
    const lower = message.toLowerCase();
    if (lower.includes("successfully") || lower.includes("authorized") || lower.includes("success")) {
      mappedType = "success";
    } else if (lower.includes("incorrect") || lower.includes("mismatch") || lower.includes("valid") || lower.includes("error")) {
      mappedType = "error";
    } else if (lower.includes("instruction") || lower.includes("setup") || lower.includes("compiling")) {
      mappedType = "instruction";
    }
    onAddToast(message, mappedType);
  };

  return (
    <motion.div
      key="projects"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="space-y-6 sm:space-y-8 text-left w-full select-text"
    >
      <Helmet>
        <title>React Native &amp; Firebase Projects – WhatsApp Chat Parser, LostGames &amp; Web SDK Examples</title>
        <meta name="description" content="Explore React Native, Expo, Firebase, Google OAuth, and web utility projects including WhatsApp Chat Parser &amp; Interactive Viewer, LostGames mobile app, Firebase Phone OTP authentication, and Google SSO Web SDK integration examples." />
        <meta name="keywords" content="react native expo projects, firebase authentication project, whatsapp chat parser react project, google oauth firebase web sdk, react native game app project, expo mobile app portfolio, firebase phone otp example, web sdk integration examples" />
        <link rel="canonical" href="https://suhebdev.rf.gd/Projects/" />

        {/* Open Graph */}
        <meta property="og:title" content="React Native &amp; Firebase Projects – WhatsApp Chat Parser, LostGames &amp; Web SDK Examples" />
        <meta property="og:description" content="Explore React Native, Expo, Firebase, Google OAuth, and web utility projects including WhatsApp Chat Parser &amp; Interactive Viewer, LostGames mobile app, Firebase Phone OTP authentication, and Google SSO Web SDK integration examples." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://suhebdev.rf.gd/Projects/" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="React Native &amp; Firebase Projects – WhatsApp Chat Parser, LostGames &amp; Web SDK Examples" />
        <meta name="twitter:description" content="Explore React Native, Expo, Firebase, Google OAuth, and web utility projects including WhatsApp Chat Parser &amp; Interactive Viewer, LostGames mobile app, Firebase Phone OTP authentication, and Google SSO Web SDK integration examples." />

        {/* Structured Data (ItemList) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Featured React Native and Firebase Projects",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "WhatsApp Chat Parser & Interactive Viewer",
                "url": "https://suhebdev.rf.gd/Tools/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "LostGames – React Native + Expo Mobile App",
                "url": "https://suhebdev.rf.gd/Projects/"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": "Firebase Phone Authentication (OTP)",
                "url": "https://suhebdev.rf.gd/Projects/"
              },
              {
                "@type": "ListItem",
                "position": 4,
                "name": "Firebase Google OAuth SSO",
                "url": "https://suhebdev.rf.gd/Projects/"
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Header section */}
      <div className="space-y-2.5 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full max-w-max select-none">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="text-[10px] font-mono text-neutral-600 font-medium uppercase tracking-wider">
            SUHEB KHAN // PORTFOLIO_V2.0_SSO_SYSTEMS
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight uppercase leading-none">
          Interactive Project Matrix
        </h1>
        <p className="text-xs text-neutral-500 font-mono leading-relaxed">
          Explore production-ready auth integrations and workspace templates developed by Suheb Khan. Play with live simulated sandbox systems inline, view directory mappings, and purchase complete ZIP source code packages to fast-track your app deployment.
        </p>
      </div>

      {/* Stats display */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-2.5 select-none">
        <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-widest uppercase">
          // FEATURED SHOWCASE: 2 HERO APPLICATIONS + 4 DEPLOYMENT BLUEPRINTS
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
            Offline Local-Cache Persistence OK
          </span>
        </div>
      </div>

      {/* Featured Hero Showcase Row: Fits within initial desktop viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 w-full items-stretch">
        <WhatsAppParserProjectCard onOpenDetails={() => setActiveModal("whatsapp")} />
        <LostGamesProjectCard onOpenDetails={() => setActiveModal("lostgames")} />
      </div>

      {/* Supporting Repositories & Firebase Section: Security / Firewall card followed by stacked Firebase authenticators */}
      <div className="space-y-6 pt-4 border-t border-neutral-200/80">
        <div className="flex flex-wrap items-center justify-between gap-2 select-none">
          <span className="text-xs font-mono font-bold text-neutral-400 tracking-wider uppercase">
            // SECURITY & AUTHENTICATION BLUEPRINTS
          </span>
          <span className="text-[10px] font-mono text-neutral-400">
            COMPACT MATRIX
          </span>
        </div>

        {/* 1. Security / Firewall (Standalone Compact Card) */}
        <SecurityGuardProjectCard 
          onOpenDetails={() => setActiveModal("security-firewall")} 
          onDownloadClick={() => onAddToast("Download package is not available yet.", "alert")}
        />

        {/* 2 & 3. Firebase Authentication Projects (Stacked Vertically) */}
        <div className="flex flex-col gap-6 w-full">
          {embeddedBuiltProjects.map((project) => {
            const activeVariantKey = projectPlatformStates[project.id] || "web";
            const setActiveVariantKey = (vId: "web" | "expo") => {
              setProjectPlatformStates((prev) => ({
                ...prev,
                [project.id]: vId
              }));
            };
            return (
              <FirebaseProjectCard
                key={project.id}
                project={project}
                activeVariantKey={activeVariantKey}
                setActiveVariantKey={setActiveVariantKey}
                onOpenDetails={() => setActiveModal(project.id as "firebase-otp" | "firebase-google-oauth")}
                onDownloadClick={(variant) => {
                  onSetSelectedPurchaseItem({
                    id: project.id,
                    title: project.title,
                    tech: variant.techStack.join(" + "),
                    description: project.description + " - " + variant.subtitle,
                    price: "₹99",
                    codeFileName: variant.codeFileName,
                    codeContent: variant.codeContent,
                    initialVariant: activeVariantKey,
                    variants: {
                      web: {
                        codeFileName: project.variants.web.codeFileName,
                        codeContent: project.variants.web.codeContent,
                        tech: project.variants.web.techStack.join(" + "),
                        description: project.description + " - " + project.variants.web.subtitle
                      },
                      expo: {
                        codeFileName: project.variants.expo.codeFileName,
                        codeContent: project.variants.expo.codeContent,
                        tech: project.variants.expo.techStack.join(" + "),
                        description: project.description + " - " + project.variants.expo.subtitle
                      }
                    }
                  });
                }}
                triggerSystemAlert={triggerSystemAlert}
              />
            );
          })}
        </div>
      </div>

      {/* Custom request prompt card banner (Positioned at bottom) */}
      <div className="bg-neutral-50/70 border border-neutral-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left select-none relative overflow-hidden mt-2">
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-600" />
        <div className="space-y-1 max-w-xl">
          <h4 className="text-sm font-black text-neutral-950 uppercase font-sans tracking-tight">Need a custom feature compiled for your project?</h4>
          <p className="text-[11px] text-neutral-500 leading-relaxed font-mono">Suheb designs tailor-made solutions tailored directly to individual system needs - from Google SSO to clean database operations syncs.</p>
        </div>
        <button
          onClick={onRequestCustomBuild || onHireClick}
          className="px-5 py-2.5 bg-blue-600 hover:bg-neutral-950 text-white text-xs font-black rounded-full font-mono transition-colors shrink-0 cursor-pointer shadow-sm flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Request Custom Code Build</span>
        </button>
      </div>

      {/* Interactive Project Details Modal */}
      {createPortal(
        <AnimatePresence>
          {activeModal && (
            <div 
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 z-[99990] flex items-center justify-center p-4"
            >
              <motion.div
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={false}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.15, ease: "easeIn" }}
                className="bg-white border border-neutral-200 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl p-6 sm:p-8 space-y-6 text-left relative font-mono text-neutral-800 z-10"
              >
                <button
                  onClick={() => setActiveModal(null)}
                  className="absolute top-5 right-5 p-2 text-neutral-400 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {activeModal === "whatsapp" && <WhatsAppFullSpecsModal onClose={() => setActiveModal(null)} />}
                {activeModal === "lostgames" && <LostGamesFullSpecsModal onClose={() => setActiveModal(null)} />}
                {activeModal === "security-firewall" && <SecurityFirewallFullSpecsModal onClose={() => setActiveModal(null)} />}
                {activeModal === "firebase-otp" && (
                  <FirebaseOtpFullSpecsModal 
                    onClose={() => setActiveModal(null)}
                    activeVariantKey={projectPlatformStates["firebase-otp"] || "web"}
                    setActiveVariantKey={(vId) => setProjectPlatformStates(prev => ({ ...prev, "firebase-otp": vId }))}
                    project={embeddedBuiltProjects[0]}
                    onDownloadClick={(variant) => {
                      setActiveModal(null);
                      onSetSelectedPurchaseItem({
                        id: "firebase-otp",
                        title: embeddedBuiltProjects[0].title,
                        tech: variant.techStack.join(" + "),
                        description: embeddedBuiltProjects[0].description + " - " + variant.subtitle,
                        price: "₹99",
                        codeFileName: variant.codeFileName,
                        codeContent: variant.codeContent,
                        initialVariant: projectPlatformStates["firebase-otp"] || "web",
                        variants: {
                          web: {
                            codeFileName: embeddedBuiltProjects[0].variants.web.codeFileName,
                            codeContent: embeddedBuiltProjects[0].variants.web.codeContent,
                            tech: embeddedBuiltProjects[0].variants.web.techStack.join(" + "),
                            description: embeddedBuiltProjects[0].description + " - " + embeddedBuiltProjects[0].variants.web.subtitle
                          },
                          expo: {
                            codeFileName: embeddedBuiltProjects[0].variants.expo.codeFileName,
                            codeContent: embeddedBuiltProjects[0].variants.expo.codeContent,
                            tech: embeddedBuiltProjects[0].variants.expo.techStack.join(" + "),
                            description: embeddedBuiltProjects[0].description + " - " + embeddedBuiltProjects[0].variants.expo.subtitle
                          }
                        }
                      });
                    }}
                  />
                )}
                {activeModal === "firebase-google-oauth" && (
                  <FirebaseGoogleFullSpecsModal 
                    onClose={() => setActiveModal(null)}
                    activeVariantKey={projectPlatformStates["firebase-google-oauth"] || "web"}
                    setActiveVariantKey={(vId) => setProjectPlatformStates(prev => ({ ...prev, "firebase-google-oauth": vId }))}
                    project={embeddedBuiltProjects[1]}
                    onDownloadClick={(variant) => {
                      setActiveModal(null);
                      onSetSelectedPurchaseItem({
                        id: "firebase-google-oauth",
                        title: embeddedBuiltProjects[1].title,
                        tech: variant.techStack.join(" + "),
                        description: embeddedBuiltProjects[1].description + " - " + variant.subtitle,
                        price: "₹99",
                        codeFileName: variant.codeFileName,
                        codeContent: variant.codeContent,
                        initialVariant: projectPlatformStates["firebase-google-oauth"] || "web",
                        variants: {
                          web: {
                            codeFileName: embeddedBuiltProjects[1].variants.web.codeFileName,
                            codeContent: embeddedBuiltProjects[1].variants.web.codeContent,
                            tech: embeddedBuiltProjects[1].variants.web.techStack.join(" + "),
                            description: embeddedBuiltProjects[1].description + " - " + embeddedBuiltProjects[1].variants.web.subtitle
                          },
                          expo: {
                            codeFileName: embeddedBuiltProjects[1].variants.expo.codeFileName,
                            codeContent: embeddedBuiltProjects[1].variants.expo.codeContent,
                            tech: embeddedBuiltProjects[1].variants.expo.techStack.join(" + "),
                            description: embeddedBuiltProjects[1].description + " - " + embeddedBuiltProjects[1].variants.expo.subtitle
                          }
                        }
                      });
                    }}
                  />
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </motion.div>
  );
}

// ============================================
// WHATSAPP CHAT PARSER & VIEWER PROJECT CARD (COMPACT HERO)
// ============================================
export function WhatsAppParserProjectCard({ onOpenDetails }: { onOpenDetails?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 hover:border-emerald-300 transition-all shadow-sm relative overflow-hidden flex flex-col justify-between h-full w-full group">
      {/* Decorative Emerald Gradient Bar matching clean theme */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400" />
      
      <div className="space-y-3 text-left">
        {/* Card Top Row: Icon + Title + Version Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <MessageSquare className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight uppercase leading-snug">
                  WhatsApp Parser & Viewer
                </h3>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Full-Stack Web Tool // React + Express + Drive API
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase shrink-0">
            v3.0 • LIVE TOOL
          </span>
        </div>

        {/* Concise 1-sentence description */}
        <p className="text-xs text-neutral-600 font-mono leading-relaxed">
          Full-stack WhatsApp export analyzer with zero-knowledge client parsing, direct Google Drive backup import, and streaming.
        </p>

        {/* Tech Badges with Wrap */}
        <div className="flex flex-wrap items-center gap-1.5 py-0.5 select-none">
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <HardDrive className="w-3 h-3" />
            <span>Drive API</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <Key className="w-3 h-3" />
            <span>Firebase Auth</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <Zap className="w-3 h-3" />
            <span>Streaming</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span>Zero Server Store</span>
          </span>
        </div>

        {/* Highlight Points (1-2 points) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
            <span className="text-emerald-600 font-bold select-none shrink-0">&gt;</span>
            <span>Cloud backup import with OAuth token exchange & streaming</span>
          </div>
          <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
            <span className="text-emerald-600 font-bold select-none shrink-0">&gt;</span>
            <span>Memory-efficient chunked file decompression & view-once media</span>
          </div>
        </div>
      </div>

      {/* Action Footer (Single Horizontal Line for Buttons) */}
      <div className="mt-5 pt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2 select-none">
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
        >
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>View Specs</span>
        </button>

        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            navigate("/tools");
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
        >
          <span>Launch Tool</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// LOST GAMES PROJECT CARD (COMPACT HERO)
// ============================================
export function LostGamesProjectCard({ onOpenDetails }: { onOpenDetails?: () => void }) {
  const downloadLink = "https://github.com/suhebdev/LostGames/releases/download/v1.0.1/LostGames.apk";

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-sm relative overflow-hidden flex flex-col justify-between h-full w-full group">
      {/* Decorative Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-neutral-900 via-neutral-700 to-neutral-400" />
      
      <div className="space-y-3 text-left">
        {/* Card Top Row: Icon + Title + Version Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-sm shrink-0">
              <Gamepad2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight uppercase leading-snug">
                  LostGames
                </h3>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Android App // React Native + Expo
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[9px] font-mono font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full uppercase shrink-0">
            v1.0.1 • ANDROID APP
          </span>
        </div>

        {/* Concise 1-sentence description */}
        <p className="text-xs text-neutral-600 font-mono leading-relaxed">
          High-performance Android multiplayer gaming hub featuring real-time play, ranked leaderboards, and custom profiles.
        </p>

        {/* Tech Badges with Wrap */}
        <div className="flex flex-wrap items-center gap-1.5 py-0.5 select-none">
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <Code2 className="w-3 h-3" />
            <span>React Native</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <Zap className="w-3 h-3" />
            <span>Expo</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <Database className="w-3 h-3" />
            <span>Firebase</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            <Bell className="w-3 h-3" />
            <span>Push Notifs</span>
          </span>
        </div>

        {/* Highlight Points (1-2 points) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
            <span className="text-indigo-500 font-bold select-none shrink-0">&gt;</span>
            <span>Real-time database multiplayer sync via Firebase Firestore</span>
          </div>
          <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
            <span className="text-indigo-500 font-bold select-none shrink-0">&gt;</span>
            <span>Tic Tac Toe, BOB Clash, Bingo & Square Wars native UI</span>
          </div>
        </div>
      </div>

      {/* Action Footer (Single Horizontal Line for Buttons) */}
      <div className="mt-5 pt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2 select-none">
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
        >
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>View Specs</span>
        </button>

        <a
          href={downloadLink}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Get APK v1.0.1</span>
        </a>
      </div>
    </div>
  );
}

// ============================================
// ZIP ENGINE PROJECT CARD (SECONDARY COMPACT)
// ============================================
export function ZipEngineProjectCard({ onOpenDetails }: { onOpenDetails?: () => void }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-sm relative overflow-hidden flex flex-col justify-between h-full w-full group">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600" />
      
      <div className="space-y-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight uppercase leading-snug">
                ZIP Import & Validation Engine
              </h3>
              <p className="text-[11px] text-neutral-500 font-mono">
                Parser & Decompressor // JSZip + Web Worker
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase shrink-0">
            PARSER v3.0
          </span>
        </div>

        <p className="text-xs text-neutral-600 font-mono leading-relaxed">
          High-performance asynchronous ZIP extractor, header validator, and memory-safe media blob manager.
        </p>

        <div className="flex flex-wrap items-center gap-1.5 py-0.5 select-none">
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            JSZip Reader
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            Blob Manager
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
            Memory Guard
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
            <span className="text-amber-600 font-bold select-none shrink-0">&gt;</span>
            <span>Chunked file parsing with instant object URL memory disposal</span>
          </div>
          <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
            <span className="text-amber-600 font-bold select-none shrink-0">&gt;</span>
            <span>WhatsApp text format verification and media attachment mapping</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-2 select-none">
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
        >
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>View Specs</span>
        </button>
        <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase text-center sm:text-right">
          CLIENT_PARSER_READY
        </span>
      </div>
    </div>
  );
}

// ============================================
// SECURITY MATRIX SVG ILLUSTRATION COMPONENT
// ============================================
function SecurityMatrixIllustration() {
  return (
    <div className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 sm:p-4 text-white font-mono relative overflow-hidden shadow-md group/matrix select-none">
      {/* Background SVG Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="sec-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sec-grid)" />
      </svg>

      {/* Top Header Row of Terminal */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 text-[10px] relative z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-rose-400 font-bold tracking-wider text-[10px]">EXPRESS_FIREWALL_v1.0</span>
        </div>
        <div className="flex items-center gap-2 text-neutral-400 text-[9px]">
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 font-bold">
            LATENCY &lt; 0.5ms
          </span>
        </div>
      </div>

      {/* Center Interactive SVG & Node Visualizer */}
      <div className="py-2.5 px-0.5 relative z-10 flex items-center justify-between gap-1.5">
        {/* Node 1: Inbound HTTP Request */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0">
          <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-rose-400 shadow-sm relative group-hover/matrix:border-rose-500/50 transition-colors">
            <Globe className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          </div>
          <span className="text-[9px] text-neutral-400 font-bold uppercase">HTTP IN</span>
          <span className="text-[8px] text-rose-400/90 bg-rose-950/50 border border-rose-900/40 px-1.5 py-0.5 rounded">POST /api</span>
        </div>

        {/* SVG Connecting Flow Arrow 1 */}
        <div className="flex-1 flex items-center justify-center relative min-w-[30px]">
          <svg className="w-full h-5 overflow-visible" viewBox="0 0 50 16">
            <line x1="0" y1="8" x2="50" y2="8" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
            <polygon points="45,4 50,8 45,12" fill="#f43f5e" />
          </svg>
        </div>

        {/* Node 2: Central Shield & Sanitizer Engine */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0 relative">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-rose-950 to-neutral-900 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
            <Shield className="w-5 h-5 stroke-[2.2] animate-pulse" />
            <Lock className="w-2.5 h-2.5 text-emerald-400 absolute bottom-0.5 right-0.5" />
          </div>
          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-tight">SANITY GUARD</span>
          <span className="text-[8px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-1 py-0.5 rounded">XSS + RATE OK</span>
        </div>

        {/* SVG Connecting Flow Arrow 2 */}
        <div className="flex-1 flex items-center justify-center relative min-w-[30px]">
          <svg className="w-full h-5 overflow-visible" viewBox="0 0 50 16">
            <line x1="0" y1="8" x2="50" y2="8" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
            <polygon points="45,4 50,8 45,12" fill="#10b981" />
          </svg>
        </div>

        {/* Node 3: Clean Processed Output */}
        <div className="flex flex-col items-center gap-1 text-center shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-[9px] text-emerald-400 font-bold uppercase">SECURE OUT</span>
          <span className="text-[8px] text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">200 OK</span>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="mt-1.5 pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[9px] text-neutral-400 select-none relative z-10">
        <div className="flex items-center gap-1">
          <Terminal className="w-3 h-3 text-rose-400" />
          <span>FILTER: <strong className="text-white">ACTIVE</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-bold">THREATS: 0 DETECTED</span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SECURITY GUARD PROJECT CARD (SECONDARY COMPACT)
// ============================================
export function SecurityGuardProjectCard({ 
  onOpenDetails,
  onDownloadClick 
}: { 
  onOpenDetails?: () => void;
  onDownloadClick?: () => void;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-sm relative overflow-hidden flex flex-col justify-between h-full w-full group">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-indigo-600" />
      
      {/* FIREWALL V1.0 badge tight in the top-right corner on desktop */}
      <span className="hidden sm:inline-flex absolute top-4 right-4 sm:top-5 sm:right-6 text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase shrink-0 z-10 select-none">
        FIREWALL v1.0
      </span>

      {/* Grid container: Spans 12 columns on md+, utilizing the right side space cleanly */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 items-center w-full">
        {/* Left Column: Card Text, Badges, Features */}
        <div className="md:col-span-7 lg:col-span-7 space-y-3 text-left">
          <div className="flex items-center gap-3 pr-0 sm:pr-24">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Shield className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight uppercase leading-snug">
                Security & Request Guard
              </h3>
              <p className="text-[11px] text-neutral-500 font-mono">
                Express Firewall // Sanitizer + Rate Limiter
              </p>
            </div>
          </div>

          <p className="text-xs text-neutral-600 font-mono leading-relaxed">
            Express security middleware suite with XSS sanitization, malicious vector detection, and session token verification.
          </p>

          <div className="flex flex-wrap items-center gap-1.5 py-0.5 select-none">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
              Express Firewall
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
              XSS Sanitizer
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase whitespace-nowrap shrink-0">
              Session Guard
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
              <span className="text-rose-600 font-bold select-none shrink-0">&gt;</span>
              <span>Real-time request inspection & malicious payload sanitization</span>
            </div>
            <div className="flex gap-2 items-start font-mono text-[11px] text-neutral-600">
              <span className="text-rose-600 font-bold select-none shrink-0">&gt;</span>
              <span>Session token validation & automated rate limit enforcement</span>
            </div>
          </div>
        </div>

        {/* Right Column: Creative Security Matrix SVG & Terminal Graphic centered vertically with balanced top/bottom gaps */}
        <div className="md:col-span-5 lg:col-span-5 w-full flex items-center justify-center pt-2 md:pt-6 lg:pt-7">
          <SecurityMatrixIllustration />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2 select-none">
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 text-neutral-800 font-mono text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
        >
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>View Specs</span>
        </button>

        <button
          type="button"
          onClick={onDownloadClick}
          className="px-4 py-2 bg-neutral-950 hover:bg-neutral-900 text-white border border-neutral-800 font-mono text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-sm w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5 text-white shrink-0" />
          <span>Download Package</span>
          <span className="text-neutral-300 font-medium whitespace-nowrap">
            (<span className="line-through text-neutral-400">₹99</span>{" "}
            <span className="text-emerald-400 font-bold">FREE</span>)
          </span>
        </button>
      </div>
    </div>
  );
}

// ============================================
// FULL SPECS MODAL COMPONENTS
// ============================================

function WhatsAppFullSpecsModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-neutral-950 uppercase font-sans">
            WhatsApp Parser & Viewer v3.0
          </h3>
          <p className="text-xs text-neutral-500">
            Full System Specifications & Integration Architecture
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-sans">
        A full-featured WhatsApp chat parser and interactive viewer built into this portfolio. Users can upload exported WhatsApp ZIP archives or import backups seamlessly using Google Drive API integration. Designed with zero-knowledge client-side parsing for total user privacy.
      </p>

      <div className="grid grid-cols-2 gap-3 py-2">
        {[
          { label: "OAUTH INTEGRATION", val: "Drive API", color: "text-blue-600" },
          { label: "SECURITY ENGINE", val: "Firebase Auth", color: "text-amber-600" },
          { label: "PARSER ARCHITECTURE", val: "Streaming", color: "text-indigo-600" },
          { label: "PRIVACY FIRST", val: "100% Client", color: "text-emerald-600" }
        ].map((s, i) => (
          <div key={i} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-center">
            <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
            <div className="text-[9px] text-neutral-400 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-black uppercase text-neutral-900 font-sans">Key Features Implemented:</h4>
        <ul className="space-y-1.5 text-xs text-neutral-600 font-sans">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Google Drive API integration for cloud file discovery, token exchange, and streaming</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Firebase Authentication & OAuth token synchronization across web sessions</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>High-performance chunked file decompression & memory-efficient media mapping</span>
          </li>
        </ul>
      </div>

      <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
        <button
          onClick={() => {
            onClose();
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            navigate("/tools");
          }}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          <span>Launch WhatsApp Parser Tool</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function LostGamesFullSpecsModal({ onClose }: { onClose: () => void }) {
  const downloadLink = "https://github.com/suhebdev/LostGames/releases/download/v1.0.1/LostGames.apk";
  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shrink-0">
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-neutral-950 uppercase font-sans">
            LostGames Mobile Hub v1.0.1
          </h3>
          <p className="text-xs text-neutral-500">
            Android Application Technical Overview
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-sans">
        LostGames is an Android app currently under active development. The goal is a high-performance multiplayer gaming platform – featuring games like Tic Tac Toe, BOB Clash, Bingo Clash, and Square Wars – with real-time play, ranked leaderboards, and customizable profiles.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
        {["Tic Tac Toe", "BOB Clash", "Bingo Clash", "Square Wars"].map((g) => (
          <div key={g} className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 flex items-center gap-2 font-bold text-neutral-700">
            <Gamepad2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>{g}</span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Test build v1.0.1 available for direct Android sideload installation.</span>
      </div>

      <div className="pt-4 border-t border-neutral-100 flex justify-end gap-3">
        <a
          href={downloadLink}
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Test APK v1.0.1</span>
        </a>
      </div>
    </div>
  );
}

function ZipEngineFullSpecsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-neutral-950 uppercase font-sans">
            ZIP Import & Decompression Engine
          </h3>
          <p className="text-xs text-neutral-500">
            Memory-safe Async File Processing System
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-sans">
        Features high-speed chunked parsing using JSZip in browser context. Implements automatic object URL cleanup, media mapping for chat exports, and regex line parsers with zero server upload needed.
      </p>

      <div className="p-3 bg-neutral-950 rounded-xl text-[10px] text-amber-400 font-mono overflow-x-auto">
        <pre>{`// JSZip Async Extract & Memory Cleanup
const zip = await JSZip.loadAsync(file);
const mediaMap = new Map();
zip.forEach((relativePath, fileEntry) => {
  if (!fileEntry.dir) {
    const blob = await fileEntry.async("blob");
    mediaMap.set(relativePath, URL.createObjectURL(blob));
  }
});`}</pre>
      </div>

      <div className="pt-4 border-t border-neutral-100 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl"
        >
          Close Specs
        </button>
      </div>
    </div>
  );
}

function SecurityFirewallFullSpecsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-neutral-950 uppercase font-sans">
            Security & Request Guard Layer
          </h3>
          <p className="text-xs text-neutral-500">
            Express Application Firewall & Attack Prevention
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-sans">
        Multi-layered security guard that intercepts inbound HTTP requests, sanitizes payload keys against XSS attacks, checks session cookies against Firebase Admin SDK, and enforces rate limiting across active backend routes.
      </p>

      <div className="p-3 bg-neutral-950 rounded-xl text-[10px] text-sky-400 font-mono overflow-x-auto">
        <pre>{`// Express Application Firewall Guard
app.use((req, res, next) => {
  sanitizePayload(req.body);
  verifySessionToken(req.headers.authorization);
  rateLimitCheck(req.ip);
  next();
});`}</pre>
      </div>

      <div className="pt-4 border-t border-neutral-100 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl"
        >
          Close Specs
        </button>
      </div>
    </div>
  );
}

// ============================================
// FIREBASE PROJECT CARD
// ============================================
interface VariantInfo {
  id: string;
  label: string;
  subtitle: string;
  codeFileName: string;
  techStack: string[];
  folderStructure: string;
  setupSteps: string[];
  codeContent: string;
}

interface FirebaseProject {
  id: string;
  title: string;
  badge: string;
  description: string;
  price: string;
  variants: {
    web: VariantInfo;
    expo: VariantInfo;
  };
}

interface FirebaseProjectCardProps {
  key?: string;
  project: FirebaseProject;
  activeVariantKey: "web" | "expo";
  setActiveVariantKey: (variant: "web" | "expo") => void;
  onOpenDetails?: () => void;
  onDownloadClick: (variant: VariantInfo) => void;
  triggerSystemAlert: (message: string) => void;
}

// ==========================================
// CODE COMPILER HELPERS: DATA GENERATOR
// ==========================================

export interface HandbookPhase {
  title: string;
  details: string[];
}

export interface HandbookContent {
  title: string;
  subtitle: string;
  phases: HandbookPhase[];
}

export function getHandbookContent(projectId: string, variantKey: "web" | "expo"): HandbookContent {
  if (projectId === "firebase-otp") {
    if (variantKey === "web") {
      return {
        title: "Web OTP Master Sign-in Guide",
        subtitle: "Production-ready invisible Recaptcha & sign-in handler workflow for Web SDK v10",
        phases: [
          {
            title: "Phase 1: Package Download & Setup",
            details: [
              "Extract the downloaded 'firebase-phone-auth-web.zip' folder directly inside your main source folder (typically under 'src/' or a custom component subfolder).",
              "Verify your tree: your layout must match our described file map with 'firebase.ts' in config, and layout components in standard views.",
              "Run dependency installation command inside your terminal: 'npm install firebase' or look at package.json settings to make sure Firebase Web SDK v10+ is loaded correctly."
            ]
          },
          {
            title: "Phase 2: Firebase Console Enablers",
            details: [
              "Launch Google Firebase Developer Console (https://console.firebase.google.com/) and create/select your active project.",
              "Navigate to \"Authentication\" from the sidebar drawer menu, open \"Sign-in Method\" tab, and toggle \"Phone Number\" to Enabled.",
              "Copy your web SDK initializer configuration key map (matching apiKey, authDomain, projectId, storageBucket, messengerId, etc.) from project settings, and paste them inside our 'firebase.ts' config."
            ]
          },
          {
            title: "Phase 3: Client-side Integrations",
            details: [
              "Place an invisible container tag at the bottom of your mount handler layout: '<div id=\"recaptcha-container\"></div>'. This is essential so the captcha engine has a physical element bind hook.",
              "Import 'dispatchSMSVerification' inside your action triggers. Invoke it passing the mobile phone number string and the target recaptcha element container ID.",
              "Save the returned 'confirmationResult' in a persistent component local state or context provider so it can be verified inside the verification code form."
            ]
          },
          {
            title: "Phase 4: Running & Testing Local Builds",
            details: [
              "Test local deliveries by setting up simulated phone numbers and testing OTP codes inside the Firebase Developer settings (Authentication > Users > Add phone number for testing). This will bypass active carrier limits during development.",
              "Run local compilers with 'npm run dev' and trigger the dispatch. When going live, Firebase will automatically launch verification checks and dispatch real SMS carriers."
            ]
          },
          {
            title: "Developer Debugging & Integrity Check",
            details: [
              "Ensure 'authDomain' is perfectly configured; otherwise, Recaptcha callbacks will return signature error codes.",
              "Rate Limit Warning: Standard Firebase accounts provide free SMS caps. Configure Cloud Armor or Google API limits if you observe unusual spam activity to bypass malicious billing drain."
            ]
          }
        ]
      };
    } else {
      return {
        title: "Application OTP Native Mobile Guide",
        subtitle: "Configuring native OTP sign-in on Android and iOS platforms within Expo React Native managed apps",
        phases: [
          {
            title: "Phase 1: Downloading & Directory Mapping",
            details: [
              "Unpack 'firebase-phone-auth-expo.zip' package and merge code models into your active Expo directory (such as 'app/config' and screens sub-directories).",
              "Execute package additions to bundle mobile auth drivers: 'npx expo install expo-application @react-native-async-storage/async-storage firebase'."
            ]
          },
          {
            title: "Phase 2: Mobile Security Fingerprints mapping",
            details: [
              "Firebase requires registering your mobile application SHA credentials; otherwise, SMS requests from native clients will be blocked.",
              "Android Setup: Launch local terminal and execute './gradlew signingReport' inside your android/ subfolder, copy SHA-1 & SHA-256 signatures, and bind them inside your Firebase Project > Android App console setup.",
              "iOS Setup: Register bundle identifiers and download 'GoogleService-Info.plist' back-checks to your mobile directory."
            ]
          },
          {
            title: "Phase 3: Persistent Session Handshakes",
            details: [
              "Standard JS state loses session tokens on app reload in React Native. Ensure the system is initialized with 'initializeAuth' paired with 'getReactNativePersistence(AsyncStorage)' as defined in our helper.",
              "Create custom action handler buttons linking verification triggers physically to the React Native layouts."
            ]
          },
          {
            title: "Phase 4: Run Development Bundler",
            details: [
              "Open emulator inside developer dashboard: 'npx expo start' (press 'a' for Android or 'i' for iOS layout emulators).",
              "Execute tests using physical devices via the Expo Go Application, confirming that persistent authentication sessions track in the console gracefully."
            ]
          },
          {
            title: "Developer Debugging & Integrity Check",
            details: [
              "If the delivery hangs, verify if 'DeviceCheck' (iOS) or 'Google Play Integrity API' (Android) permissions are activated in Google API dashboard manager.",
              "Mocking Setup: Configure testing accounts inside Firebase Console so physical devices do not suffer Carrier throttling or rate limit lockouts during QA."
            ]
          }
        ]
      };
    }
  } else {
    // firebase-google-oauth
    if (variantKey === "web") {
      return {
        title: "Web Google SSO Integration Guide",
        subtitle: "Implementing a clean federated Single Sign-On popup layout using Firebase Web SDK v10",
        phases: [
          {
            title: "Phase 1: Extracting Blueprint Boilerplate",
            details: [
              "Unpack 'firebase-google-auth-web.zip' directly inside your web repository structure.",
              "Ensure you install firebase bindings inside your system compiler: 'npm install firebase'."
            ]
          },
          {
            title: "Phase 2: Authorization Credentials Setup",
            details: [
              "Inside Firebase Developer Console, navigate to 'Authentication > Sign-in Method', select 'Sign-in Providers', click 'Google' and activate it.",
              "Ensure 'Authorized Domains' includes 'localhost' and any other live domain that hosts the client app; otherwise Google popup triggers return redirection handshake halts."
            ]
          },
          {
            title: "Phase 3: Codebase Mounting",
            details: [
              "Verify 'firebase.ts' maps the new 'GoogleAuthProvider' instance structure.",
              "Integrate the custom 'GoogleSsoButton.tsx' click event to invoke the popup sequence.",
              "Expose returned profile claims (Name, Email, Picture, ID Token) to your application auth provider context."
            ]
          },
          {
            title: "Phase 4: Live Verification",
            details: [
              "Start compiled server with: 'npm run dev'.",
              "Trigger sign-in. Google's secure popup will load. On authorization consent, the profile object and authenticated session are passed cleanly to client state hooks."
            ]
          },
          {
            title: "GCP Compliance & Best Tips",
            details: [
              "Cross-Origin Cookies: Brave or Safari block popups in some security settings. Always implement an adaptive fallback using 'signInWithRedirect' checks if visitors fail on popups.",
              "Security Scopes: Never request high-level permissions unless fully necessary. Limit request scopes to basic user data profiles."
            ]
          }
        ]
      };
    } else {
      return {
        title: "Application Google SSO Native Guide",
        subtitle: "Configuring robust Google SSO redirects inside Expo App Router using modern Expo AuthSessions",
        phases: [
          {
            title: "Phase 1: Downloading Native Boilerplate",
            details: [
              "Extract 'firebase-google-auth-expo.zip' and merge scripts inside '/app' configurations.",
              "Install modern authorization dependencies: 'npx expo install expo-auth-session expo-web-browser expo-crypto firebase'."
            ]
          },
          {
            title: "Phase 2: Registering Google OAuth Clients",
            details: [
              "Navigate to Google Developer Platform (GCP Console) and provision multiple Credentials Client IDs under the same target project:",
              "1. Create 'Web Client ID': Reusable client to hand over OAuth callbacks proxy keys safely.",
              "2. Create 'Android Client ID': Bond with package name and Gradle SHA-1 signature.",
              "3. Create 'iOS Client ID': Bond with target bundle identifier (e.g. 'com.suheb.myApp')."
            ]
          },
          {
            title: "Phase 3: Implementing Redirect schemes",
            details: [
              "Deep linking requires a target URL scheme inside 'app.json'. Open config and write: '\"scheme\": \"yourcustomscheme\"'.",
              "Import 'WebBrowser.maybeCompleteAuthSession();' in your core layout script to guarantee native overlay sheet dismissal."
            ]
          },
          {
            title: "Phase 4: Metro Compilation",
            details: [
              "Boot Expo metro bundler using: 'npx expo start'.",
              "Compile and run the app. Triggering Google login will launch an in-app overlay window safely, complete the transaction in Google servers, and deep-link results back to Native hooks."
            ]
          },
          {
            title: "GCP Compliance & Best Tips",
            details: [
              "Redirect Mismatches: Double-check that your client-side config matches client IDs registered within Firebase. Google will throw 'Error 400: redirect_uri_mismatch' if any letter is mis-matched."
            ]
          }
        ]
      };
    }
  }
}

export function getCodeUsageExample(projectId: string, variantKey: "web" | "expo"): string {
  if (projectId === "firebase-otp") {
    if (variantKey === "web") {
      return `// Initiate SMS Handshake verification
import { dispatchSMSVerification } from './config/firebase';

const triggerOTPFlow = async (mobileNum) => {
  const container = 'recaptcha-container';
  const res = await dispatchSMSVerification(mobileNum, container);
  if (res.success) {
    // Save confirmationResult payload in hook state
    setConfirmation(res.confirmationResult);
    showVerificationCodePage(true);
  } else {
    triggerSystemAlert(\`Dispatch failed: \${res.error}\`);
  }
};`;
    } else {
      return `// Handle Native OTP validation credential
import { auth } from './config/firebaseConfig';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

const onSubmitOTP = async (verifyId, otpCode) => {
  try {
    const cred = PhoneAuthProvider.credential(verifyId, otpCode);
    const userCred = await signInWithCredential(auth, cred);
    navigate('DashboardHome', { user: userCred.user });
  } catch (error: any) {
    displayErrorAlert('Invalid digits or timeout check! ' + error.message);
  }
};`;
    }
  } else {
    // google sso
    if (variantKey === "web") {
      return `// Invoke Popup Google Authenticator SSO
import { handleGoogleSignIn } from './config/firebase';

const handleSsoClick = async () => {
  const result = await handleGoogleSignIn();
  if (result.success) {
    const sessionToken = result.idToken;
    // Dispatch JWT user profile claims straight to your state hooks
    setCurrentUser(result.user);
    // Bind token back checks with custom backend
    await syncSessionToAPI(sessionToken);
  } else {
    showErrorNotification('Popup closed or cookie block: ' + result.error);
  }
};`;
    } else {
      return `// Expo Managed Google Sign-in sessions hook
import { useGoogleMobileSignInHook } from './config/firebase';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const LoginScreen = () => {
  const { request, response, promptAsync } = useGoogleMobileSignInHook();
  
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const cred = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, cred);
    }
  }, [response]);
  
  return <Button title="Google SSO" onPress={() => promptAsync()} />;
};`;
    }
  }
}

export interface TipItem {
  tag: string;
  text: string;
}

export function getTipsList(projectId: string, variantKey: "web" | "expo"): TipItem[] {
  if (projectId === "firebase-otp") {
    if (variantKey === "web") {
      return [
        { tag: "RECAPTCHA", text: "Inject invisible recaptcha nodes to avoid interrupting user flows while securing SMS endpoints from bot-spamming." },
        { tag: "GLOBAL DOM", text: "Whitelisting 'localhost' and production domains in your Firebase Console authentication settings is mandatory." },
        { tag: "SMS_FRAUD", text: "Configure GCP cloud billing caps to prevent malicious script runouts on mobile carrier billing." }
      ];
    } else {
      return [
        { tag: "FINGERPRINT", text: "Generate Gradle SHA signature via './gradlew signingReport' and bind inside Firebase settings for validation." },
        { tag: "PERSISTENT", text: "Use standard initializeAuth with AsyncStorage persistent drivers since Expo doesn't support localStorage." },
        { tag: "APP_STORE", text: "Whitelist static test phone/digit combinations ('+91 9876543210' -> '123456') inside Console for Apple review." }
      ];
    }
  } else {
    if (variantKey === "web") {
      return [
        { tag: "REDIRECT", text: "Cross-Origin popup block handles vary on Brave and Safari. Prepare redirect hooks as adaptive security fallbacks." },
        { tag: "SSO_SCOPES", text: "Minimize Google scope demands to standard metadata 'profile' and 'email' for seamless approval review." },
        { tag: "JWT_SECURE", text: "Transmit idToken back in secure API requests, and use firebase-admin SDK on server routes for verification." }
      ];
    } else {
      return [
        { tag: "URL_SCHEME", text: "Ensure 'scheme' property is registered in 'app.json' (e.g., 'scheme: \"mycustomscheme\"') to deep-link redirects." },
        { tag: "WEB_PROXY", text: "A call to 'WebBrowser.maybeCompleteAuthSession()' is required at application entry to close modal popups." },
        { tag: "CLIENT_IDS", text: "Requires setting up distinct Client IDs for Android (SHA-1 fingerprint), iOS (Bundle ID), and Web proxies." }
      ];
    }
  }
}

export function renderHandbook(projectId: string, variantKey: "web" | "expo") {
  const handbook = getHandbookContent(projectId, variantKey);
  return (
    <div className="space-y-6 md:p-2 sm:p-4 bg-white/90 rounded-2xl border border-neutral-100 shadow-sm leading-normal font-mono text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-black text-neutral-950 uppercase tracking-tight font-sans">
            {handbook.title}
          </h3>
        </div>
        <p className="text-xs text-neutral-500 font-medium font-sans">
          {handbook.subtitle}
        </p>
      </div>

      <div className="space-y-5">
        {handbook.phases.map((phase, idx) => (
          <div key={idx} className="space-y-2 border-l-2 border-indigo-100 pl-4 relative">
            <div className="absolute w-2 h-2 rounded-full bg-indigo-500 -left-[5px] top-1.5 ring-4 ring-white" />
            <h4 className="text-xs font-black text-neutral-950 uppercase tracking-tight font-sans flex items-center gap-1.5">
              <span>{phase.title}</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-neutral-600 leading-relaxed font-medium">
              {phase.details.map((detail, dIdx) => (
                <li key={dIdx} className="flex gap-2 items-start">
                  <span className="text-indigo-500 shrink-0 font-bold font-mono text-[10px]">&gt;</span>
                  <span className="font-sans">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase font-sans">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Need Help with the integration?</span>
        </div>
        <p className="text-[10.5px] text-amber-700 leading-relaxed font-sans font-medium">
          If you run into compilation errors, missing dependencies, or invalid domain setups, make sure to read standard system error logs or contact Suheb Khan for a full customized deployment configuration.
        </p>
      </div>
    </div>
  );
}

interface ScrollSliderProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function ScrollSlider({ containerRef }: ScrollSliderProps) {
  const [showSlider, setShowSlider] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 1
  const trackRef = React.useRef<HTMLDivElement>(null);
  const isDragging = React.useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setShowSlider(hasOverflow);
    };

    // Check on mount, resize, and content changes
    checkOverflow();
    
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    resizeObserver.observe(container);

    const handleScroll = () => {
      if (isDragging.current) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(container.scrollLeft / maxScroll);
      }
    };

    container.addEventListener("scroll", handleScroll);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef]);

  // Sync scroll position whenever container or active variant updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(container.scrollLeft / maxScroll);
    } else {
      setScrollProgress(0);
    }
  });

  if (!showSlider) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    updateScrollFromPointer(e);
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateScrollFromPointer(moveEvent);
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const updateScrollFromPointer = (e: MouseEvent | PointerEvent | React.PointerEvent) => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    const rect = track.getBoundingClientRect();
    const padding = 7; // Gap matches top/bottom (20px track height - 6px progress height) / 2 = 7px
    const activeWidth = rect.width - (padding * 2);

    let x = e.clientX - rect.left - padding;
    x = Math.max(0, Math.min(x, activeWidth));
    const progress = activeWidth > 0 ? x / activeWidth : 0;
    setScrollProgress(progress);

    const maxScroll = container.scrollWidth - container.clientWidth;
    container.scrollLeft = progress * maxScroll;
  };

  return (
    <div className="flex flex-col items-center gap-1 mt-2 mb-1 select-none w-full max-w-sm mx-auto animate-in fade-in duration-200">
      <div className="flex items-center justify-between w-full text-[9px] font-mono font-black text-neutral-400 px-3 uppercase tracking-wider">
        <span className="flex items-center gap-1">← Slide Left</span>
        <span className="flex items-center gap-1">Slide Right →</span>
      </div>
      <div 
        ref={trackRef}
        className="relative w-full h-5 bg-neutral-200 dark:bg-zinc-800/60 rounded-full select-none flex items-center mt-2 mb-2"
      >
        {/* Track background with 7px (left & right) spacing gap on the edges */}
        <div className="absolute left-[7px] right-[7px] h-1.5 bg-neutral-100 dark:bg-zinc-900/60 rounded-full" />
        
        {/* Filled/Active track with matching 7px starting position and mathematically aligned width */}
        <div 
          className="absolute left-[7px] h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 rounded-full pointer-events-none"
          style={{ width: `calc(${scrollProgress} * (100% - 14px))` }}
        />
        
        {/* Thumb button moving precisely inside the 7px-padded track, only dragging on pointerhold */}
        <div 
          onPointerDown={handlePointerDown}
          className="absolute w-7 h-7 bg-white dark:bg-zinc-700 rounded-full shadow-md border border-neutral-200 dark:border-zinc-600 cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 z-20"
          style={{ 
            left: `calc(${scrollProgress} * (100% - 14px) - 7px)`,
            touchAction: "none"
          }}
        >
          {/* Animated Settings Gear Icon inside the thumb, rotating 1:1 with scroll */}
          <div 
            className="flex items-center justify-center pointer-events-none"
            style={{ 
              transform: `rotate(${scrollProgress * 360}deg)`,
              transition: isDragging.current ? "none" : "transform 0.15s ease-out" 
            }}
          >
            <SettingsIconAnimated size={16} primaryColor="#4f46e5" accentColor="#f59e0b" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FIREBASE FULL SPECS MODALS
// ============================================

function FirebaseOtpFullSpecsModal({ 
  onClose, 
  activeVariantKey, 
  setActiveVariantKey, 
  project, 
  onDownloadClick 
}: { 
  onClose: () => void; 
  activeVariantKey: "web" | "expo";
  setActiveVariantKey: (v: "web" | "expo") => void;
  project: FirebaseProject;
  onDownloadClick: (variant: VariantInfo) => void;
}) {
  const variant = project.variants[activeVariantKey];

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-950 uppercase font-sans">
              Firebase OTP Phone Authentication
            </h3>
            <p className="text-xs text-neutral-500 font-mono">
              {variant.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl w-full select-none">
          <button
            type="button"
            onClick={() => setActiveVariantKey("web")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-center px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${activeVariantKey === "web" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>
            </svg>
            <span>Web SDK</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveVariantKey("expo")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-center px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${activeVariantKey === "expo" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
            <span>Expo Mobile</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-neutral-800 font-mono uppercase">// PROJECT STRUCTURE</span>
        <pre className="bg-neutral-950 text-amber-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto">
          {variant.folderStructure}
        </pre>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-neutral-800 font-mono uppercase">// INTEGRATION GUIDE</span>
        {renderHandbook(project.id, activeVariantKey)}
      </div>

      <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
        >
          Close Specs
        </button>
        <button
          onClick={() => onDownloadClick(variant)}
          className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Package (<span className="line-through text-neutral-400 font-normal mr-0.5">₹99</span><span className="text-emerald-400 font-bold">FREE</span>)</span>
        </button>
      </div>
    </div>
  );
}

function FirebaseGoogleFullSpecsModal({ 
  onClose, 
  activeVariantKey, 
  setActiveVariantKey, 
  project, 
  onDownloadClick 
}: { 
  onClose: () => void; 
  activeVariantKey: "web" | "expo";
  setActiveVariantKey: (v: "web" | "expo") => void;
  project: FirebaseProject;
  onDownloadClick: (variant: VariantInfo) => void;
}) {
  const variant = project.variants[activeVariantKey];

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-950 uppercase font-sans">
              Firebase Google OAuth SSO
            </h3>
            <p className="text-xs text-neutral-500 font-mono">
              {variant.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl w-full select-none">
          <button
            type="button"
            onClick={() => setActiveVariantKey("web")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-center px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${activeVariantKey === "web" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>
            </svg>
            <span>Web SDK</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveVariantKey("expo")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-center px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${activeVariantKey === "expo" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
              <path d="M12 18h.01"/>
            </svg>
            <span>Expo Mobile</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-neutral-800 font-mono uppercase">// PROJECT STRUCTURE</span>
        <pre className="bg-neutral-950 text-sky-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto">
          {variant.folderStructure}
        </pre>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold text-neutral-800 font-mono uppercase">// INTEGRATION GUIDE</span>
        {renderHandbook(project.id, activeVariantKey)}
      </div>

      <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
        >
          Close Specs
        </button>
        <button
          onClick={() => onDownloadClick(variant)}
          className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Package (<span className="line-through text-neutral-400 font-normal mr-0.5">₹99</span><span className="text-emerald-400 font-bold">FREE</span>)</span>
        </button>
      </div>
    </div>
  );
}

// ============================================
// FIREBASE PROJECT CARD (COMPACT PORTFOLIO STYLE)
// ============================================
export function FirebaseProjectCard({ 
  project, 
  activeVariantKey,
  setActiveVariantKey,
  onOpenDetails,
  onDownloadClick, 
}: FirebaseProjectCardProps) {
  
  const variant = project.variants[activeVariantKey];

  return (
    <div id={`project-card-${project.id}`} className="bg-white border border-neutral-200 rounded-3xl p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-sm relative overflow-hidden flex flex-col justify-between w-full group">
      {/* Decorative Gradient Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

      <div className="space-y-3.5 text-left">
        {/* Header Row: Badge & Variant Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                // {project.badge}
              </span>
              <span className="hidden sm:inline-flex text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase">
                DEPLOY_READY
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-neutral-950 tracking-tight uppercase leading-snug pt-0.5">
              {project.title}
            </h3>
          </div>

          {/* Variant Selector Toggle */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-xl gap-1 select-none w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveVariantKey("web")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition duration-200 cursor-pointer ${
                activeVariantKey === "web" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>
              </svg>
              <span>Web SDK</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveVariantKey("expo")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition duration-200 cursor-pointer ${
                activeVariantKey === "expo" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
                <path d="M12 18h.01"/>
              </svg>
              <span>Expo App</span>
            </button>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs text-neutral-600 font-mono leading-relaxed">
          {project.description}
        </p>

        {/* Tech Badges */}
        <div className="flex flex-wrap items-center gap-1.5 select-none">
          <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest mr-1">TECH STACK:</span>
          {variant.techStack.map((tech) => (
            <span 
              key={tech} 
              className="text-[9.5px] font-mono font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 rounded-lg"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Small Code Preview */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[9.5px] text-sky-400 leading-normal overflow-hidden max-h-24 relative shadow-inner">
          <div className="text-[8.5px] font-mono font-bold text-neutral-500 pb-1 border-b border-neutral-800 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-400">
              <Terminal className="w-3 h-3 text-indigo-400" />
              <span>{variant.codeFileName} ({activeVariantKey === "web" ? "Web SDK" : "Expo Mobile"})</span>
            </span>
            <span className="text-emerald-400 font-mono">READY_TO_EXPORT</span>
          </div>
          <pre className="whitespace-pre overflow-hidden m-0 text-zinc-300 opacity-90 line-clamp-3">
            {variant.codeContent}
          </pre>
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-neutral-950 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 select-none">
        <button
          type="button"
          onClick={onOpenDetails}
          className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
          <Info className="w-3.5 h-3.5 text-neutral-500" />
          <span>View Specs & Setup</span>
        </button>

        <button
          type="button"
          onClick={() => onDownloadClick(variant)}
          className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Package (<span className="line-through text-neutral-400 font-normal mr-0.5">₹99</span><span className="text-emerald-400 font-bold">FREE</span>)</span>
        </button>
      </div>
    </div>
  );
}
