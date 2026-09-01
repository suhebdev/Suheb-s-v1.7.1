import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Terminal, AppWindow, Send, Menu, X, Code2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SettingsIconAnimated } from "./Components";

interface HeaderProps {
  onHireClick: () => void;
  onStackClick: () => void;
  currentPage: "home" | "projects" | "tools";
  onPageChange: (page: "home" | "projects" | "tools") => void;
}

export default function Header({ onHireClick, onStackClick, currentPage, onPageChange }: HeaderProps) {
  const navigate = useNavigate();
  const navigateAndScroll = (path: string, pageName: "home" | "projects" | "tools") => {
    const html = document.documentElement;
    const originalBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    html.style.scrollBehavior = originalBehavior;
    navigate(path);
    onPageChange(pageName);
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const desktopHomeRef = React.useRef<HTMLButtonElement>(null);
  const desktopProjectsRef = React.useRef<HTMLButtonElement>(null);
  const desktopToolsRef = React.useRef<HTMLButtonElement>(null);
  const mobileHomeRef = React.useRef<HTMLButtonElement>(null);
  const mobileProjectsRef = React.useRef<HTMLButtonElement>(null);
  const mobileToolsRef = React.useRef<HTMLButtonElement>(null);

  const [desktopPillStyle, setDesktopPillStyle] = useState({ left: 0, width: 0, height: 0, top: 0 });
  const [mobilePillStyle, setMobilePillStyle] = useState({ left: 0, width: 0, height: 0, top: 0 });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updatePills = () => {
      let desktopActive = null;
      if (currentPage === "home") {
        desktopActive = desktopHomeRef.current;
      } else if (currentPage === "projects") {
        desktopActive = desktopProjectsRef.current;
      } else if (currentPage === "tools") {
        desktopActive = desktopToolsRef.current;
      }

      if (desktopActive) {
        setDesktopPillStyle({
          left: desktopActive.offsetLeft,
          width: desktopActive.offsetWidth,
          height: desktopActive.offsetHeight,
          top: desktopActive.offsetTop,
        });
      }
      
      let mobileActive = null;
      if (currentPage === "home") {
        mobileActive = mobileHomeRef.current;
      } else if (currentPage === "projects") {
        mobileActive = mobileProjectsRef.current;
      } else if (currentPage === "tools") {
        mobileActive = mobileToolsRef.current;
      }

      if (mobileActive) {
        setMobilePillStyle({
          left: mobileActive.offsetLeft,
          width: mobileActive.offsetWidth,
          height: mobileActive.offsetHeight,
          top: mobileActive.offsetTop,
        });
      }
    };

    updatePills();
    
    // Match position in the next frame to settle CSS transitions
    const rId = requestAnimationFrame(updatePills);
    const tId = setTimeout(updatePills, 60);

    window.addEventListener("resize", updatePills);
    return () => {
      cancelAnimationFrame(rId);
      clearTimeout(tId);
      window.removeEventListener("resize", updatePills);
    };
  }, [currentPage, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const scrollToSolutions = (e: React.MouseEvent) => {
    e.preventDefault();
    const doScroll = () => {
      const el = document.getElementById("operational-showcase");
      if (el) {
        const headerOffset = 110; // offset to prevent heading disappearing under fixed header
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    };

    if (currentPage !== "home") {
      onPageChange("home");
      setTimeout(doScroll, 180);
    } else {
      doScroll();
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 py-4 px-4 md:px-8 transition-all duration-300 ease-out ${
        isScrolled ? "lg:px-8" : "lg:px-4"
      }`}
    >
      {/* Blurred background backdrop overlay underneath dropdown menu, clicking it closes drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/15 backdrop-blur-[6px] z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <div 
        className={`mx-auto rounded-full border py-3 px-6 sm:px-8 transition-all duration-300 ease-out relative z-40 ${
          isScrolled 
            ? "bg-white/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.06)] border-black/[0.08] max-w-6xl" 
            : "bg-white/50 backdrop-blur-md border-black/[0.06] ring-1 ring-black/[0.04] shadow-[0_0_25px_rgba(0,0,0,0.03),0_10px_35px_rgba(0,0,0,0.06)] max-w-6xl lg:max-w-full"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Brand Monogram Logomark */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange("home");
            }}
            className="flex items-center gap-2 group"
          >
            <div className="flex items-center justify-center">
              <SettingsIconAnimated size={24} primaryColor="#000000" accentColor="#2563eb" />
            </div>
            <span className="font-bold text-xs tracking-tight text-black flex items-center gap-1.5">
              <span>SUHEB KHAN</span>
              <span className="text-blue-600 text-[9px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono font-medium">VIBECODER</span>
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 relative">
            {/* Sliding Background Pill */}
            {desktopPillStyle.width > 0 && (
              <motion.div
                className="absolute bg-black rounded-full -z-10 pointer-events-none"
                animate={{
                  left: desktopPillStyle.left,
                  width: desktopPillStyle.width,
                  height: desktopPillStyle.height,
                  top: desktopPillStyle.top,
                }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <button 
              ref={desktopHomeRef}
              onClick={() => navigateAndScroll("/", "home")}
              className={`relative flex items-center gap-1.5 text-xs font-semibold tracking-tight transition-all duration-300 py-1.5 px-3 rounded-full cursor-pointer z-10 select-none ${
                currentPage === "home" 
                  ? "text-white" 
                  : "text-neutral-600 hover:text-black hover:bg-neutral-100/50"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button 
              ref={desktopProjectsRef}
              onClick={() => navigateAndScroll("/Projects", "projects")}
              className={`relative flex items-center gap-1.5 text-xs font-semibold tracking-tight transition-all duration-300 py-1.5 px-3 rounded-full cursor-pointer z-10 select-none ${
                currentPage === "projects" 
                  ? "text-white" 
                  : "text-neutral-600 hover:text-black hover:bg-neutral-100/50"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Project Build</span>
            </button>
            <button 
              ref={desktopToolsRef}
              onClick={() => navigateAndScroll("/Tools", "tools")}
              className={`relative flex items-center gap-1.5 text-xs font-semibold tracking-tight transition-all duration-300 py-1.5 px-3 rounded-full cursor-pointer z-10 select-none ${
                currentPage === "tools" 
                  ? "text-white" 
                  : "text-neutral-600 hover:text-black hover:bg-neutral-100/50"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Tools</span>
            </button>
          </nav>

          {/* Call to Action Button */}
          <div className="hidden lg:flex items-center gap-3">
            <span className="text-[10px] text-neutral-400 font-mono select-none">
              v1.7.0_stable
            </span>
            <button
              onClick={onHireClick}
              className="group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full bg-blue-600 text-white text-xs font-semibold px-5 py-2.5 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Send className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                Hire Me
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-black transition-transform duration-300" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-700 hover:text-black active:scale-90 transition-transform cursor-pointer relative z-50 flex items-center justify-center w-9 h-9"
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-4 flex items-center justify-center">
              <div className="relative w-5 h-4">
                {/* Top line to rotate clockwise */}
                <motion.span
                  className="absolute left-0 w-full h-[2px] bg-neutral-800 rounded-full"
                  style={{ top: "1px" }}
                  animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                />
                
                {/* Middle line to shrink and fade out */}
                <motion.span
                  className="absolute left-0 top-[7px] w-full h-[2px] bg-neutral-800 rounded-full"
                  animate={mobileMenuOpen ? { opacity: 0, scale: 0.2 } : { opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                />
                
                {/* Bottom line to rotate counter-clockwise */}
                <motion.span
                  className="absolute left-0 w-full h-[2px] bg-neutral-800 rounded-full"
                  style={{ bottom: "1px" }}
                  animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeIn" }}
            className="lg:hidden mt-2 mx-auto max-w-sm rounded-2xl bg-white/95 backdrop-blur-md border border-neutral-200 p-4 shadow-xl relative z-40"
          >
            <div className="flex flex-col gap-2 relative">
              {/* Sliding Mobile Background Pill */}
              {mobilePillStyle.width > 0 && (
                <motion.div
                  className="absolute bg-black rounded-lg -z-10 pointer-events-none"
                  animate={{
                    left: mobilePillStyle.left,
                    width: mobilePillStyle.width,
                    height: mobilePillStyle.height,
                    top: mobilePillStyle.top,
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <button
                ref={mobileHomeRef}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateAndScroll("/", "home");
                }}
                className={`relative flex items-center gap-2 text-xs py-2 px-3 rounded-lg font-bold text-left w-full cursor-pointer transition-colors duration-200 z-10 ${
                  currentPage === "home"
                    ? "text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <Terminal className="w-4 h-4" />
                Home
              </button>
              <button
                ref={mobileProjectsRef}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateAndScroll("/Projects", "projects");
                }}
                className={`relative flex items-center gap-2 text-xs py-2 px-3 rounded-lg font-bold text-left w-full cursor-pointer transition-colors duration-200 z-10 ${
                  currentPage === "projects"
                    ? "text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <Code2 className="w-4 h-4" />
                Project Build
              </button>
              <button
                ref={mobileToolsRef}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateAndScroll("/Tools", "tools");
                }}
                className={`relative flex items-center gap-2 text-xs py-2 px-3 rounded-lg font-bold text-left w-full cursor-pointer transition-colors duration-200 z-10 ${
                  currentPage === "tools"
                    ? "text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Tools
              </button>
              <hr className="border-neutral-100 my-1" />
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onHireClick();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/15 cursor-pointer hover:bg-blue-700 transition-colors duration-200"
              >
                <Send className="w-3.5 h-3.5" />
                Hire Suheb Khan
              </button>
              <div className="text-center text-[9px] text-neutral-400 font-mono mt-1">
                SYSTEM: ACTIVE // DEV ENVIRONMENT: CLOUD_RUN
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
