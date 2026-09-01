import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, 
  Binary, 
  Smartphone, 
  Shield, 
  Bell, 
  Download, 
  Briefcase, 
  Globe, 
  KeyRound, 
  Users, 
  Terminal, 
  Copy, 
  Linkedin, 
  Github, 
  Twitter, 
  Instagram, 
  Facebook, 
  Zap, 
  Check, 
  LogOut, 
  Mail, 
  Phone, 
  Clock, 
  Activity, 
  Database,
  Code,
  Target,
  ExternalLink,
  Sparkles,
  Cpu
} from "lucide-react";
// @ts-ignore
import SuhebHero from "../SuhebHero-removebg-preview.png";
import { SkillCallout } from "../types";
import { AnimatedPrice } from "./Components";
import { 
  getFirebaseFirestore, 
  isFirebaseConfigured, 
  handleFirestoreError, 
  OperationType 
} from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { validateContactName, validatePhoneNumber, validateEmail } from "../../backend/Security";

// Embedded Solutions Array to avoid extra file importing
interface SolutionItem {
  id: string;
  title: string;
  category: "auth" | "notifications" | string;
  tech: string;
  price: string;
  problem: string;
  outcome: string;
  variants: {
    web: {
      codeFileName: string;
      codeContent: string;
      tech: string;
    };
    expo: {
      codeFileName: string;
      codeContent: string;
      tech: string;
    };
  };
}

const embeddedSolutions: SolutionItem[] = [
  {
    id: "firebase-otp",
    title: "Phone + OTP Verification Code",
    category: "auth",
    tech: "Firebase Auth + OTP API",
    price: "₹99",
    problem: "Needs quick security check via SMS Verification. Requires invisible Recaptcha & active credentials lookup.",
    outcome: "Full modular helper script that triggers SMS Verification and validates OTP with instant flow response.",
    variants: {
      web: {
        codeFileName: "firebase-phone-otp-auth.js",
        tech: "Firebase Auth Web SDK 10+",
        codeContent: `// Firebase Phone & OTP Authentication Blueprint (Web SDK)
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const auth = getAuth();

export function setupRecaptcha(containerId) {
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': (response) => {
      console.log("reCAPTCHA solved, proceeding with OTP SMS dispatch.");
    }
  });
}

export async function sendOTP(phoneNumber) {
  const appVerifier = window.recaptchaVerifier;
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    return { success: true, message: "OTP sent successfully!" };
  } catch (error) {
    console.error("Error during SMS dispatch:", error);
    return { success: false, error: error.message };
  }
}

export async function verifyOTP(otpCode) {
  if (!window.confirmationResult) {
    throw new Error("No active verification session found.");
  }
  try {
    const result = await window.confirmationResult.confirm(otpCode);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}`
      },
      expo: {
        codeFileName: "firebase-phone-otp-expo.js",
        tech: "Expo Router + React Native Persistence",
        codeContent: `// Firebase Phone & OTP Authentication Blueprint (Expo React Native Mobile)
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Persistent authentication on Expo mobile apps requires AsyncStorage persistent driver
export function initMobileAuth(app) {
  return initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export async function sendMobileOTP(authInstance, phoneNumber, recaptchaVerifier) {
  const { signInWithPhoneNumber } = await import("firebase/auth");
  try {
    const confirmationResult = await signInWithPhoneNumber(authInstance, phoneNumber, recaptchaVerifier);
    return { success: true, confirmationResult };
  } catch (error) {
    console.error("Expo Mobile OTP Send aborted:", error);
    return { success: false, error: error.message };
  }
}`
      }
    }
  },
  {
    id: "firebase-google",
    title: "Google Authentication Code",
    category: "auth",
    tech: "Firebase Auth + OAuth 2",
    price: "₹99",
    problem: "Needs hassle-free client-side Sign In with automatic profile syncing during the session.",
    outcome: "Authenticates users via popup, creates structured user directory on Firestore, and updates timestamps.",
    variants: {
      web: {
        codeFileName: "firebase-google-auth.js",
        tech: "Firebase Auth Google Provider",
        codeContent: `// Firebase Google Authentication Blueprint (Web SDK)
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString()
    }, { merge: true });

    return { success: true, user };
  } catch (error) {
    console.error("Google Auth Failure:", error);
    return { success: false, error: error.message };
  }
}`
      },
      expo: {
        codeFileName: "firebase-google-auth-expo.js",
        tech: "Expo Auth Session + Managed SSO",
        codeContent: `// Firebase Google Authentication Blueprint (Expo React Native Mobile)
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleMobileSignIn() {
  // Requires setting up Client IDs inside Google Developer console
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
  });

  const triggerSignIn = async () => {
    const result = await promptAsync();
    if (result.type === 'success') {
      const { id_token } = result.params;
      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(id_token);
      const userCredential = await signInWithCredential(auth, credential);
      return { success: true, user: userCredential.user };
    }
    return { success: false, error: 'SSO cancelled or interrupted' };
  };

  return { request, triggerSignIn };
}`
      }
    }
  },
  {
    id: "firebase-push",
    title: "FCM Push Notifications Service",
    category: "notifications",
    tech: "Firebase FCM + Push Spec",
    price: "₹99",
    problem: "Needs persistent push notification setup working in service workers when tab is inactive.",
    outcome: "Full FCM Service Worker with service worker listener hooks + custom foreground payloads processor.",
    variants: {
      web: {
        codeFileName: "firebase-messaging-sw.js",
        tech: "FCM Web Service Worker",
        codeContent: `// Firebase Push Cloud Messaging Service Worker Blueprint (Web Worker)
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const messaging = getMessaging();

export async function requestFCMToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, { 
        vapidKey: "YOUR_PUBLIC_VAPID_KEY_HERE" 
      });
      if (currentToken) {
        return { success: true, token: currentToken };
      } else {
        return { success: false, error: "No registration token available." };
      }
    } else {
      return { success: false, error: "User blocked notifications permission request." };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function onIncomingNotification(callback) {
  onMessage(messaging, (payload) => {
    callback(payload);
  });
}`
      },
      expo: {
        codeFileName: "firebase-push-expo.js",
        tech: "Expo Managed Push Notifications SDK",
        codeContent: `// Firebase Push Cloud Messaging Blueprint (Expo React Native Mobile)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for mobile notifications!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo Push Token:", token);
  } else {
    alert('Must use a physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}`
      }
    }
  }
];

// ============================================
// INTERACTIVE PORTRAIT COMPONENT
// ============================================
function InteractivePortrait() {
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const [lockedCallout, setLockedCallout] = useState<string | null>(null);
  const [mobileScale, setMobileScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setIsMobile(true);
        const computedScale = Math.min(1.0, (w / 2 - 10) / 194.5);
        setMobileScale(computedScale);
      } else {
        setIsMobile(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseEnter = (id: string) => {
    setActiveCallout(id);
  };

  const handleMouseLeave = () => {
    if (lockedCallout) {
      setActiveCallout(lockedCallout);
    } else {
      setActiveCallout(null);
    }
  };

  const handleSelect = (id: string) => {
    if (lockedCallout === id) {
      setLockedCallout(null);
      setActiveCallout(null);
    } else {
      setLockedCallout(id);
      setActiveCallout(id);
    }
  };

  const handleClose = () => {
    setLockedCallout(null);
    setActiveCallout(null);
  };

  const callouts: SkillCallout[] = [
    {
      id: "app-developer",
      title: "App Developer",
      subtitle: "Websites & Android Automation",
      details: [
        "Builds custom Android applications and utility wrappers tailored for small businesses.",
        "Integrates Firestore databases & Firebase Authentication for secure, serverless backends.",
        "Crafts fluid interfaces ensuring high user engagement and smooth touch interactions."
      ],
      techStack: ["React", "Android SDK", "Firebase Integration", "Node.JS"],
      x: 25,
      y: 42,
      labelX: 5,
      labelY: 25,
      linePath: "M 25,42 h -7 L 12,25 h -5"
    },
    {
      id: "prompt-engineer",
      title: "Prompt Engineer",
      subtitle: "Prompt Building to Make Coding Easy",
      details: [
        "Engineers smart, highly context-aware prompts to speed up and simplify coding workflows.",
        "Generates clean templates, UI elements, and API pipelines on-the-fly using LLMs.",
        "Designs tailored developer-first instruction sets to minimize manual code repetition."
      ],
      techStack: ["Gemini API", "Smart Prompts", "AI Code Assistants", "Prompt Design"],
      x: 73,
      y: 46,
      labelX: 80,
      labelY: 35,
      linePath: "M 73,46 h 4 L 80,35 h 3"
    },
    {
      id: "web-developer",
      title: "Web Developer",
      subtitle: "Custom Interfaces & Frontend Specialist",
      details: [
        "Specializes in bespoke Websites that load quickly and scale beautifully across devices.",
        "Implements lightweight state architectures with React standard hooks and props.",
        "Delivers top-notch layouts using Tailwind CSS utility classes and modern layouts."
      ],
      techStack: ["React 19", "Tailwind CSS", "Vite", "JavaScript/TS"],
      x: 76,
      y: 68,
      labelX: 82,
      labelY: 75,
      linePath: "M 76,68 h 3 L 82,75 h 3"
    }
  ];

  return (
    <div className="relative w-full max-w-[800px] mx-auto min-h-[460px] sm:min-h-[500px] md:min-h-[620px] flex items-center justify-center overflow-visible">
      <div 
        style={isMobile ? { transform: `scale(${mobileScale})` } : {}}
        className="w-full h-full flex items-center justify-center relative sm:scale-100 transition-transform origin-center"
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 md:-translate-y-[calc(50%+20px)] mx-auto w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] md:w-[440px] md:h-[440px] lg:w-[470px] lg:h-[470px] rounded-full border border-neutral-200/50 flex items-center justify-center pointer-events-none select-none">
          <div className="absolute inset-0 border border-dashed border-blue-500/10 rounded-full animate-spin-slow-cw" />
          <div className="absolute w-[90%] h-[90%] border border-black/[0.03] rounded-full flex items-center justify-center animate-spin-slow-ccw">
            <div className="w-[10px] h-[10px] rounded-full bg-blue-500/10 absolute top-0" />
            <div className="w-[10px] h-[10px] rounded-full bg-emerald-500/10 absolute bottom-0" />
          </div>
          <div className="text-[9px] font-mono text-neutral-300 absolute left-2 top-2">SYS_COORD_A // L:44</div>
          <div className="text-[9px] font-mono text-neutral-300 absolute right-2 bottom-2">T_RATING // 99.8</div>
        </div>
 
        <div className="relative z-10 w-[240px] sm:w-[320px] md:w-[380px] lg:w-[415px] aspect-[3/4] flex justify-center items-end md:-translate-y-5 lg:-translate-y-5">
          <div className="absolute inset-x-12 bottom-0 top-12 bg-black/[0.12] blur-[40px] rounded-full pointer-events-none" />

          <img
            src={SuhebHero}
            alt="Suheb Hero Portrait"
            loading="eager"
            style={{ 
              clipPath: "inset(0 0 10% 0)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 88%)",
              maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 88%)"
            }}
            className="w-full h-auto object-contain z-10 transition-transform duration-300 pointer-events-none select-none"
          />

          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-20" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="none"
          >
            {callouts.map((c) => (
              <g key={`svg-lines-${c.id}`}>
                <motion.path
                  d={c.linePath}
                  fill="none"
                  stroke={activeCallout === c.id ? "#2563eb" : "#94a3b8"}
                  strokeWidth={activeCallout === c.id ? "0.6" : "0.4"}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                <circle 
                  cx={c.labelX} 
                  cy={c.labelY} 
                  r="0.5" 
                  fill={activeCallout === c.id ? "#2563eb" : "#94a3b8"} 
                />
              </g>
            ))}
          </svg>

          {callouts.map((c) => (
            <div
              key={`pin-${c.id}`}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
            >
              <button
                onClick={() => handleSelect(c.id)}
                onMouseEnter={() => handleMouseEnter(c.id)}
                onMouseLeave={handleMouseLeave}
                className="relative flex h-5 w-5 items-center justify-center cursor-pointer group"
                aria-label={`Highlight ${c.title}`}
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 transition-colors duration-300 ${activeCallout === c.id ? "bg-blue-600" : "bg-emerald-500"}`}></span>
              </button>
            </div>
          ))}

          {callouts.map((c) => (
            <div
              key={`badge-${c.id}`}
              style={{ 
                left: `${c.labelX}%`, 
                top: `${c.labelY}%`,
              }}
              className="absolute z-40 -translate-y-1/2"
            >
              <div className="flex flex-col items-start w-max">
                <button
                  onClick={() => handleSelect(c.id)}
                  onMouseEnter={() => handleMouseEnter(c.id)}
                  onMouseLeave={handleMouseLeave}
                  className={`group relative overflow-hidden px-2.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 shadow-md border border-blue-500/35 text-white rounded-lg text-[9px] sm:text-xs font-bold font-mono tracking-tight cursor-pointer transition-all duration-300 whitespace-nowrap w-max ${
                    activeCallout === c.id ? "bg-black text-white border-black" : ""
                  }`}
                >
                  <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-20 -translate-x-[200%] group-hover:translate-x-[250%] transition-transform duration-1000 ease-out pointer-events-none" />

                  <span className="relative z-10 flex items-center gap-1.5">
                    {c.id === "app-developer" && <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />}
                    {c.id === "prompt-engineer" && <Cpu className="w-3.5 h-3.5 animate-pulse flex-shrink-0" />}
                    {c.id === "web-developer" && <Code className="w-3.5 h-3.5 flex-shrink-0" />}
                    <span className="whitespace-nowrap">{c.title}</span>
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-40 max-w-sm mx-auto md:max-w-none md:absolute md:top-8 md:left-4 md:bottom-auto md:right-auto pointer-events-none">
        <AnimatePresence mode="wait">
          {activeCallout && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ 
                duration: 0.25,
                layout: { type: "spring", stiffness: 220, damping: 28 }
              }}
              className={`bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200 p-5 shadow-2xl md:w-80 md:ml-[15px] md:mr-0 md:mt-[200px] md:mb-0 pt-[20px] origin-top text-left ${
                lockedCallout !== null && activeCallout === lockedCallout ? "pointer-events-auto" : "pointer-events-none"
              }`}
              id="skill-details"
            >
              {callouts.filter((c) => c.id === activeCallout).map((c) => (
                <div key={`details-content-${c.id}`}>
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-100">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      CODER CORE_MODULE
                    </span>
                    <button 
                      onClick={handleClose}
                      className="text-xs font-mono text-neutral-400 hover:text-black cursor-pointer"
                    >
                      [close]
                    </button>
                  </div>
                  <h3 className="font-bold text-sm text-black tracking-tight mb-0.5">{c.title}</h3>
                  <p className="text-[10px] font-mono text-blue-600 mb-3">{c.subtitle}</p>
                  
                  <ul className="space-y-1.5 mb-4">
                    {c.details.map((d, i) => (
                      <li key={i} className="text-[10px] text-neutral-600 font-mono leading-relaxed flex items-start gap-1">
                        <span className="text-emerald-500 font-bold select-none">&gt;</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-1">
                    {c.techStack.map((tech) => (
                      <span 
                        key={tech} 
                        className="text-[9px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 flex items-center gap-0.5"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-yellow-500/70" />
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!activeCallout && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="px-3 py-1.5 rounded-full bg-neutral-900 text-white font-mono text-[9px] uppercase tracking-widest shadow-md flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Hover/Tap Pins on Suit for Code Stack
          </motion.div>
        </div>
      )}
    </div>
  );
}

interface HomePageProps {
  key?: string;
  onPageChange: (page: "home" | "projects") => void;
  setTechDialogOpen: (open: boolean) => void;
  setSelectedPurchaseItem: (item: any) => void;
  addToast: (msg: string, type?: "success" | "error" | "instruction" | "alert") => void;
  googleUser: any;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  isFirebaseConfigured: () => boolean;
}

export default function HomePage({
  onPageChange,
  setTechDialogOpen,
  setSelectedPurchaseItem,
  addToast,
  googleUser,
  onGoogleLogin,
  onGoogleLogout,
  isFirebaseConfigured
}: HomePageProps) {
  const [activeTab, setActiveTab] = useState<"all" | "auth" | "notifications">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Forms states
  const [selectedServiceCTA, setSelectedServiceCTA] = useState<string | null>(null);
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaPhone, setCtaPhone] = useState("");
  const [ctaName, setCtaName] = useState("");
  const [ctaSuccessMsg, setCtaSuccessMsg] = useState("");
  const [isCtaSubmitting, setIsCtaSubmitting] = useState(false);

  // Lazy components idle prefetch optimization
  useEffect(() => {
    const prefetch = () => {
      import("./ProjectPage").catch((err) => console.warn("Lazy prefetch ProjectPage failed", err));
    };
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const id = (window as any).requestIdleCallback(prefetch);
        return () => (window as any).cancelIdleCallback(id);
      } else {
        const id = setTimeout(prefetch, 2000);
        return () => clearTimeout(id);
      }
    }
  }, []);

  // Dynamic IST Clock State
  const [currentTime, setCurrentTime] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setCurrentTime(new Date().toLocaleTimeString("en-US", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredSolutions = embeddedSolutions;

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="w-full flex-grow flex flex-col justify-center select-text"
    >
      {/* Hero Section Master Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
        
        {/* LEFT COLUMN: Deep Headline and Intent Focus */}
        <div className="lg:col-span-5 space-y-6 text-left flex flex-col">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full max-w-max select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-neutral-600 font-medium uppercase tracking-wider">
              SUHEB KHAN // PORTFOLIO SYSTEM
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight leading-[1.08]">
              I build custom <span className="text-blue-600 relative inline-block">Websites & Apps<span className="absolute left-0 bottom-1 w-full h-[3px] bg-blue-100 -z-10" /></span> to automate business.
            </h1>
            <p className="text-sm text-neutral-600 font-mono leading-relaxed max-w-md">
              Hi, I am Suheb Khan. I'm a frontend developer with backend knowledge who integrates Firebase, builds custom web/android systems, and uses prompt engineering to make coding fast and seamless.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={() => onPageChange("projects")}
              className="group relative overflow-hidden inline-flex items-center justify-center gap-2 py-3 px-6 bg-neutral-900 border border-neutral-800 text-white rounded-xl text-xs font-bold transition-all duration-300 shadow-md cursor-pointer text-center"
            >
              <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-20 -translate-x-[200%] group-hover:translate-x-[250%] transition-none group-hover:transition-transform group-hover:duration-1000 group-hover:ease-out pointer-events-none" />
              <span className="relative z-10 flex items-center gap-2">
                <span>Something I've Built</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white group-hover:translate-x-1.5 transition-transform" />
              </span>
            </button>
            <button
              onClick={() => setTechDialogOpen(true)}
              className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-white border border-neutral-200 text-neutral-700 hover:text-black hover:border-black rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer text-center shadow-sm"
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Review Machine Stack</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-dashed border-neutral-200 pt-6 mt-2 max-w-sm">
            <div>
              <span className="text-xs text-neutral-400 font-mono select-none">COMPILED RUNTIMES</span>
              <p className="text-lg font-bold text-neutral-800 font-mono">100% Client-Ready</p>
            </div>
            <div>
              <span className="text-xs text-neutral-400 font-mono select-none">SPEED DISPATCH</span>
              <p className="text-lg font-bold text-neutral-800 font-mono">Instant Iteration</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Portrait Showcase */}
        <div className="lg:col-span-7 flex items-center justify-center relative my-4 lg:my-0">
          <InteractivePortrait />
        </div>
      </div>

      {/* BOTTOM SECTION: Firebase prebuild templates */}
      <div className="mt-20 space-y-6 pt-10 border-t border-neutral-200/70">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1 text-left">
            <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Database className="w-4 h-4" />
              INTEGRATION STORE // PREBUILD FIREBASE WORKBOOKS
            </span>
            <h2 className="text-xl font-bold text-black tracking-tight uppercase">
              Prebuilt Firebase Code for Integration
            </h2>
          </div>

          <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/50 self-start select-none">
            {(["all", "auth", "notifications"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-4 rounded-lg text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-neutral-500 hover:text-black"
                }`}
              >
                {tab === "all" ? "All Codes" : tab === "auth" ? "Auth Code" : "Push Alerts"}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Solutions Row Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="operational-showcase">
          <AnimatePresence mode="popLayout">
            {filteredSolutions.map((s) => {
              const isHighlighted = activeTab !== "all" && s.category === activeTab;
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className={`p-5 bg-white border rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between text-left ${
                    isHighlighted
                      ? "border-blue-500 shadow-md ring-2 ring-blue-500/10 bg-blue-50/[0.01]"
                      : "border-neutral-200/80 shadow-sm hover:shadow-md hover:border-neutral-300"
                  }`}
                >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        {s.id === "firebase-otp" && <Smartphone className="w-4 h-4" />}
                        {s.id === "firebase-google" && <Shield className="w-4 h-4" />}
                        {s.id === "firebase-push" && <Bell className="w-4 h-4" />}
                      </div>
                      <h4 className="text-sm font-black text-black leading-tight">{s.title}</h4>
                    </div>
                    <span className="text-xs sm:text-sm font-mono font-black px-3 py-1 rounded-xl border bg-blue-50 text-blue-600 border-blue-200 shadow-sm whitespace-nowrap">
                      Free
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-500 font-mono mb-3 leading-relaxed">
                    <strong>Target Task:</strong> {s.problem}
                  </p>

                  <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-start gap-1.5 mb-4">
                    <span className="text-xs font-bold text-blue-600 font-mono select-none">&rR;</span>
                    <p className="text-[10px] font-mono text-neutral-600 leading-relaxed">
                      {s.outcome}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-neutral-100 flex flex-col gap-3">
                  <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between select-none">
                    <span>Stack: {s.tech}</span>
                    <span>1-Click Deploy</span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPurchaseItem({
                        id: s.id,
                        title: s.title,
                        tech: s.tech,
                        description: s.problem + " - " + s.outcome,
                        price: s.price,
                        codeFileName: s.variants.web.codeFileName,
                        codeContent: s.variants.web.codeContent,
                        variants: {
                          web: {
                            codeFileName: s.variants.web.codeFileName,
                            codeContent: s.variants.web.codeContent,
                            tech: s.variants.web.tech,
                            description: s.problem + " - " + s.outcome
                          },
                          expo: {
                            codeFileName: s.variants.expo.codeFileName,
                            codeContent: s.variants.expo.codeContent,
                            tech: s.variants.expo.tech,
                            description: s.problem + " - " + s.outcome
                          }
                        }
                      });
                    }}
                    className="group relative overflow-hidden w-full py-2 bg-blue-600 text-white rounded-lg text-[11px] font-bold font-mono tracking-tight cursor-pointer transition-all duration-300 text-center shadow-sm"
                  >
                    <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-20 -translate-x-[200%] group-hover:translate-x-[250%] transition-none group-hover:transition-transform group-hover:duration-1000 group-hover:ease-out pointer-events-none" />
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Code</span>
                    </span>
                  </button>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </div>

      {/* EXPERT CODER CAPABILITIES & BOOKINGS */}
      <div className="mt-24 pt-10 border-t border-neutral-200/70 space-y-8" id="services-section">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 text-left">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Briefcase className="w-4 h-4 text-blue-600 animate-pulse" />
              PROFESSIONAL SERVICES // INDUSTRIAL DIRECTORY
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase">
              Expertise & Specialized Services
            </h2>
          </div>
          <p className="text-xs text-neutral-500 font-mono max-w-sm leading-relaxed">
            Tailored frontend apps, responsive layouts, active database models, and secure auth integrations.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {/* Bento 1: Consulting */}
          <div className="relative p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div>
              <div className="flex justify-between items-center mb-4 relative z-10 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-400 uppercase">[OP_SYS // DEV06]</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-tr from-teal-50 to-teal-100/50 text-teal-600 rounded-xl border border-teal-200/60 shadow-inner flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-bold tracking-widest text-teal-600 uppercase bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 select-none">ENGINE_06</span>
                  <h3 className="text-base font-black text-black tracking-tight uppercase mt-0.5">Custom Consulting</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed relative z-10">
                Bespoke 1-on-1 strategy sessions, source tree architecture mapping, frontend performance debugging, and tailored prompts integration planning.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-5 relative z-10">
                {["1-on-1 Teams", "Architecture", "Code Auditing", "Prompt Tuning", "UI Prototype"].map((stack) => (
                  <div key={stack} className="group/chip flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-teal-600 bg-neutral-50 hover:bg-teal-50/70 border border-neutral-200/50 hover:border-teal-200 rounded-lg px-2.5 py-1 transition-all duration-200 select-none">
                    <span className="text-teal-500 font-extrabold group-hover/chip:translate-x-0.5 transition-transform">&gt;</span>
                    <span>{stack}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedServiceCTA("consult");
                setCtaSuccessMsg("");
                document.getElementById("interactive-terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative overflow-hidden w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight text-center transition-all duration-200 cursor-pointer relative z-10 ${
                selectedServiceCTA === "consult" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <span className="relative z-10">Book Custom Consult</span>
            </button>
          </div>

          {/* Bento 2: Web Development */}
          <div className="relative p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div>
              <div className="flex justify-between items-center mb-4 relative z-10 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-400 uppercase">[OP_SYS // DEV01]</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-tr from-blue-50 to-blue-100/50 text-blue-600 rounded-xl border border-blue-200/60 shadow-inner flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 select-none">ENGINE_01</span>
                  <h3 className="text-base font-black text-black tracking-tight uppercase mt-0.5">Website Development</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed relative z-10">
                Pristine, lightning-fast UI solutions using React with custom Tailwind styles, coupled with lightweight Node.js/Express server logic and fully secure API proxies.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-5 relative z-10">
                {["React 19", "Tailwind CSS", "Express APIs", "Vite Config", "SSR Support"].map((stack) => (
                  <div key={stack} className="group/chip flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-blue-600 bg-neutral-50 hover:bg-blue-50/70 border border-neutral-200/50 hover:border-blue-200 rounded-lg px-2.5 py-1 transition-all duration-200 select-none">
                    <span className="text-blue-500 font-extrabold group-hover/chip:translate-x-0.5 transition-transform">&gt;</span>
                    <span>{stack}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedServiceCTA("website");
                setCtaSuccessMsg("");
                document.getElementById("interactive-terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative overflow-hidden w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight text-center transition-all duration-200 cursor-pointer relative z-10 ${
                selectedServiceCTA === "website" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <span className="relative z-10">Inquire for Website Setup</span>
            </button>
          </div>

          {/* Bento 3: App Development */}
          <div className="relative p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div>
              <div className="flex justify-between items-center mb-4 relative z-10 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-400 uppercase">[OP_SYS // DEV02]</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-tr from-indigo-50 to-indigo-100/50 text-indigo-600 rounded-xl border border-indigo-200/60 shadow-inner flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 select-none">ENGINE_02</span>
                  <h3 className="text-base font-black text-black tracking-tight uppercase mt-0.5">App Development</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed relative z-10">
                Mobile-responsive client interfaces with custom offline features, local caching architectures, native asset pipelines, and high performance states.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-5 relative z-10">
                {["React Native", "WebViews App", "Local Caching", "Assets Loader", "State Managers"].map((stack) => (
                  <div key={stack} className="group/chip flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-indigo-600 bg-neutral-50 hover:bg-indigo-50/70 border border-neutral-200/50 hover:border-indigo-200 rounded-lg px-2.5 py-1 transition-all duration-200 select-none">
                    <span className="text-indigo-500 font-extrabold group-hover/chip:translate-x-0.5 transition-transform">&gt;</span>
                    <span>{stack}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedServiceCTA("app");
                setCtaSuccessMsg("");
                document.getElementById("interactive-terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative overflow-hidden w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight text-center transition-all duration-200 cursor-pointer relative z-10 ${
                selectedServiceCTA === "app" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <span className="relative z-10">Inquire for Mobile App</span>
            </button>
          </div>

          {/* Bento 4: Firebase Auth */}
          <div className="relative p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div>
              <div className="flex justify-between items-center mb-4 relative z-10 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-400 uppercase">[OP_SYS // DEV03]</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-tr from-amber-50 to-amber-100/50 text-amber-600 rounded-xl border border-amber-200/60 shadow-inner flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-bold tracking-widest text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 select-none">ENGINE_03</span>
                  <h3 className="text-base font-black text-black tracking-tight uppercase mt-0.5">Firebase Auth Setup</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed relative z-10">
                Secure OAuth pipelines, Google Sign-In popups, persistent token verification, secure middleware guards, and Phone SMS OTP verification integrations.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-5 relative z-10">
                {["Google OAuth", "Phone OTP SMS", "JWT Auth Guard", "Token Verify", "Session Secure"].map((stack) => (
                  <div key={stack} className="group/chip flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-amber-600 bg-neutral-50 hover:bg-amber-50/70 border border-neutral-200/50 hover:border-amber-200 rounded-lg px-2.5 py-1 transition-all duration-200 select-none">
                    <span className="text-amber-500 font-extrabold group-hover/chip:translate-x-0.5 transition-transform">&gt;</span>
                    <span>{stack}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedServiceCTA("firebase-auth");
                setCtaSuccessMsg("");
                document.getElementById("interactive-terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative overflow-hidden w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight text-center transition-all duration-200 cursor-pointer relative z-10 ${
                selectedServiceCTA === "firebase-auth" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <span className="relative z-10">Inquire for Auth Setup</span>
            </button>
          </div>

          {/* Bento 5: Firestore */}
          <div className="relative p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div>
              <div className="flex justify-between items-center mb-4 relative z-10 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-400 uppercase">[OP_SYS // DEV04]</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-tr from-emerald-50 to-emerald-100/50 text-emerald-600 rounded-xl border border-emerald-200/60 shadow-inner flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 select-none">ENGINE_04</span>
                  <h3 className="text-base font-black text-black tracking-tight uppercase mt-0.5">Firestore Database DB</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed relative z-10">
                Schema mapping, document relations, security rules configurations to prevent leaks, indexing, and high-performance collection filters.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-5 relative z-10">
                {["NoSQL Firestore", "Security Rules", "DB collection", "Realtime Sync", "Fast Indexing"].map((stack) => (
                  <div key={stack} className="group/chip flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-emerald-600 bg-neutral-50 hover:bg-emerald-50/70 border border-neutral-200/50 hover:border-emerald-200 rounded-lg px-2.5 py-1 transition-all duration-200 select-none">
                    <span className="text-emerald-500 font-extrabold group-hover/chip:translate-x-0.5 transition-transform">&gt;</span>
                    <span>{stack}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedServiceCTA("firebase-firestore");
                setCtaSuccessMsg("");
                document.getElementById("interactive-terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative overflow-hidden w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight text-center transition-all duration-200 cursor-pointer relative z-10 ${
                selectedServiceCTA === "firebase-firestore" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <span className="relative z-10">Configure Firestore DB</span>
            </button>
          </div>

          {/* Bento 6: Push Alerts */}
          <div className="relative p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-sm hover:shadow-lg hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none" />
            <div>
              <div className="flex justify-between items-center mb-4 relative z-10 select-none">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-widest text-neutral-400 uppercase">[OP_SYS // DEV05]</span>
              </div>
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="p-3 bg-gradient-to-tr from-cyan-50 to-cyan-100/50 text-cyan-600 rounded-xl border border-cyan-200/60 shadow-inner flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[8px] font-mono font-bold tracking-widest text-cyan-600 uppercase bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100 select-none">ENGINE_05</span>
                  <h3 className="text-base font-black text-black tracking-tight uppercase mt-0.5">Push Notifications</h3>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-2 leading-relaxed relative z-10">
                FCM connection setup with service worker registration, browser background message listeners, web notifications triggers, and custom push panels.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-5 relative z-10">
                {["FCM Push SDK", "Service Workers", "Background Alert", "Action Triggers", "Browser Notif"].map((stack) => (
                  <div key={stack} className="group/chip flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-600 hover:text-cyan-600 bg-neutral-50 hover:bg-cyan-50/70 border border-neutral-200/50 hover:border-cyan-200 rounded-lg px-2.5 py-1 transition-all duration-200 select-none">
                    <span className="text-cyan-500 font-extrabold group-hover/chip:translate-x-0.5 transition-transform">&gt;</span>
                    <span>{stack}</span>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedServiceCTA("push");
                setCtaSuccessMsg("");
                document.getElementById("interactive-terminal")?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`group relative overflow-hidden w-full mt-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-tight text-center transition-all duration-200 cursor-pointer relative z-10 ${
                selectedServiceCTA === "push" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <span className="relative z-10">Inquire for Push Alerts</span>
            </button>
          </div>
        </div>

        {/* Dispatch Terminal Form */}
        <div id="interactive-terminal" className="bg-neutral-900 text-white rounded-3xl p-6 border border-neutral-800 shadow-xl space-y-6 relative overflow-hidden w-full transition-all duration-300">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1 text-left">
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Terminal className="w-3.5 h-3.5" />
                INTERACTIVE CONSULTATION SYSTEM // FORM DISPATCH
              </span>
              <h3 className="text-base font-black text-white uppercase tracking-tight">
                Queue-Register Your Service Specification
              </h3>
            </div>
            <span className="text-[9px] font-mono font-bold text-white px-3 py-1 bg-neutral-800 rounded-lg border border-neutral-700 select-none">
              MODE: {selectedServiceCTA ? selectedServiceCTA.toUpperCase() : "GENERAL DISPATCH"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!ctaSuccessMsg ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (isCtaSubmitting) return;

                  if (!ctaName || !ctaName.trim()) {
                    addToast("Attention: Please enter your Full Name to register!", "alert");
                    return;
                  }
                  if (ctaName.trim().length > 26) {
                    addToast("Validation Failed: Full Name cannot exceed 26 characters!", "error");
                    return;
                  }
                  if (!ctaPhone || !ctaPhone.trim()) {
                    addToast("Attention: Please enter your 10-digit Mobile Number to register!", "alert");
                    return;
                  }
                  if (!ctaEmail || !ctaEmail.trim()) {
                    addToast("Attention: Please enter your Email Address to register!", "alert");
                    return;
                  }

                  // Perform centralized input validation & sanitization
                  const nameValidation = validateContactName(ctaName);
                  if (!nameValidation.valid) {
                    addToast(`Validation Failed: ${nameValidation.reason || "Please enter a valid full name (max 26 characters)"}`, "error");
                    return;
                  }

                  const phoneValidation = validatePhoneNumber(ctaPhone);
                  if (!phoneValidation.valid) {
                    addToast(`Validation Failed: ${phoneValidation.reason || "Please enter a valid 10-digit mobile number (starts with 6-9)"}`, "error");
                    return;
                  }

                  const emailValidation = validateEmail(ctaEmail);
                  if (!emailValidation.valid) {
                    addToast("Validation Failed: Please enter a valid email address!", "error");
                    return;
                  }

                  const cleanName = nameValidation.sanitizedValue || ctaName.trim();
                  const cleanPhone = phoneValidation.sanitizedValue || ctaPhone.trim();
                  const cleanEmail = emailValidation.sanitizedValue || ctaEmail.trim();

                  const lookup = {
                    "website": "Custom Web Application Design",
                    "app": "Mobile Responsive Utility App",
                    "firebase-auth": "Firebase User Authentication",
                    "firebase-firestore": "Firestore Real-time DB Database Setup",
                    "push": "FCM Background Notification Setup",
                    "consult": "1-on-1 Performance Consultation"
                  };

                  const selectedAction = lookup[selectedServiceCTA as keyof typeof lookup] || "General Consultation Request";
                  const contactStr = `Email: ${cleanEmail}, Phone: ${cleanPhone}`;

                  setIsCtaSubmitting(true);

                  try {
                    // UPDATED: FIRESTORE-STRUCTURE
                    if (isFirebaseConfigured()) {
                      const db = getFirebaseFirestore();
                      if (googleUser && googleUser.uid) {
                        const path = `users/${googleUser.uid}/inquiries`;
                        try {
                          await addDoc(collection(db, path), {
                            inquirerName: cleanName,
                            phone: cleanPhone,
                            email: cleanEmail,
                            mode: selectedServiceCTA || "general",
                            selectedAction,
                            timestamp: new Date().toISOString(),
                            uid: googleUser.uid
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, path);
                        }
                      } else {
                        const path = "guest_inquiries";
                        try {
                          await addDoc(collection(db, path), {
                            inquirerName: cleanName,
                            phone: cleanPhone,
                            email: cleanEmail,
                            mode: selectedServiceCTA || "general",
                            selectedAction,
                            timestamp: new Date().toISOString()
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, path);
                        }
                      }
                    }

                    setCtaSuccessMsg(`Successfully queue-registered "${selectedAction}" for "${ctaName}". Suheb will contact you shortly over ${contactStr}.`);
                    addToast(`Success! Queue-registered dynamic challenge for "${ctaName}"!`, "success");

                    setCtaName("");
                    setCtaEmail("");
                    setCtaPhone("");
                  } catch (error) {
                    console.error("Firebase Error saving inquiry:", error);
                    addToast("Submission Failed: Google Cloud Firestore security permission error or connection timeout.", "error");
                  } finally {
                    setIsCtaSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center select-none">
                      <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase block">Inquirer Full Name</label>
                      <span className="text-[8px] font-mono text-red-400 font-bold uppercase tracking-wider">[Required]</span>
                    </div>
                    <input
                      required
                      type="text"
                      maxLength={26}
                      value={ctaName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length >= 26 && ctaName.length < 26) {
                          addToast("Limit reached: Full Name cannot exceed 26 characters!", "error");
                        }
                        setCtaName(val.slice(0, 26));
                      }}
                      placeholder="your full name..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center select-none">
                      <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase block">Phone Number</label>
                      <span className="text-[8px] font-mono text-red-400 font-bold uppercase tracking-wider">[Required]</span>
                    </div>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      value={ctaPhone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setCtaPhone(val.slice(0, 10));
                      }}
                      placeholder="10-digit phone number"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="flex justify-between items-center select-none">
                      <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase block">Email Address</label>
                      <span className="text-[8px] font-mono text-red-400 font-bold uppercase tracking-wider">[Required]</span>
                    </div>
                    <input
                      required
                      type="email"
                      value={ctaEmail}
                      onChange={(e) => setCtaEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 p-4 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-left">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold block select-none">[AUTO_DETECTED_SELECTION_PARAMETERS]</span>
                  <p className="text-xs text-neutral-300 font-mono leading-relaxed mt-1">
                    {selectedServiceCTA === "website" && "Initial payload: Requesting aesthetic scalable React UI frontend built over single-view dashboard structure with standard Node.js server connections."}
                    {selectedServiceCTA === "app" && "Initial payload: Requiring modern responsive views with custom state variables, local file system simulation caches, and lightweight JavaScript models."}
                    {selectedServiceCTA === "firebase-auth" && "Initial payload: Implementing custom Google OAuth popups state transitions, session handling logic, or Phone OTP SMS verify configurations."}
                    {selectedServiceCTA === "firebase-firestore" && "Initial payload: Designing reactive database models architecture, nested documents routing, or custom firebase Firestore security policies."}
                    {selectedServiceCTA === "push" && "Initial payload: Activating firebase service messaging worker file structures, background notifications, and client foreground alert modules."}
                    {selectedServiceCTA === "consult" && "Initial payload: Initiating custom 1-on-1 strategy meeting slot to discuss architectural enhancements, optimization codes, and prompt integrations."}
                    {!selectedServiceCTA && "System: Click any 'Inquire' or 'Configure' button on the cards above to pre-load targeted metadata parameters, or send a general message below."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isCtaSubmitting}
                  className={`group relative overflow-hidden w-full py-3 text-xs font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 font-mono ${
                    isCtaSubmitting
                      ? "bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-80"
                      : "bg-blue-600 hover:bg-white hover:text-black text-white cursor-pointer"
                  }`}
                >
                  <div className="absolute inset-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-20 -translate-x-[200%] group-hover:translate-x-[250%] transition-transform duration-1000 ease-out pointer-events-none" />
                  {isCtaSubmitting ? (
                    <div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{isCtaSubmitting ? "Compiling and Sending Request..." : "Submit Service Inquiry to Suheb"}</span>
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-2xl space-y-3 text-xs text-left"
              >
                <div className="flex items-center gap-1.5 font-bold font-mono text-[10px] text-white uppercase tracking-wider select-none">
                  <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>Inquiry Registered and Compiled</span>
                </div>
                <p className="font-mono text-zinc-200 leading-relaxed">
                  {ctaSuccessMsg}
                </p>
                <div className="pt-2 flex">
                  <button
                    onClick={() => {
                      setSelectedServiceCTA(null);
                      setCtaSuccessMsg("");
                    }}
                    className="group inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-750 text-xs font-mono font-black text-neutral-300 hover:text-white rounded-xl transition-all duration-300 cursor-pointer shadow-md hover:bg-neutral-900"
                  >
                    <span>Configure Another Capability Specification</span>
                    <span className="text-emerald-400 font-normal group-hover:translate-x-1.5 transition-transform duration-300">&rarr;</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* SYSTEM CONNECTIVITY HUB */}
      <section className="mt-20 border-t border-neutral-200 pt-16 space-y-10 w-full text-left">
        <div className="space-y-2">
          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-wider select-none">
            // SYSTEM CONNECTIVITY & CREDENTIAL GATEWAY
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-neutral-900 uppercase tracking-tight scroll-mt-24" id="connect-section">
            Developer Connection Hub
          </h2>
          <p className="text-xs md:text-sm text-neutral-500 max-w-3xl leading-relaxed">
            Synthesize direct communication channels, explore Suheb Khan's public codebases, or initiate a secure developer session simulation via Google SSO integration.
          </p>
        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left panel: Auth box */}
          <div className="lg:col-span-5 bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600" />
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

            <div className="space-y-4 relative z-10 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4 select-none">
                  <span className="text-[9px] font-mono font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    AUTH Gateway // Secure SSO
                  </span>
                  <span className="text-[8px] font-mono text-neutral-400">SESSION_v1.2</span>
                </div>
                <h3 className="text-base font-black text-neutral-900 uppercase">Google Workspace Session</h3>
                <p className="text-[11px] text-neutral-500 leading-relaxed mt-1 font-mono">
                  Establishing an active SSO session simulates live database interactions, provides reactive developer-level feedback logs, and unlocks custom prebuilt source downloads.
                </p>
              </div>

              <div className="bg-neutral-50/70 border border-neutral-200 rounded-2xl p-4 space-y-2.5 select-none text-left">
                <span className="text-[8.5px] font-mono font-black text-indigo-600 uppercase tracking-wider block">
                  // SESSION REVENUE & INTEGRATION SCOPES
                </span>
                <ul className="space-y-2 font-mono text-[10px] text-neutral-600 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500 font-black shrink-0">&gt;</span>
                    <span>Instant bypass of public demo limits for secure code bundle downloads.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500 font-black shrink-0">&gt;</span>
                    <span>Establish safe OAuth token exchanges to interact with Google Workspace APIs.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4 min-h-[160px] flex flex-col justify-center items-center my-4 transition-all duration-300">
                <AnimatePresence mode="wait">
                  {googleUser ? (
                    <motion.div
                       key="logged-in"
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="w-full text-center space-y-3"
                    >
                      <div className="flex items-center justify-center relative">
                        {googleUser.picture ? (
                          <img
                            src={googleUser.picture}
                            alt="Google user avatar"
                            className="w-14 h-14 rounded-full border-2 border-emerald-500 shadow-sm mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full border-2 border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-base shadow-sm mx-auto">
                            {googleUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-[40%] sm:right-[42%] w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-neutral-800 tracking-tight">{googleUser.name}</h4>
                        <p className="text-[10px] text-neutral-500 font-mono">{googleUser.email}</p>
                      </div>

                      <div className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[8px] font-mono text-emerald-700 select-none">
                        active: JWT_SESSION_TOKEN_CONNECTED
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={onGoogleLogout}
                          className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-mono font-bold rounded-lg transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Disconnect Session</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="logged-out"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center space-y-4"
                    >
                      <p className="text-[10px] font-mono text-neutral-400 select-none">
                        Currently running in [GUEST_MODE] // SSO Session is idle.
                      </p>
                      
                      <button
                        onClick={onGoogleLogin}
                        className="flex items-center gap-3 bg-white hover:bg-neutral-50 border border-neutral-300 shadow-sm rounded-xl px-5 py-2.5 text-xs font-bold text-neutral-700 transition-all duration-200 active:scale-[0.98] select-none cursor-pointer mx-auto"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.13-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>Login with Google to Suheb Dev</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="text-[9px] font-mono text-neutral-400 mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between relative z-10 select-none">
              <span>SECURITY PROTOCOL OK</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ACTIVE LISTENER SENSOR
              </span>
            </div>
          </div>

          {/* Right panel: Emails & socials */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Email Envelope */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-2 text-neutral-100 group-hover:text-blue-500/10 transition-colors pointer-events-none">
                  <Mail className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3 select-none">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider uppercase">// DIRECT DISPATCH</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-neutral-800 font-mono break-all">suhebdev201@gmail.com</h4>
                    <p className="text-[10px] text-neutral-400">Primary inbox for secure collaboration contracts.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <a href="mailto:suhebdev201@gmail.com" className="flex-grow text-center py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[10px] font-bold rounded-lg transition-colors select-none">
                    Send Email
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("suhebdev201@gmail.com");
                      setCopiedField("email");
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className={`p-2 border rounded-lg transition-colors relative cursor-pointer ${
                      copiedField === "email"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-black"
                    }`}
                    title="Copy Email"
                  >
                    {copiedField === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-scaleIn" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Phone Dial */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-2 text-neutral-100 group-hover:text-emerald-500/10 transition-colors pointer-events-none">
                  <Phone className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3 select-none">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider uppercase">// DIRECT DIAL</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-neutral-800 font-mono">+91 86689 38029</h4>
                    <p className="text-[10px] text-neutral-400">Direct mobile hot-line & WhatsApp chat line.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3">
                  <a href="https://wa.me/918668938029" target="_blank" rel="noreferrer" className="flex-grow text-center py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold rounded-lg transition-colors select-none">
                    WhatsApp Chat
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("+91 86689 38029");
                      setCopiedField("phone");
                      setTimeout(() => setCopiedField(null), 2000);
                    }}
                    className={`p-2 border rounded-lg transition-colors relative cursor-pointer ${
                      copiedField === "phone"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-black"
                    }`}
                    title="Copy Phone"
                  >
                    {copiedField === "phone" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 animate-scaleIn" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated Live Feed */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between group">
              <div className="absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-60" />
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3 select-none">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-neutral-800 uppercase tracking-tight">System Status: ONLINE</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500 font-mono text-[9px] bg-neutral-50 px-2 py-0.5 rounded-lg border border-neutral-200/50">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span>IST // {currentTime || "12:00:00 AM"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left font-mono">
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-neutral-400 block uppercase font-bold">// HEALTH NODE</span>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-neutral-800">RUNNING [100%]</span>
                  </div>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-neutral-400 block uppercase font-bold">// LATENCY INDEX</span>
                  <span className="text-[10px] font-bold text-neutral-800 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    ~14ms to Server
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-neutral-400 block uppercase font-bold">// PRODUCTION LOAD</span>
                  <span className="text-[10px] font-bold text-neutral-800">OPTIMAL / LOW LOAD</span>
                </div>
              </div>

              <div className="bg-neutral-900 text-emerald-400 rounded-xl p-3 font-mono text-[9px] leading-relaxed relative shadow-inner text-left">
                <div className="absolute top-2.5 right-2.5 text-neutral-600 font-mono text-[8.5px] select-none">SUHEB_ENV_DEPL</div>
                <div className="flex items-center gap-1.5 text-white border-b border-neutral-800 pb-1.5 mb-1.5 select-none">
                  <span className="text-[8px] bg-emerald-500 text-neutral-950 px-1 py-0.5 rounded font-black">SYS</span>
                  <span>Active Deployment Protocol Feed</span>
                </div>
                <div className="space-y-0.5 max-h-[48px] overflow-y-auto">
                  <p className="text-emerald-400/90">&gt; INITIALIZING SECURE OAUTH GATEWAY...</p>
                  <p className="text-emerald-300/85">&gt; COMPILING CLIENT-SIDE VITE ASSETS: OK [0.22s]</p>
                  <p className="text-neutral-400/60">&gt; WEB_SERVER LISTENING ON PORT 3000 (0.0.0.0)</p>
                </div>
              </div>
            </div>

            {/* Interactive Social Grid */}
            <div className="bg-neutral-50 border border-neutral-200/60 rounded-3xl p-5 shadow-inner space-y-3">
              <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider uppercase select-noneBlock block text-left">// PUBLIC INTERACTIVE SOCIAL MATRIX</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { name: "LinkedIn", url: "https://www.linkedin.com/in/suhebkhan201", icon: <Linkedin className="w-4 h-4" />, color: "hover:bg-blue-600 hover:text-white hover:border-blue-600 text-neutral-700 bg-white" },
                  { name: "GitHub", url: "https://github.com/suhebdev", icon: <Github className="w-4 h-4" />, color: "hover:bg-neutral-900 hover:text-white hover:border-neutral-900 text-neutral-700 bg-white" },
                  { name: "Twitter (X)", url: "https://www.twitter.com/in/suhebkhan201", icon: <Twitter className="w-4 h-4" />, color: "hover:bg-neutral-900 hover:text-white hover:border-neutral-900 text-neutral-700 bg-white" },
                  { name: "Instagram", url: "https://www.instagram.com/suheb.dev/", icon: <Instagram className="w-4 h-4" />, color: "hover:bg-gradient-to-tr hover:from-yellow-500 hover:via-pink-500 hover:to-purple-600 hover:text-white hover:border-pink-500 text-neutral-700 bg-white" },
                  { name: "Facebook", url: "https://www.facebook.com/suheb.codes/", icon: <Facebook className="w-4 h-4" />, color: "hover:bg-blue-800 hover:text-white hover:border-blue-800 text-neutral-700 bg-white" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex flex-col items-center justify-center p-3 border border-neutral-200 rounded-xl transition-all duration-300 space-y-2 group shadow-sm select-none ${social.color}`}
                  >
                    <div className="transition-transform duration-300 group-hover:scale-110 flex items-center justify-center">
                      {social.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-tight">{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>
    </motion.div>
  );
}
