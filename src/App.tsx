import { useState, useEffect, useRef, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Shield, Terminal, CheckCircle, Cpu, Globe, Smartphone } from "lucide-react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage";
import ProjectPage from "./components/ProjectPage";
import ToolsPage from "./components/ToolsPage";
import ToastNotification, { Toast } from "./components/ToastNotification";
// @ts-ignore
import SuhebHero from "./SuhebHero-removebg-preview.png";
import { InteractiveCircuit, AnimatedPrice, TechStackDialogue, ContactModal, HireMeModal, DisconnectConfirmationModal } from "./components/Components";
import { 
  isFirebaseConfigured, 
  getFirebaseAuth, 
  loginWithGoogleFirebase, 
  logoutFirebase,
  syncUserToFirestore
} from "./lib/firebase";

declare global {
  interface Window {
    showToast?: (message: string, type: "success" | "error" | "instruction" | "alert") => void;
    __loaderDone?: () => void;
    __signalAppReady?: () => void;
  }
}

// Global Audio Helper to reuse AudioContext and synthesize beautiful spatial sound-fx on actions
let globalAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!globalAudioCtx) {
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

// Play distinctive, ultra-polished minimal sounds for action notification events
export function playTypeSound(type: "success" | "error" | "instruction" | "alert") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === "success") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now + 0.08);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(1.2, now + 0.015);
      gain.gain.setValueAtTime(1.2, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    } 
    else if (type === "error") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = "triangle";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(140, now);
      osc1.frequency.linearRampToValueAtTime(110, now + 0.08);

      osc2.frequency.setValueAtTime(130, now + 0.1);
      osc2.frequency.linearRampToValueAtTime(100, now + 0.18);

      gain1.gain.setValueAtTime(0.0, now);
      gain1.gain.linearRampToValueAtTime(1.2, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      gain2.gain.setValueAtTime(0.0, now + 0.1);
      gain2.gain.linearRampToValueAtTime(1.0, now + 0.11);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.09);

      osc2.start(now + 0.1);
      osc2.stop(now + 0.19);
    } 
    else if (type === "instruction") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(455, now + 0.15);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } 
    else if (type === "alert") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.setValueAtTime(950, now + 0.04);

      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(1.0, now + 0.01);
      gain.gain.setValueAtTime(1.0, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch (e) {
    // Fail silently in unsupported web environments
  }
}

function playClickSynth() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);
    
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
    
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (e) {
    // Fail silently
  }
}

const MinimalSpinnerFallback = () => (
  <div className="flex items-center justify-center p-12 w-full">
    <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRestoredRef = useRef(false);
  const [restorationComplete, setRestorationComplete] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);

  // Preload the Hero Portrait Image immediately on app mount to avoid transition lag/flashing
  useEffect(() => {
    const img = new Image();
    img.src = SuhebHero;
  }, []);

  // Restore path on first mount
  useEffect(() => {
    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      const savedPath = sessionStorage.getItem('vibe_last_path');
      const currentFull = location.pathname + location.search;
      if (savedPath && savedPath !== '/' && savedPath !== currentFull) {
        navigate(savedPath, { replace: true });
      }
      setRestorationComplete(true);
    }
  }, [navigate, location]);

  // Synchronize 'vibe_last_path' into sessionStorage on subsequent route changes
  useEffect(() => {
    if (restorationComplete) {
      sessionStorage.setItem('vibe_last_path', location.pathname + location.search);
    }
  }, [location, restorationComplete]);

  // Complete the loader once both route restoration is made and authentication resolves
  useEffect(() => {
    // Generous fallback safety timer (6 seconds) to prevent infinite loading if auth/network hangs
    const safetyTimer = setTimeout(() => {
      const signalReady = window.__signalAppReady || window.__loaderDone;
      if (typeof signalReady === 'function') {
        signalReady();
      }
      document.dispatchEvent(new CustomEvent('APP_READY'));
    }, 6000);

    if (restorationComplete && authResolved) {
      // Double requestAnimationFrame ensures React has completed DOM commit
      // and the browser has painted the initial route view underneath the loader
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const signalReady = window.__signalAppReady || window.__loaderDone;
          if (typeof signalReady === 'function') {
            signalReady();
          }
          document.dispatchEvent(new CustomEvent('APP_READY'));
        });
      });
    }

    return () => clearTimeout(safetyTimer);
  }, [restorationComplete, authResolved]);

  // Derive currentPage from layout path
  const getPageFromPath = (path: string): "home" | "projects" | "tools" => {
    if (path.startsWith("/Projects") || path.startsWith("/projects")) return "projects";
    if (path.startsWith("/Tools") || path.startsWith("/tools")) return "tools";
    return "home";
  };
  const currentPage = getPageFromPath(location.pathname);

  const [hireMeModalOpen, setHireMeModalOpen] = useState(false);
  const [bottleneckModalOpen, setBottleneckModalOpen] = useState(false);
  const [techDialogOpen, setTechDialogOpen] = useState(false);

  const [selectedPurchaseItem, setSelectedPurchaseItem] = useState<{
    id: string;
    title: string;
    tech: string;
    description: string;
    price: string;
    codeFileName: string;
    codeContent: string;
    initialVariant?: "web" | "expo";
    variants?: {
      web: {
        codeFileName: string;
        codeContent: string;
        tech: string;
        description: string;
      };
      expo: {
        codeFileName: string;
        codeContent: string;
        tech: string;
        description: string;
      };
    };
  } | null>(null);


  const [activeVariant, setActiveVariant] = useState<"web" | "expo">("web");

  // Track active platform variant (web vs expo) for each project ID to synchronize across components
  const [projectPlatformStates, setProjectPlatformStates] = useState<Record<string, "web" | "expo">>({
    "firebase-otp": "web",
    "firebase-google-auth": "web"
  });

  useEffect(() => {
    if (selectedPurchaseItem) {
      setActiveVariant(selectedPurchaseItem.initialVariant || "web");
    } else {
      setActiveVariant("web");
    }
  }, [selectedPurchaseItem]);

  // FIXED: Removed copy-paste progressive systems hydration simulation 1600ms artificial timer useEffect hook

  // Floating Toast Notifications List State (Unlimited concurrent toasts supported)
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Cache tracking active/recent notifications (by message string) for 3-second TTL duplicate prevention
  const toastCacheRef = useRef<Set<string>>(new Set());
  // Tracks active TTL timeout references for cleanups to prevent memory leaks
  const toastCacheTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up all active duplicate cache timeouts if App unmounts
  useEffect(() => {
    return () => {
      toastCacheTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      toastCacheTimeoutsRef.current.clear();
      toastCacheRef.current.clear();
    };
  }, []);

  const addToast = (message: string, type: "success" | "error" | "instruction" | "alert" = "success") => {
    const msgStr = typeof message === "string" ? message : String(message || "");
    if (!msgStr) return;

    // Check duplicate prevention cache (Independent de-duplication mechanism with 3-second TTL)
    if (toastCacheRef.current.has(msgStr)) {
      return;
    }

    // Register into the duplicate prevention cache
    toastCacheRef.current.add(msgStr);

    // Set TTL limit to automatically evict message from cache after 3 seconds (3000ms)
    const timeoutId = setTimeout(() => {
      toastCacheRef.current.delete(msgStr);
      toastCacheTimeoutsRef.current.delete(msgStr);
    }, 3000);

    // Safeguard to cancel and replace any pre-existing timer on exact key matching (edge case)
    const existingTimeout = toastCacheTimeoutsRef.current.get(msgStr);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    toastCacheTimeoutsRef.current.set(msgStr, timeoutId);

    // Generate unique ID for this instance
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);

    // Append to active toasts (no size constraints/limits, accommodating unlimited notifications shown concurrently)
    setToasts((prev) => [
      ...prev,
      {
        id,
        type,
        message: msgStr
      }
    ]);

    // Play action indicator sound after a small delay to sync with visual entry animation
    setTimeout(() => {
      playTypeSound(type);
    }, 150);

    // Dismiss from display strictly on its own auto-dismiss timer (3 seconds)
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  };

  const addToastRef = useRef(addToast);
  useEffect(() => {
    addToastRef.current = addToast;
  }, [addToast]);

  // Connect global window.showToast trigger and global click sound effect synthesizer
  useEffect(() => {
    window.showToast = (message: string, type: "success" | "error" | "instruction" | "alert") => {
      addToastRef.current(message, type);
    };

    // Install window.onerror and unhandled promise rejection tracking
    const handleGlobalError = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      const msgStr = typeof message === "string" ? message : (message as any)?.message || "Script Error";
      const file = source ? source.substring(source.lastIndexOf("/") + 1) : "unknown";
      const logMsg = `[Global Error] ${msgStr} at ${file}:${lineno || 0}:${colno || 0}`;
      
      console.error(logMsg, error);
      
      // Toast the captured global error to the developer in the UI
      addToastRef.current(
        `🚨 Uncaught System Error: "${msgStr}" recorded at ${file}:${lineno || 0}`,
        "error"
      );
      return false; // Let browser process normally
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reMsg = reason instanceof Error ? reason.message : String(reason || "Implicit Promise Abort");
      console.error("[Unhandled Promise Rejection]", reason);
      
      addToastRef.current(
        `⚠️ Unhandled Async Reject: "${reMsg}"`,
        "error"
      );
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const element = target.closest("button, a, input, select, textarea, [role='button'], .cursor-pointer");
      if (element) {
        playClickSynth();
      }
    };

    window.onerror = handleGlobalError;
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    document.addEventListener("mousedown", handleGlobalClick, { capture: true });

    return () => {
      delete window.showToast;
      window.onerror = null;
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      document.removeEventListener("mousedown", handleGlobalClick, { capture: true });
    };
  }, []);

  const handlePageChange = (page: "home" | "projects" | "tools") => {
    const html = document.documentElement;
    const originalBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    
    if (page === "home") navigate("/");
    else if (page === "projects") navigate("/Projects");
    else if (page === "tools") navigate("/Tools");

    setTimeout(() => {
      html.style.scrollBehavior = originalBehavior;
    }, 50);
  };

  // Google authentication states
  const [googleUser, setGoogleUser] = useState<{
    uid?: string;
    name: string;
    email: string;
    picture?: string;
  } | null>(() => {
    const saved = localStorage.getItem("suheb_google_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);

  // Synchronize Google User auth state with Firebase if configured
  useEffect(() => {
    if (isFirebaseConfigured()) {
      try {
        const auth = getFirebaseAuth();
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            const userData = {
              uid: user.uid,
              name: user.displayName || "Google User",
              email: user.email || "",
              picture: user.photoURL || undefined
            };
            setGoogleUser(userData);
            localStorage.setItem("suheb_google_user", JSON.stringify(userData));
            
            await syncUserToFirestore(user).catch((err) => {
              console.error("Auto firestore sync error:", err);
              addToast(`Firestore user sync failed: ${err.message || err}`, "error");
            });
          } else {
            setGoogleUser(null);
            localStorage.removeItem("suheb_google_user");
          }

          setAuthResolved(true);
        });
        return () => unsubscribe();
      } catch (err) {
        console.warn("Firebase Auth setup error:", err);
        setAuthResolved(true);
      }
    } else {
      setAuthResolved(true);
    }
  }, [navigate]);

  const loginGoogle = async () => {
    if (!isFirebaseConfigured()) {
      // Simulate login for offline testing if Firebase is not loaded
      const mockUser = {
        uid: "mock-uid-suheb",
        name: "Suheb Offline Developer",
        email: "suhebdev.test@gmail.com",
        picture: undefined
      };
      setGoogleUser(mockUser);
      localStorage.setItem("suheb_google_user", JSON.stringify(mockUser));
      addToast("Signed in successfully (Simulated Developer Mode)!", "success");
      return;
    }
    
    try {
      const res = await loginWithGoogleFirebase();
      if (res) {
        addToast("Successfully authorized Google login session!", "success");
      }
    } catch (err: any) {
      addToast(err.message || "Failed to authorize Google SSO session", "error");
    }
  };

  const logoutGoogle = async () => {
    setIsDisconnectConfirmOpen(true);
  };

  const executeLogoutGoogle = async () => {
    // FIXED: SESSION-PERSIST
    sessionStorage.clear();
    if (!isFirebaseConfigured()) {
      setGoogleUser(null);
      localStorage.removeItem("suheb_google_user");
      addToast("Successfully disconnected simulation session.", "instruction");
      return;
    }
    try {
      await logoutFirebase();
      addToast("Successfully disconnected Google session.", "instruction");
    } catch (err: any) {
      addToast("Error signing out: " + err.message, "error");
    }
  };

  const handleInquirySubmit = (data: { businessName: string; challenge: string }) => {
    addToast(`Transmission received from "${data.businessName}"!`, "success");
  };

  // FIXED: Prevent page scroll when any modal is active (removed isBooting reference)
  useEffect(() => {
    if (hireMeModalOpen || bottleneckModalOpen || techDialogOpen || selectedPurchaseItem || isDisconnectConfirmOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [hireMeModalOpen, bottleneckModalOpen, techDialogOpen, selectedPurchaseItem, isDisconnectConfirmOpen]);

  const renderMainLayout = (element: React.ReactNode, pageType: "home" | "projects" | "tools") => (
    <div className="flex flex-col min-h-grow">
      <InteractiveCircuit />

      <Header 
        onHireClick={() => setHireMeModalOpen(true)} 
        onStackClick={() => setTechDialogOpen(true)}
        currentPage={pageType}
        onPageChange={handlePageChange}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative text-center">
        {element}
      </main>

      <Footer 
        onPageChange={handlePageChange}
        onHireClick={() => setHireMeModalOpen(true)}
        onRequestCustomBuild={() => setBottleneckModalOpen(true)}
        onStackClick={() => setTechDialogOpen(true)}
      />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#fcfcfc] text-neutral-800 flex flex-col overflow-x-hidden font-sans select-text">
      
      {/* FIXED: Removed duplicate redundant systems bootloader loader skeleton AnimatePresence block */}


      {/* 
         PRE-LOADING ARCHITECTURE: Keeping pages fully mounted but conditionally visible.
         This resolves all Firestore, firebase authentication, and assets load tasks quietly 
         in the background while the user reads, providing a seamless 0ms toggle experience!
      */}
      <Routes>
        {/* Main/Landing Layout Routes */}
        <Route 
          path="/" 
          element={renderMainLayout(
            <HomePage
              onPageChange={handlePageChange}
              setTechDialogOpen={setTechDialogOpen}
              setSelectedPurchaseItem={setSelectedPurchaseItem}
              addToast={addToast}
              googleUser={googleUser}
              onGoogleLogin={loginGoogle}
              onGoogleLogout={logoutGoogle}
              isFirebaseConfigured={isFirebaseConfigured}
            />,
            "home"
          )} 
        />
        <Route 
          path="/Projects" 
          element={renderMainLayout(
            <ProjectPage
              onHireClick={() => setHireMeModalOpen(true)}
              onRequestCustomBuild={() => setBottleneckModalOpen(true)}
              onSetSelectedPurchaseItem={setSelectedPurchaseItem}
              onAddToast={addToast}
              projectPlatformStates={projectPlatformStates}
              setProjectPlatformStates={setProjectPlatformStates}
            />,
            "projects"
          )} 
        />
        <Route 
          path="/Tools" 
          element={renderMainLayout(
            <ToolsPage
              googleUser={googleUser}
              onGoogleLogin={loginGoogle}
              onGoogleLogout={logoutGoogle}
              addToast={addToast}
            />,
            "tools"
          )} 
        />

        {/* Fallback redirect unrecognized paths to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Tech Stack dialog modal */}
      <AnimatePresence>
        {techDialogOpen && (
          <TechStackDialogue 
            isOpen={techDialogOpen} 
            onClose={() => setTechDialogOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Dedicated Hire Me / Start a Project Modal */}
      <AnimatePresence>
        {hireMeModalOpen && (
          <HireMeModal 
            isOpen={hireMeModalOpen} 
            onClose={() => setHireMeModalOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Intake bottleneck proposal dialog */}
      <AnimatePresence>
        {bottleneckModalOpen && (
          <ContactModal 
            isOpen={bottleneckModalOpen} 
            onClose={() => setBottleneckModalOpen(false)} 
            onSubmitSuccess={handleInquirySubmit}
            // FIXED: AUTH-TIMING
            googleUser={googleUser}
          />
        )}
      </AnimatePresence>

      {/* Modern Prebuilt Code Purchase Checkout Modal with UPI QR Simulation */}
      <AnimatePresence>
        {selectedPurchaseItem && (
          <div className="fixed inset-0 z-[99990] flex items-stretch sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedPurchaseItem(null)}>
            {/* Backdrop */}
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Content Box */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={false}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15, ease: "easeIn" }}
              className="relative w-full h-full sm:h-auto max-w-none sm:max-w-md bg-white rounded-none sm:rounded-3xl shadow-2xl p-6 sm:p-8 border-t-[5px] border-t-blue-600 sm:border-x sm:border-b border-neutral-100 max-h-full sm:max-h-[90vh] overflow-y-auto no-scrollbar font-sans text-left z-10"
            >
              
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={() => setSelectedPurchaseItem(null)}
                  className="p-1 px-2 text-xs font-mono text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                >
                  [Esc]
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <span className="text-[9px] font-mono font-bold text-blue-600 uppercase tracking-widest px-2.5 py-0.5 bg-blue-50 rounded-full border border-blue-100 animate-pulse">
                    Secure Download Gateway
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-black mt-2 leading-tight pr-8">
                    {selectedPurchaseItem.title}
                  </h3>
                </div>

                {/* Dynamic Web vs Mobile Expo toggle segment */}
                {selectedPurchaseItem.variants && (
                  <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200/50 select-none">
                    <button
                      onClick={() => {
                        setActiveVariant("web");
                        if (selectedPurchaseItem.id) {
                          setProjectPlatformStates((prev) => ({
                            ...prev,
                            [selectedPurchaseItem.id]: "web"
                          }));
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeVariant === "web"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-neutral-500 hover:text-black"
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Web App Version</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveVariant("expo");
                        if (selectedPurchaseItem.id) {
                          setProjectPlatformStates((prev) => ({
                            ...prev,
                            [selectedPurchaseItem.id]: "expo"
                          }));
                        }
                      }}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeVariant === "expo"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-neutral-500 hover:text-black"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile App (Expo)</span>
                    </button>
                  </div>
                )}

                <p className="text-xs text-neutral-500 font-mono leading-relaxed">
                  {selectedPurchaseItem.variants
                    ? (activeVariant === "web"
                        ? "Unlock instant access to client-ready high-performance boilerplate integration script. Complete with clean ESM module imports."
                        : "Unlock instant access to mobile-responsive managed Expo App boilerplate. Touch-optimized with native persistent auth loaders.")
                    : selectedPurchaseItem.description
                  }
                </p>

                <div className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-green-200 bg-green-50/20 text-center select-none">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2.5">
                    <CheckCircle className="w-4 h-4 animate-bounce" />
                  </div>
                  <p className="text-xs font-black font-mono uppercase tracking-wider flex items-center gap-2">
                    <span className="line-through text-neutral-400 font-normal">₹99</span>
                    <span className="text-emerald-600 font-bold">FREE ACCESS</span>
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500 mt-1.5 leading-relaxed max-w-sm">
                    This file is freely distributed under community licensing guidelines. Download and integrate into your codebase instantly.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => {
                      const currentFileName = selectedPurchaseItem.variants
                        ? (activeVariant === "web" ? selectedPurchaseItem.variants.web.codeFileName : selectedPurchaseItem.variants.expo.codeFileName)
                        : selectedPurchaseItem.codeFileName;

                      // Check for missing Phone Auth Expo package (both ZIP from ProjectPage and JS from HomePage)
                      if (currentFileName === "firebase-phone-auth-expo.zip" || currentFileName === "firebase-phone-otp-expo.js") {
                        addToast("Phone Auth (React Native Expo) package is currently unavailable. Please try again later.", "alert");
                        setSelectedPurchaseItem(null);
                        return;
                      }

                      // Check for files to bypass text blob and download the compiled zip (supporting both ProjectPage ZIPs and HomePage JS scripts)
                      let zipPath = "";
                      let downloadName = currentFileName;
                      
                      if (currentFileName === "firebase-google-auth-expo.zip" || currentFileName === "firebase-google-auth-expo.js") {
                        zipPath = "/assets/downloads/Google_Auth_(React_Nativ_Application).zip";
                        downloadName = "Google_Auth_(React_Native_Application).zip";
                      } else if (currentFileName === "firebase-google-auth-web.zip" || currentFileName === "firebase-google-auth.js") {
                        zipPath = "/assets/downloads/Google_Auth_(Web.SDK).zip";
                        downloadName = "Google_Auth_(Web_SDK).zip";
                      } else if (currentFileName === "firebase-phone-auth-web.zip" || currentFileName === "firebase-phone-otp-auth.js") {
                        zipPath = "/assets/downloads/Phone_Auth.OTP(Web_SDK).zip";
                        downloadName = "Phone_Auth_OTP_Web_SDK.zip";
                      }

                      if (zipPath) {
                        const element = document.createElement("a");
                        element.href = zipPath;
                        element.setAttribute("download", downloadName);
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);

                        addToast(`Successfully downloaded ready-to-use blueprint package: "${downloadName}"!`, "success");
                        setSelectedPurchaseItem(null);
                        return;
                      }

                      // Block download for any placeholder text files (fake/mock packages) and show a toast notification
                      addToast(`This blueprint code package is currently unavailable. Please try again later.`, "alert");
                      setSelectedPurchaseItem(null);
                    }}
                    className="w-full relative overflow-hidden py-3 bg-blue-600 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Blueprint Code</span>
                  </button>

                  <div className="flex justify-center items-center gap-1 text-[8.5px] font-mono text-neutral-400 uppercase tracking-wide select-none">
                    <Shield className="w-3 h-3 text-emerald-500 font-bold" />
                    <span>File security: encrypted & ready for local import</span>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disconnect Google Session Confirmation */}
      <DisconnectConfirmationModal
        isOpen={isDisconnectConfirmOpen}
        onClose={() => setIsDisconnectConfirmOpen(false)}
        onConfirm={executeLogoutGoogle}
        title="Disconnect Session?"
        description="Are you sure you want to disconnect this developer simulation session? Any unsaved live data will be flushed from memory and you will need to sync again."
      />

      {/* Global Floating Toast Notification System */}
      <ToastNotification toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

    </div>
  );
}
