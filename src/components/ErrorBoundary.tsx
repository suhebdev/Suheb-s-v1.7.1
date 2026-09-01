import React, { Component, ErrorInfo, ReactNode } from "react";
import { Terminal, ShieldAlert, RotateCcw, Copy, ExternalLink, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied?: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console or telemetry context
    console.error("React Error Boundary intercepted crash:", error, errorInfo);
    this.setState({ errorInfo });
    
    if (typeof window !== "undefined") {
      const signalReady = (window as any).__signalAppReady || (window as any).__loaderDone;
      if (typeof signalReady === "function") {
        signalReady();
      }
      document.dispatchEvent(new CustomEvent("APP_READY"));

      if (window.showToast) {
        window.showToast(`Critical Error caught by React Engine: ${error.message}`, "error");
      }
    }
  }

  private handleReset = () => {
    // Flush local storage of any corrupt state and force reset
    try {
      localStorage.removeItem("suheb_google_user");
    } catch (e) {}
    
    // Hard refresh or reset state
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  private handleCopyToClipboard = () => {
    if (!this.state.error) return;
    const diagnostics = `Error: ${this.state.error.message}\n` + 
      `Stack: ${this.state.error.stack || "No stack trace available"}\n` +
      `Component Stack: ${this.state.errorInfo?.componentStack || "No component stack"}`;
      
    navigator.clipboard.writeText(diagnostics);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
    
    if (window.showToast) {
      window.showToast("Diagnostics diagnostic logs copied to clipboard!", "success");
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-4 sm:p-6 font-sans select-text">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
          
          <div className="w-full max-w-xl bg-white border border-neutral-200/90 rounded-[14px] p-6 text-left shadow-[0_4px_32px_rgba(0,0,0,0.03)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            
            {/* Header Shield */}
            <div className="flex justify-between items-center mb-5 border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                    RECONCILER EMERGENCY SHIELD
                  </span>
                  <h3 className="text-sm font-black text-black tracking-tight uppercase mt-1 leading-none">
                    React Boundary Recovery Panel
                  </h3>
                </div>
              </div>
              <span className="text-[8px] font-mono font-bold text-neutral-400 uppercase tracking-wider hidden sm:inline">
                [SYS // FAULT_SEC_01]
              </span>
            </div>

            {/* Error Log Console */}
            <div className="space-y-4">
              <div className="bg-neutral-900 text-neutral-100 p-4 rounded-xl border border-neutral-800 font-mono text-[10.5px] leading-relaxed relative shadow-inner overflow-hidden">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                  <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    EXCEPTION RECORDED:
                  </span>
                  <span className="text-neutral-500 text-[9px]">VibeCoder Run Core</span>
                </div>
                
                <div className="max-h-[140px] overflow-y-auto font-mono scrollbar-thin text-xs text-red-400 font-semibold space-y-1">
                  <p>&gt; Error: {this.state.error?.message || "Unknown unexpected application state crash."}</p>
                  {this.state.error?.stack && (
                    <p className="text-[9.5px] text-neutral-400 mt-2 whitespace-pre-wrap leading-tight max-h-[100px] overflow-y-auto">
                      {this.state.error.stack.split("\n").slice(0, 3).join("\n")}
                    </p>
                  )}
                </div>
              </div>

              {/* Informative Guidance */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60 leading-relaxed font-mono text-[10px] sm:text-[11px] text-neutral-600 space-y-1">
                <p className="font-bold text-neutral-800">// DIAGNOSTICS & SAFE RECOVERY:</p>
                <p>The app engine trapped a runtime UI thread failure. To preserve consistency and prevent data corruption, active rendering of the crashing template has been isolated.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1 font-mono">
                <button
                  onClick={this.handleReset}
                  className="flex-grow py-2.5 px-4 bg-neutral-900 text-white text-[11px] font-bold rounded-lg hover:bg-neutral-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
                  <span>Clear State & Hot Reload</span>
                </button>
                 <button
                  onClick={this.handleCopyToClipboard}
                  className={`py-2.5 px-3.5 border text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    this.state.copied
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : "bg-white border-neutral-200 text-neutral-700 hover:text-black hover:border-black"
                  }`}
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Logs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
