import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, AlertTriangle, Terminal, X } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "instruction" | "alert";
  message: string;
}

interface ToastNotificationProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export default function ToastNotification({ toasts, onClose }: ToastNotificationProps) {
  return (
    <div id="toast-notification-system" className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[1000000] pointer-events-none flex flex-col gap-3 max-w-[90vw] sm:max-w-md w-full">
      <AnimatePresence>
        {toasts.map((toast) => {
          let config = {
            title: "NOTIFICATION",
            borderClass: "border-neutral-800",
            glowClass: "shadow-black/40",
            icon: <Terminal className="w-4 h-4 text-neutral-400" />,
            accentColor: "bg-blue-500",
            accentTextColor: "text-blue-400",
          };

            if (toast.type === "success") {
            config = {
              title: "Success",
              borderClass: "border-emerald-500/20 hover:border-emerald-500/40",
              glowClass: "shadow-emerald-950/10",
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
              accentColor: "bg-emerald-500",
              accentTextColor: "text-emerald-400",
            };
          } else if (toast.type === "error") {
            config = {
              title: "Error",
              borderClass: "border-rose-500/20 hover:border-rose-500/40",
              glowClass: "shadow-rose-950/10",
              icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
              accentColor: "bg-rose-500",
              accentTextColor: "text-rose-400",
            };
          } else if (toast.type === "alert") {
            config = {
              title: "Alert",
              borderClass: "border-amber-500/20 hover:border-amber-500/40",
              glowClass: "shadow-amber-950/10",
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
              accentColor: "bg-amber-500",
              accentTextColor: "text-amber-400",
            };
          } else if (toast.type === "instruction") {
            config = {
              title: "System",
              borderClass: "border-blue-500/20 hover:border-blue-500/40",
              glowClass: "shadow-blue-950/10",
              icon: <Terminal className="w-4 h-4 text-blue-400 shrink-0" />,
              accentColor: "bg-blue-500",
              accentTextColor: "text-blue-400",
            };
          }

          // Clean and sanitize error messages to avoid displaying long JSON traces in toasts
          let displayMessage = toast.message;
          if (toast.type === "error" || toast.type === "alert") {
            const trimmed = displayMessage.trim();
            if (trimmed.startsWith("{") || trimmed.includes('{"error"')) {
              try {
                const startIdx = trimmed.indexOf("{");
                const endIdx = trimmed.lastIndexOf("}");
                if (startIdx !== -1 && endIdx !== -1) {
                  const jsonStr = trimmed.substring(startIdx, endIdx + 1);
                  const parsed = JSON.parse(jsonStr);
                  const val = parsed?.error?.message || parsed?.message || parsed?.error;
                  if (val && typeof val === "string") {
                    displayMessage = val;
                  }
                }
              } catch (e) {}
            }
            // Strip off large trailing details block if present
            const detailsIdx = displayMessage.toLowerCase().indexOf("details:");
            if (detailsIdx !== -1) {
              displayMessage = displayMessage.substring(0, detailsIdx).trim();
            }
            const linkIdx = displayMessage.toLowerCase().indexOf("for more information");
            if (linkIdx !== -1) {
              displayMessage = displayMessage.substring(0, linkIdx).trim();
            }
            if (displayMessage.length > 140) {
              displayMessage = displayMessage.substring(0, 140) + "...";
            }
          }

          return (
            <motion.div
              layout
              key={toast.id}
              initial={{ opacity: 0, x: 150 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 150 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              className={`p-4 bg-neutral-950/95 backdrop-blur-md text-white rounded-2xl shadow-xl ${config.borderClass} ${config.glowClass} border flex items-start gap-3 w-full font-mono text-xs relative overflow-hidden pointer-events-auto select-none`}
            >
              {/* FIXED: Icon alignment to first line */}
              <div className="mt-[2px] self-start">{config.icon}</div>
              {/* FIXED: Removed space-y-1 and title label */}
              <div className="pr-6 flex-grow text-left">
                <p className="text-zinc-200 font-mono text-[11px] leading-relaxed break-words whitespace-pre-line">
                  {displayMessage}
                </p>
              </div>
              
              <button
                onClick={() => onClose(toast.id)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-neutral-900"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-[3px] ${config.accentColor}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
export { ToastNotification };
