import React, { useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle } from "react";
import { motion, useAnimation, AnimatePresence } from "motion/react";
import { Terminal, X, Blocks, Laptop, Server, Cpu, Database, Binary, Key, Send, CheckCircle, Shield, Sparkles, Building, Play, AlertTriangle, LogOut, Mail, Copy, Check, ArrowLeft } from "lucide-react";
import type { HTMLAttributes } from "react";
import { 
  getFirebaseFirestore, 
  isFirebaseConfigured, 
  handleFirestoreError, 
  OperationType,
  getFirebaseAuth
} from "../lib/firebase";
import { collection, addDoc } from "firebase/firestore";

// ============================================
// ANIMATED PRICE COMPONENT
// ============================================
interface AnimatedPriceProps {
  value: string; // e.g., "₹99", "₹99/- Only"
  className?: string;
}

export function AnimatedPrice({ value, className = "" }: AnimatedPriceProps) {
  const [count, setCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  
  const matches = value.match(/^([^0-9]*)([0-9]+)(.*)$/);
  const prefix = matches ? matches[1] : "";
  const targetNum = matches ? parseInt(matches[2], 10) : 99;
  const suffix = matches ? matches[3] : "";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);
          setCount(0);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const delayTimeout = setTimeout(() => {
      const duration = 1200;
      const frames = 60;
      const stepTime = duration / frames;
      let frame = 0;

      const increment = () => {
        frame++;
        const progress = frame / frames;
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentCount = Math.floor(easeOutCubic * targetNum);
        
        setCount(currentCount);

        if (frame < frames) {
          requestAnimationFrame(increment);
        } else {
          setCount(targetNum);
        }
      };

      requestAnimationFrame(increment);
    }, 1000);

    return () => {
      clearTimeout(delayTimeout);
    };
  }, [isInView, targetNum]);

  return (
    <span ref={elementRef} className={`inline-block select-none ${className}`}>
      {prefix}
      <span className="tabular-nums font-black transition-all">
        {count}
      </span>
      {suffix}
    </span>
  );
}


// ============================================
// INTERACTIVE CIRCUIT BACKDROP
// ============================================
export function InteractiveCircuit() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" id="circuit-bg">
      <div className="absolute inset-0 tech-grid opacity-30" />
      <div className="absolute inset-0 tech-grid-dots opacity-40" />

      <div className="absolute inset-0 bg-gradient-to-t from-[#fcfcfc] via-transparent to-[#fcfcfc] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#fcfcfc] via-transparent to-[#fcfcfc] opacity-80" />

      <div className="absolute left-10 top-1/4 w-96 h-96 border border-black/[0.03] rounded-full flex items-center justify-center animate-spin-circuit-cw">
        <div className="w-80 h-80 border border-dashed border-black/[0.04] rounded-full" />
        <div className="absolute top-0 left-1/2 -ml-1 w-2 h-2 rounded-full bg-blue-500/40" />
      </div>

      <div className="absolute right-10 bottom-1/4 w-[500px] h-[500px] border border-black/[0.02] rounded-full flex items-center justify-center animate-spin-circuit-ccw">
        <div className="w-[420px] h-[420px] border border-dashed border-black/[0.03] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-2 h-2 rounded-full bg-emerald-500/30" />
      </div>

      <svg className="absolute inset-0 w-full h-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="glow-grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="glow-grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <path
          d="M 50,50 L 250,50 L 350,150 L 350,300 M 350,200 L 450,200"
          fill="none"
          stroke="#000000"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 50,50 L 250,50 L 350,150 L 350,300 M 350,200 L 450,200"
          fill="none"
          stroke="url(#glow-grad-blue)"
          strokeWidth="2.5"
          strokeDasharray="80 120"
          className="circuit-path-flow-1"
        />

        <path
          d="M 100,800 L 250,800 L 400,650 L 600,650"
          fill="none"
          stroke="#000000"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <path
          d="M 100,800 L 250,800 L 400,650 L 600,650"
          fill="none"
          stroke="url(#glow-grad-green)"
          strokeWidth="2.5"
          strokeDasharray="60 140"
          className="circuit-path-flow-2"
        />

        <path
          d="M 1800,100 L 1600,100 L 1500,200 L 1500,450"
          fill="none"
          stroke="#000000"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <path
          d="M 1800,100 L 1600,100 L 1500,200 L 1500,450"
          fill="none"
          stroke="url(#glow-grad-blue)"
          strokeWidth="2"
          strokeDasharray="100 150"
          className="circuit-path-flow-3"
        />

        <circle cx="250" cy="50" r="3" fill="#000" />
        <circle cx="350" cy="150" r="3" fill="#000" />
        <circle cx="450" cy="200" r="4" fill="#3b82f6" />
        <circle cx="400" cy="650" r="3" fill="#000" />
        <circle cx="600" cy="650" r="4" fill="#10b981" />
        <circle cx="1500" cy="200" r="3" fill="#000" />
      </svg>
    </div>
  );
}


// ============================================
// STYLIZED GITLAB ICON
// ============================================
export interface GitlabIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface GitlabIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const DURATION = 0.7;
const CALCULATE_DELAY = (i: number) => {
  if (i === 0) return 0.1;
  return i * DURATION + 0.1;
};

export const GitlabIcon = forwardRef<GitlabIconHandle, GitlabIconProps>(
  ({ onMouseEnter, onMouseLeave, className = "", size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const elementRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    useEffect(() => {
      if (isControlledRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            controls.start("animate");
          } else {
            controls.start("normal");
          }
        },
        { threshold: 0.1 }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, [controls]);

    return (
      <div
        ref={elementRef}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.1 3.26a.42.42 0 0 0-.1-.18.38.38 0 0 0-.26-.08.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z"
            transition={{
              duration: DURATION,
              delay: CALCULATE_DELAY(0),
              opacity: { delay: CALCULATE_DELAY(0) },
            }}
            variants={{
              normal: { pathLength: 1, opacity: 1, transition: { delay: 0 } },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

GitlabIcon.displayName = "GitlabIcon";

// ============================================
// ANIMATED SETTINGS GEAR ICON
// ============================================
interface SettingsIconAnimatedProps {
  size?: number;
  primaryColor?: string;
  accentColor?: string;
  className?: string;
}

export function SettingsIconAnimated({
  size = 28,
  primaryColor = "currentColor",
  accentColor = "#3b82f6",
  className = "",
}: SettingsIconAnimatedProps) {
  const controls = useAnimation();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          controls.start("visible");
        } else {
          controls.start("hidden");
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [controls]);

  const handleMouseEnter = () => {
    controls.set("hidden");
    controls.start("visible");
  };

  return (
    <div 
      ref={elementRef} 
      className="inline-flex justify-center items-center cursor-pointer"
      onMouseEnter={handleMouseEnter}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 1024 1024"
        className={className}
        initial="hidden"
        animate={controls}
        transition={{ type: "spring", stiffness: 220, damping: 15 }}
      >
        {/* Outer arms group — scales out from center */}
        <motion.g
          variants={{
            hidden: { scale: 0.3, opacity: 0 },
            visible: {
              scale: 1,
              opacity: 1,
              transition: {
                delay: 0.15,
                scale: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] },
                opacity: { duration: 0.3, ease: "linear" },
              },
            },
          }}
          style={{ transformOrigin: "512px 512px" }}
        >
          {/* Outer tick marks */}
          <path
            d="M608 156.8c4.8 1.6 6.4 4.8 6.4 9.6l-28.8 108.8 c-1.6 4.8-4.8 6.4-9.6 6.4-4.8-1.6-6.4-4.8-6.4-9.6 l28.8-108.8c0-4.8 4.8-8 9.6-6.4z M867.2 416c1.6 4.8-1.6 8-6.4 9.6L752 454.4 c-4.8 1.6-8-1.6-9.6-6.4-1.6-4.8 1.6-8 6.4-9.6 l108.8-28.8c4.8 0 8 3.2 9.6 6.4z m-94.4 356.8c-3.2 3.2-8 3.2-11.2 0l-78.4-78.4 c-3.2-3.2-3.2-8 0-11.2 3.2-3.2 8-3.2 11.2 0 l78.4 78.4c3.2 3.2 3.2 8 0 11.2z M416 867.2c-4.8-1.6-6.4-4.8-6.4-9.6l28.8-108.8 c1.6-4.8 4.8-6.4 9.6-6.4 4.8 1.6 6.4 4.8 6.4 9.6 l-28.8 108.8c0 4.8-4.8 8-9.6 6.4z M156.8 608c-1.6-4.8 1.6-8 6.4-9.6l108.8-28.8 c4.8-1.6 8 1.6 9.6 6.4 1.6 4.8-1.6 8-6.4 9.6 l-108.8 28.8c-4.8 0-8-3.2-9.6-6.4z m94.4-356.8c3.2-3.2 8-3.2 11.2 0l78.4 78.4 c3.2 3.2 3.2 8 0 11.2s-8 3.2-11.2 0 l-78.4-78.4c-3.2-3.2-3.2-8 0-11.2z"
            fill={primaryColor}
          />

          {/* Hexagonal gear ring */}
          <path
            d="M355.2 355.2l-57.6 214.4 156.8 156.8 214.4-57.6 57.6-214.4-156.8-156.8-214.4 57.6z m230.4-86.4l169.6 169.6c4.8 4.8 6.4 9.6 4.8 16 l-62.4 232c-1.6 4.8-6.4 9.6-11.2 11.2l-232 62.4 c-4.8 1.6-11.2 0-16-4.8L268.8 585.6 c-4.8-4.8-6.4-9.6-4.8-16l62.4-232 c1.6-4.8 6.4-9.6 11.2-11.2l232-62.4 c6.4 0 11.2 1.6 16 4.8z"
            fill={primaryColor}
          />

          {/* Six gear notch dots */}
          <path
            d="M561.6 326.4c-25.6-6.4-41.6-33.6-33.6-59.2 s33.6-41.6 59.2-33.6c25.6 6.4 41.6 33.6 33.6 59.2 -6.4 25.6-33.6 40-59.2 33.6z m136 136c-6.4-25.6 8-51.2 33.6-59.2 25.6-6.4 51.2 8 59.2 33.6 6.4 25.6-8 51.2-33.6 59.2 -25.6 6.4-52.8-8-59.2-33.6z m-49.6 185.6c19.2-19.2 49.6-19.2 67.2 0 19.2 19.2 19.2 49.6 0 67.2-19.2 19.2-49.6 19.2-67.2 0 -19.2-17.6-19.2-48 0-67.2z m-185.6 49.6c25.6 6.4 41.6 33.6 33.6 59.2 -6.4 25.6-33.6 41.6-59.2 33.6 -25.6-6.4-41.6-33.6-33.6-59.2 6.4-25.6 33.6-40 59.2-33.6z m-136-136c6.4 25.6-8 51.2-33.6 59.2 -25.6 6.4-51.2-8-59.2-33.6-6.4-25.6 8-51.2 33.6-59.2 25.6-6.4 52.8 8 59.2 33.6z m49.6-185.6c-19.2 19.2-49.6 19.2-67.2 0 -19.2-19.2-19.2-49.6 0-67.2 19.2-19.2 49.6-19.2 67.2 0 s19.2 48 0 67.2z"
            fill={accentColor}
          />

          {/* Outer orbit dots */}
          <path
            d="M598.4 187.2c-17.6-4.8-27.2-22.4-22.4-38.4 4.8-17.6 22.4-27.2 38.4-22.4 17.6 4.8 27.2 22.4 22.4 38.4 s-20.8 27.2-38.4 22.4z m238.4 238.4c-4.8-17.6 4.8-35.2 22.4-38.4 17.6-4.8 35.2 4.8 38.4 22.4 4.8 17.6-4.8 35.2-22.4 38.4 -16 4.8-33.6-6.4-38.4-22.4z m-88 323.2c12.8-12.8 32-12.8 44.8 0s12.8 32 0 44.8 c-12.8 12.8-32 12.8-44.8 0s-11.2-32 0-44.8z m-323.2 88c17.6 4.8 27.2 22.4 22.4 38.4 -4.8 17.6-22.4 27.2-38.4 22.4 -17.6-4.8-27.2-22.4-22.4-38.4 3.2-17.6 20.8-27.2 38.4-22.4z M187.2 598.4c4.8 17.6-4.8 35.2-22.4 38.4 -17.6 4.8-35.2-4.8-38.4-22.4-4.8-17.6 4.8-35.2 22.4-38.4 16-4.8 33.6 6.4 38.4 22.4z m88-323.2c-12.8 12.8-32 12.8-44.8 0-12.8-12.8-12.8-32 0-44.8 12.8-12.8 32-12.8 44.8 0 11.2 11.2 11.2 32 0 44.8z"
            fill={accentColor}
          />
        </motion.g>

        {/* Center circle — leads the animation */}
        <motion.circle
          cx={512}
          cy={512}
          r={112}
          fill={accentColor}
          variants={{
            hidden: { scale: 0.01, opacity: 0 },
            visible: {
              scale: 1,
              opacity: 1,
              transition: {
                duration: 0.25,
                ease: [0.25, 0.1, 0.25, 1],
              },
            },
          }}
          style={{ transformOrigin: "512px 512px" }}
        />
      </motion.svg>
    </div>
  );
}

// ============================================
// TECH STACK DIAGNOSTIC DIALOGUE
// ============================================
interface TechStackDialogueProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TechStackDialogue({ isOpen, onClose }: TechStackDialogueProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = [
    {
      title: "Frontend Engineering",
      icon: <Laptop className="w-4 h-4 text-blue-500" />,
      skills: [
        { name: "React 19 & Context API", level: 95 },
        { name: "Tailwind CSS & Styling", level: 98 },
        { name: "Framer Motion Details", level: 90 },
        { name: "Responsive Mobile / Android Views", level: 92 },
      ]
    },
    {
      title: "Firebase & Backend Integrations",
      icon: <Server className="w-4 h-4 text-emerald-500" />,
      skills: [
        { name: "Firebase (Firestore & Auth)", level: 94 },
        { name: "Node.js / Express APIs", level: 80 },
        { name: "Android Application Flow", level: 75 },
        { name: "JSON Web Storage Adapters", level: 88 },
      ]
    },
    {
      title: "AI & Prompt Engineering Stack",
      icon: <Cpu className="w-4 h-4 text-purple-500" />,
      skills: [
        { name: "Coding Workflows Prompts", level: 96 },
        { name: "Gemini API Integrations", level: 90 },
        { name: "Prompt Engineering Optimization", level: 92 },
        { name: "Swift Blueprint Prototyping", level: 85 },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
      />

      {/* Main dialog box */}
      <motion.div
        initial={false}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.15, ease: "easeIn" }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden z-10"
      >
        {/* Abstract pattern edge */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Blocks className="w-5 h-5 text-neutral-800" />
              <div>
                <h3 className="font-bold text-sm text-black uppercase tracking-tight">Core Tech Systems</h3>
                <p className="text-[10px] font-mono text-neutral-400">VIBE_CODER // ACTIVE_COMPILER</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close stack dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
            Highly functional stack optimized strictly for high-fidelity client views and robust operational data flows that small businesses rely on.
          </p>

          {/* Categories Grid */}
          <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 font-mono">
                  {cat.icon}
                  <span>{cat.title}</span>
                </div>
                
                <div className="space-y-3 pl-5">
                  {cat.skills.map((skill, sIdx) => (
                    <div key={sIdx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-neutral-600">
                        <span>{skill.name}</span>
                        <span className="font-bold text-black">{skill.level}%</span>
                      </div>
                      
                      {/* Interactive Progress Tracking */}
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/50">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.level}%` }}
                          transition={{ duration: 1, delay: 0.1 * sIdx, ease: "easeOut" }}
                          className="h-full bg-blue-600 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Dialog Action Buttons */}
          <div className="border-t border-neutral-100 pt-4 mt-6 flex items-center justify-between text-[9px] font-mono text-neutral-400">
            <div className="flex items-center gap-1">
              <Binary className="w-3 h-3 text-emerald-500" />
              <span>STABLE COMPILED SYSTEM LIBRARIES</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 text-white hover:bg-black rounded-lg hover:shadow-md transition-all font-bold cursor-pointer"
            >
              Close Diagnostics
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// CONTACT / BOTTLENECK MODAL
// ============================================
interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (data: { businessName: string; challenge: string }) => void;
  // FIXED: AUTH-TIMING
  googleUser?: any;
}

export function ContactModal({ isOpen, onClose, onSubmitSuccess, googleUser }: ContactModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const [businessName, setBusinessName] = useState("");
  const [botlneck, setBotlneck] = useState("web-performance");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      window.showToast?.("Attention: Business name parameter is required!", "alert");
      window.showToast?.("Please input your official business or company name reference.", "instruction");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      window.showToast?.("Validation Failed: Please check & enter a valid email address!", "error");
      window.showToast?.("Make sure your email address includes '@' and a valid domain.", "instruction");
      return;
    }

    setIsSubmitting(true);
    window.showToast?.(`Compiling challenge parameters from ${businessName}...`, "instruction");
    
    console.log("ContactModal handleSubmit initiated:", {
      businessName,
      email,
      botlneck,
      isFirebaseConfigured: isFirebaseConfigured(),
      authCurrentUser: getFirebaseAuth().currentUser,
      googleUserProp: googleUser
    });

    try {
      if (isFirebaseConfigured()) {
        const db = getFirebaseFirestore();
        const auth = getFirebaseAuth();
        const userUid = auth.currentUser?.uid || googleUser?.uid;
        const userEmail = auth.currentUser?.email || googleUser?.email || "";
        
        console.log("ContactModal user resolved:", { userUid, userEmail });

        // UPDATED: FIRESTORE-STRUCTURE
        if (userUid) {
          const path = `users/${userUid}/proposals`;
          console.log("Writing to logged-in user path:", path);
          try {
            const docRef = await addDoc(collection(db, path), {
              businessName: businessName.trim(),
              bottleneckType: botlneck,
              email: email.trim(),
              details: details.trim(),
              timestamp: new Date().toISOString(),
              uid: userUid,
              userEmail: userEmail
            });
            console.log("Successfully wrote proposal inside try-catch. Doc ID:", docRef.id);
          } catch (err) {
            console.error("Error writing proposal inside try-catch:", err);
            handleFirestoreError(err, OperationType.WRITE, path);
          }
        } else {
          const path = "guest_proposals";
          console.log("Writing to guest root collection:", path);
          try {
            const docRef = await addDoc(collection(db, path), {
              businessName: businessName.trim(),
              bottleneckType: botlneck,
              email: email.trim(),
              details: details.trim(),
              timestamp: new Date().toISOString()
            });
            console.log("Successfully wrote guest proposal. Doc ID:", docRef.id);
          } catch (err) {
            console.error("Error writing guest proposal inside try-catch:", err);
            handleFirestoreError(err, OperationType.WRITE, path);
          }
        }
      } else {
        console.log("Firebase is NOT configured, skipping DB write.");
      }

      // Proceed to the artificial delays & success transition
      setTimeout(() => {
        setIsSubmitting(false);
        setIsDone(true);
        window.showToast?.("Success! Operations challenge successfully registered.", "success");
        
        setTimeout(() => {
          onSubmitSuccess({ businessName, challenge: botlneck });
          setBusinessName("");
          setEmail("");
          setDetails("");
          setIsDone(false);
          onClose();
        }, 2000);
      }, 1500);

    } catch (error) {
      console.error("Firebase Error saving bottleneck proposal:", error);
      setIsSubmitting(false);
      window.showToast?.("Submission Failed: Google Cloud Firestore security permission error or connection timeout.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Dark backdrop overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={false}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.15, ease: "easeIn" }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden z-10"
      >
        <div className="absolute top-0 right-0 left-0 h-1 bg-blue-600" />
        
        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <AnimatePresence mode="wait">
            {!isDone ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Logo or visual header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-black uppercase tracking-tight">Solve Project Bottlenecks</h3>
                    <p className="text-[9px] font-mono text-neutral-400">OPTIMIZING WEB & MOBILE NATIVE PLATFORMS</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
                  Facing slow load times, complex API integrations, or app store issues? Describe your Web Dev or Mobile App bottleneck, and let's structure a custom fix.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Business Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-neutral-500 font-bold uppercase">
                      Business or Project Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Hardware Co. or LostGames Core"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-neutral-50 font-mono text-black"
                    />
                  </div>

                  {/* Operational Bottleneck Type Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-neutral-500 font-bold uppercase">
                      Primary Project / Dev Headache
                    </label>
                    <select
                      value={botlneck}
                      onChange={(e) => setBotlneck(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-neutral-50 font-mono text-black"
                    >
                      <option value="web-performance">Slow website loads, SEO, and optimization issues (Web Dev)</option>
                      <option value="complex-integrations">Integrating custom backend APIs, databases, or payment loops (Web/App Dev)</option>
                      <option value="store-deployment">App Store / Play Store binary packaging & deployment obstacles (App Dev)</option>
                      <option value="notifications-sync">Adding real-time sync, local state, or push notifications (App Dev)</option>
                      <option value="custom-ui-ux">Drafting pixel-perfect designs & highly interactive UI controls (Web/App Dev)</option>
                      <option value="other-issues">Other critical optimization or development challenge</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-neutral-500 font-bold uppercase">
                      E-Mail Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-neutral-50 font-mono text-black"
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-neutral-500 font-bold uppercase">
                      Describe the task or project details
                    </label>
                    <textarea
                      rows={3}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Describe what manual process gets on your nerves everyday..."
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-neutral-50 font-mono text-black resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg focus:outline-none active:translate-y-0.5 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Compiling request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Transmit Proposal</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-200 mb-4 animate-bounce">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-black uppercase tracking-tight mb-1">Inquiry Registered</h4>
                <p className="text-[10px] font-mono text-neutral-500 max-w-[280px]">
                  Vibe Coder system received your challenge definition! A customized Node prototype workflow is scheduled for compile. Keep an eye on your inbox.
                </p>
                <div className="text-[9px] font-mono text-blue-600 mt-6 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>TRANSMISSION SECURED VIA TLS v1.3</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================
// HIRE ME / START A PROJECT MODAL
// ============================================
interface HireMeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_WHATSAPP_MESSAGE = `Hi Suheb,

I visited your portfolio and I'm interested in discussing a project or collaboration opportunity.

Project / Requirement:
Timeline:
Budget (optional):

Please let me know when you're available.`;

const DEFAULT_EMAIL_MESSAGE = `Hello Suheb,

I reviewed your portfolio and would like to discuss a project collaboration opportunity.

Company / Name:
Project Type:
Expected Timeline:
Budget (optional):

Additional Details:

Looking forward to hearing from you.`;

export function HireMeModal({ isOpen, onClose }: HireMeModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMethod, setSelectedMethod] = useState<"whatsapp" | "email" | null>(null);
  const [message, setMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);
  const [copied, setCopied] = useState(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedMethod(null);
      setMessage(DEFAULT_WHATSAPP_MESSAGE);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setSelectedMethod(null);
    onClose();
  };

  const handleSelectMethod = (method: "whatsapp" | "email") => {
    setSelectedMethod(method);
    if (method === "whatsapp") {
      setMessage(DEFAULT_WHATSAPP_MESSAGE);
    } else {
      setMessage(DEFAULT_EMAIL_MESSAGE);
    }
  };

  const handleContinue = () => {
    if (!selectedMethod) return;
    setStep(2);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    window.showToast?.("Message copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      window.showToast?.("Please write a message before sending.", "alert");
      return;
    }

    if (selectedMethod === "whatsapp") {
      const whatsappUrl = `https://wa.me/918668938029?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
      window.showToast?.("Opening WhatsApp...", "success");
      handleClose();
    } else {
      const subject = "Project Collaboration Inquiry";
      const mailtoUrl = `mailto:suhebdev201@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoUrl;
      window.showToast?.("Opening Email client...", "success");
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      {/* Dark backdrop overlay */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={false}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ duration: 0.15, ease: "easeIn" }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden z-10 p-6 text-left"
      >
        <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${
          selectedMethod === "whatsapp" 
            ? "from-emerald-500 to-emerald-600" 
            : selectedMethod === "email" 
            ? "from-blue-500 to-blue-600" 
            : "from-emerald-500 to-blue-600"
        }`} />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STEP 1: CONTACT METHOD SELECTION */}
        {step === 1 && (
          <div className="flex flex-col justify-between min-h-[420px] sm:min-h-[440px]">
            <div>
              {/* Header */}
              <div className="flex items-center gap-3 mb-2.5">
                <div className="flex items-center justify-center shrink-0">
                  <SettingsIconAnimated
                    size={28}
                    primaryColor="#000000"
                    accentColor={selectedMethod === "whatsapp" ? "#10b981" : "#2563eb"}
                  />
                </div>
                <div>
                  <h3 className="font-black text-base text-neutral-900 uppercase font-sans tracking-tight">
                    HIRE ME / START A PROJECT
                  </h3>
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider block px-1.5 py-0.5 rounded border w-max mt-0.5 transition-colors ${
                      selectedMethod === "whatsapp"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-blue-700 bg-blue-50 border-blue-200"
                    }`}
                  >
                    AVAILABLE FOR FREELANCE & CONTRACTS
                  </span>
                </div>
              </div>

              <p className="text-xs text-neutral-500 mb-6 leading-relaxed font-sans">
                Select a preferred channel to get in touch with Suheb for freelance work, custom builds, or contract opportunities.
              </p>

              {/* Selectable Cards */}
              <div className="space-y-4 mb-6">
                {/* WhatsApp Card */}
                <div
                  onClick={() => handleSelectMethod("whatsapp")}
                  className={`p-4.5 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                    selectedMethod === "whatsapp"
                      ? "border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-500/5"
                      : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:bg-neutral-50/60"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedMethod === "whatsapp"
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {selectedMethod === "whatsapp" && <CheckCircle className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-black text-sm text-neutral-900 font-sans">
                      <svg className="w-4 h-4 text-emerald-600 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      <span>WhatsApp</span>
                    </div>
                    <p className="text-xs text-neutral-600 font-sans mt-1 leading-normal">
                      Quick discussion, freelance inquiry, or project collaboration.
                    </p>
                    <p className="text-[10.5px] font-mono text-neutral-400 mt-2.5 leading-relaxed">
                      // Best for: Quick chats, freelance work & fast collabs
                    </p>
                  </div>
                </div>

                {/* Professional Email Card */}
                <div
                  onClick={() => handleSelectMethod("email")}
                  className={`p-4.5 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                    selectedMethod === "email"
                      ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5"
                      : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:bg-neutral-50/60"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        selectedMethod === "email"
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {selectedMethod === "email" && <CheckCircle className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-black text-sm text-neutral-900 font-sans">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Professional Email</span>
                    </div>
                    <p className="text-xs text-neutral-600 font-sans mt-1 leading-normal">
                      Send a structured business or recruitment inquiry.
                    </p>
                    <p className="text-[10.5px] font-mono text-neutral-400 mt-2.5 leading-relaxed">
                      // Best for: Recruiters, agencies & formal proposals
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-neutral-100 mt-auto">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-neutral-700 bg-neutral-100/90 hover:bg-neutral-200/70 border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!selectedMethod}
                className={`w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl font-mono text-xs font-bold text-white transition-all cursor-pointer shadow-sm flex items-center gap-2 ${
                  selectedMethod
                    ? selectedMethod === "whatsapp"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15 active:scale-95"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/15 active:scale-95"
                    : "bg-neutral-300 cursor-not-allowed opacity-60"
                }`}
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INQUIRY SCREEN */}
        {step === 2 && (
          <div className="flex flex-col justify-between min-h-[420px] sm:min-h-[440px]">
            <div className="flex-1 flex flex-col min-h-0 mb-3">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-1 shrink-0">
                <div className="flex items-center justify-center shrink-0">
                  <SettingsIconAnimated
                    size={26}
                    primaryColor="#000000"
                    accentColor={selectedMethod === "whatsapp" ? "#10b981" : "#2563eb"}
                  />
                </div>
                <h3 className="font-black text-base text-neutral-900 font-sans tracking-tight">
                  {selectedMethod === "whatsapp" ? "WhatsApp Inquiry" : "Email Inquiry"}
                </h3>
              </div>

              <p className="text-xs text-neutral-500 mb-3 font-sans shrink-0">
                {selectedMethod === "whatsapp"
                  ? "You can edit the message before opening WhatsApp."
                  : "You can edit the message before sending email."}
              </p>

              {/* Email Preview header (if Email selected) */}
              {selectedMethod === "email" && (
                <div className="mb-3 p-3 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl text-xs font-mono space-y-1 select-none shrink-0">
                  <div className="flex items-center gap-2 text-neutral-700">
                    <span className="font-bold text-neutral-400">To:</span>
                    <span className="font-bold text-blue-600">suhebdev201@gmail.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-700">
                    <span className="font-bold text-neutral-400">Subject:</span>
                    <span className="text-neutral-800 font-semibold">Project Collaboration Inquiry</span>
                  </div>
                </div>
              )}

              {/* Message Area with Copy Button */}
              <div className="relative flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-1.5 shrink-0">
                  <label className="block text-[10px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                    // Message Content
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                    <span className={`text-[10px] font-mono font-bold ${message.length >= 1000 ? "text-red-500" : "text-neutral-400"}`}>
                      {message.length} / 1000
                    </span>
                  </div>
                </div>

                <textarea
                  maxLength={1000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your inquiry message here..."
                  className={`w-full flex-1 min-h-[120px] p-3.5 bg-neutral-50/80 border border-neutral-200 rounded-2xl text-xs text-neutral-800 font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 transition-all ${
                    selectedMethod === "whatsapp"
                      ? "focus:ring-emerald-500/20 focus:border-emerald-500"
                      : "focus:ring-blue-500/20 focus:border-blue-500"
                  }`}
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-neutral-100 shrink-0 mt-auto">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-neutral-700 bg-neutral-100/90 hover:bg-neutral-200/70 border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Channel</span>
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                className={`w-full sm:w-auto justify-center px-6 py-2.5 rounded-xl font-mono text-xs font-bold text-white transition-all cursor-pointer shadow-md flex items-center gap-2 active:scale-95 ${
                  selectedMethod === "whatsapp"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/15"
                }`}
              >
                {selectedMethod === "whatsapp" ? (
                  <>
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>Send via WhatsApp</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>Send via Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================
// DISCONNECT SESSION CONFIRMATION MODAL
// ============================================
interface DisconnectConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export function DisconnectConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Terminate Active Session?",
  description = "Are you sure you want to disconnect this developer simulation session? Any unsaved live data will be flushed from memory and you will need to sync again.",
}: DisconnectConfirmationModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <motion.div
            initial={false}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: "easeIn" }}
            className="bg-white rounded-2xl max-w-sm w-full border border-neutral-200 p-6 shadow-2xl space-y-4 text-left relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-500">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="leading-tight">
                <h3 className="text-sm font-black uppercase tracking-wide text-neutral-800">
                  {title}
                </h3>
                <span className="text-[9px] text-neutral-400 font-mono tracking-wider block">
                  SECURE DEAUTH SIGNAL
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {description}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 text-xs font-mono font-bold cursor-pointer transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition active:scale-95 shadow-md flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
