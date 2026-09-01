import React from "react";
import { Terminal, Shield, Activity } from "lucide-react";
import { SettingsIconAnimated } from "./Components";

interface FooterProps {
  onPageChange: (page: "home" | "projects" | "tools") => void;
  onHireClick: () => void;
  onRequestCustomBuild?: () => void;
  onStackClick: () => void;
  onOpenStore?: () => void;
}

export default function Footer({ onPageChange, onHireClick, onRequestCustomBuild, onStackClick, onOpenStore }: FooterProps) {
  return (
    <footer id="portfolio-footer" className="bg-white border-t border-neutral-200/70 pt-12 pb-8 w-full select-none z-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top section with Logo, description and Stats column */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-neutral-200/70">
          
          {/* Column 1: Monogram and Intro */}
          <div className="lg:col-span-5 md:col-span-2 space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center">
                <SettingsIconAnimated size={28} primaryColor="#000000" accentColor="#2563eb" />
              </div>
              <div>
                <span className="text-sm font-black text-neutral-900 uppercase tracking-tight block">
                  SUHEB KHAN // VIBECODER
                </span>
                <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block font-bold">
                  SYSTEMS & SAAS ARCHITECTURE
                </span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 font-mono leading-relaxed max-w-sm sm:max-w-xl lg:max-w-sm">
              Designing pristine full-stack interfaces, offline-first architectures, and modern integration portals configured for micro-businesses looking to automate workflows flawlessly.
            </p>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100/60 rounded-full select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                ACTIVE FOR PREBUILT & CUSTOM CONTRACT BUILDS
              </span>
            </div>
          </div>

          {/* Column 2: Navigation Hub */}
          <div className="lg:col-span-3 md:col-span-1 space-y-3 text-left">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
              // PLATFORM INDEX MAP
            </span>
            <ul className="space-y-2 text-xs font-mono font-bold text-neutral-600">
              <li>
                <button 
                  onClick={() => onPageChange("home")}
                  className="hover:text-amber-600 text-neutral-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>&gt;</span>
                  <span>System Hub Dashboard (Home)</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onPageChange("projects")}
                  className="hover:text-amber-600 text-neutral-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>&gt;</span>
                  <span>Interactive Project Matrix</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onPageChange("tools")}
                  className="hover:text-amber-600 text-neutral-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>&gt;</span>
                  <span>WhatsApp Chat Parser (New)</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Active Actions */}
          <div className="lg:col-span-4 md:col-span-1 space-y-3 text-left">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
              // UTILITY ACTIONS GATEWAY
            </span>
            <div className="flex flex-col gap-2">
              <button
                onClick={onRequestCustomBuild || onHireClick}
                className="w-full inline-flex items-center gap-2 justify-between px-3 py-2 bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-900 rounded-xl transition font-mono text-xs font-bold cursor-pointer"
              >
                <span>Request Custom Code Build</span>
                <span>&rarr;</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onStackClick}
                  className="inline-flex items-center justify-center gap-1.5 py-2 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-700 transition font-mono text-[10px] font-bold cursor-pointer"
                >
                  <span>View Core Tech Stack</span>
                </button>
                <button
                  onClick={onOpenStore || (() => onPageChange("projects"))}
                  className="inline-flex items-center justify-center gap-1.5 py-2 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-700 transition font-mono text-[10px] font-bold cursor-pointer"
                >
                  <span>Open Code Store</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Metagrid */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono select-none text-left">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-500 font-semibold">
            <span className="font-bold text-neutral-500">SUHEB_DEV_PROD // WORKSPACE_V1.2_OK</span>
            <span className="hidden sm:inline text-neutral-300">|</span>
            <span className="flex items-center gap-1 text-neutral-400 font-semibold">
              <Shield className="w-3 h-3 text-neutral-400" />
              <span>SECURE_COMPROMISE_SHIELD_ACTIVE</span>
            </span>
          </div>
          
          <div className="flex flex-wrap gap-3 text-[9px] text-neutral-400 justify-center">
            <span className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded-md font-bold">
              <Terminal className="w-2.5 h-2.5 text-zinc-400" />
              <span>ENVIRONMENT: CLIENT_VITE_REACT</span>
            </span>
            <span className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded-md font-bold">
              <Activity className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
              <span>STATE_HANDSHAKE: LIVE_STABLE</span>
            </span>
          </div>
        </div>

        {/* Slogan and signature info */}
        <div className="mt-8 text-center border-t border-neutral-100 pt-4">
          <p className="text-[10px] text-neutral-400 font-mono">
            Designed & developed with precision logic by <strong className="text-neutral-800 font-bold">Suheb Khan</strong>. All rights reserved &copy; {new Date().getFullYear()}.
          </p>
        </div>

      </div>
    </footer>
  );
}
