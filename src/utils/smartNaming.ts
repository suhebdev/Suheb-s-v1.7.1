import JSZip from "jszip";

/**
 * Interface representing a code block parsed or used for smart naming.
 */
export interface ResolvedFileBlock {
  filename: string;
  code: string;
  language: string;
  path?: string;
}

/**
 * 1. Resolves syntax extension mismatch by analyzing actual code content (Case 5).
 */
export function resolveCodeExtensionBySniffing(code: string, currentExt: string): string {
  const normalized = code.trim();
  const lowerExt = currentExt.toLowerCase();

  // HTML
  if (normalized.startsWith("<!DOCTYPE html>") || normalized.includes("<html>") || normalized.includes("<body>")) {
    return "html";
  }

  // JSON
  if ((normalized.startsWith("{") && normalized.endsWith("}")) || (normalized.startsWith("[") && normalized.endsWith("]"))) {
    try {
      JSON.parse(normalized);
      return "json";
    } catch {
      // Not valid JSON, keep going
    }
  }

  // Python
  if (normalized.includes("def ") && (normalized.includes("import sys") || normalized.includes("print(") || normalized.includes("if __name__ =="))) {
    return "py";
  }

  // Java
  if (normalized.includes("class ") && normalized.includes("public static void main") && normalized.includes("System.out.print")) {
    return "java";
  }

  // CSS
  if (normalized.includes("@import") || (normalized.includes("{") && normalized.includes(":") && /\b(color|background|margin|padding|display|border|position|width|height):/i.test(normalized))) {
    if (!normalized.includes("<") && !normalized.includes("import React")) {
      return "css";
    }
  }

  // Shell scripting
  if (normalized.startsWith("#!") || normalized.includes("echo ") || normalized.includes("chmod +x")) {
    return "sh";
  }

  // React/TSX or JSX Sniffing
  const hasReact = normalized.includes("import React") || normalized.includes("react") || normalized.includes("useState") || normalized.includes("useEffect");
  const hasJSX = normalized.includes("<div") || normalized.includes("export default function") || normalized.includes("className=");
  const hasTS = normalized.includes(": string") || normalized.includes(": any") || normalized.includes("interface ") || normalized.includes("type ");

  if (hasJSX) {
    if (hasTS) return "tsx";
    return "jsx";
  }

  if (hasTS) {
    return "ts";
  }

  // Default to normalized inputs
  if (["tsx", "ts", "jsx", "js", "html", "css", "py", "java", "sh", "json", "md", "env"].includes(lowerExt)) {
    return lowerExt;
  }

  return lowerExt || "js";
}

/**
 * 2. Matches semantic terms/purpose in the prompt to appropriate component names (Case 2 & Case 3).
 */
function guessNameBySemanticPurpose(promptText: string, ext: string): string {
  const lower = promptText.toLowerCase();

  // Common mapping definitions
  const mappings: { keywords: string[]; name: string }[] = [
    { keywords: ["login page", "login screen", "login form", "signin"], name: "LoginPage" },
    { keywords: ["signup", "registration", "register", "register form"], name: "SignupPage" },
    { keywords: ["navbar", "navigation bar", "navigation menu", "header menu"], name: "NavBar" },
    { keywords: ["footer", "copyright bar"], name: "Footer" },
    { keywords: ["sidebar", "drawer", "side panel", "side menu"], name: "Sidebar" },
    { keywords: ["hero section", "hero banner", "jumbotron"], name: "HeroSection" },
    { keywords: ["calculator"], name: "Calculator" },
    { keywords: ["todo list", "todo app", "task manager", "todolist"], name: "TodoApp" },
    { keywords: ["chat", "messenger", "chatbot", "chat window"], name: "ChatInterface" },
    { keywords: ["weather", "weather widget", "weather forecast"], name: "WeatherWidget" },
    { keywords: ["calendar", "date picker", "calendar view"], name: "CalendarView" },
    { keywords: ["profile", "user profile", "account info"], name: "UserProfile" },
    { keywords: ["contact form", "contacts", "contact us"], name: "ContactForm" },
    { keywords: ["settings", "preferences", "config panel"], name: "SettingsPage" },
    { keywords: ["loading", "spinner", "loader"], name: "LoadingSpinner" },
    { keywords: ["landing page", "homepage", "welcome screen"], name: "LandingPage" },
    { keywords: ["button", "cta button"], name: "Button" },
    { keywords: ["card", "product card", "item card"], name: "Card" },
    { keywords: ["modal", "dialog", "popup"], name: "Modal" }
  ];

  for (const map of mappings) {
    if (map.keywords.some(kw => lower.includes(kw))) {
      let base = map.name;
      // Change naming casing depending on file type: Python likes snake_case
      if (ext === "py" || ext === "html" || ext === "css" || ext === "sh") {
        base = base.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
      }
      return base;
    }
  }

  // Vague prompts like "make a game" or "write parser"
  if (lower.includes("game") || lower.includes("play")) return ext === "py" ? "game" : "Game";
  if (lower.includes("parser") || lower.includes("compiler")) return ext === "py" ? "parser" : "Parser";
  if (lower.includes("util") || lower.includes("helper")) return ext === "py" ? "utils" : "utils";

  return ext === "py" || ext === "html" || ext === "sh" ? "app" : "App";
}

/**
 * Handles explicit special configurations and system files (Case 7).
 */
export function matchSpecialConfigFiles(promptText: string, code: string): string | null {
  const lower = promptText.toLowerCase();

  const specialFiles = [
    { file: ".env", kw: ["env file", "environment variable", "dot env", ".env"] },
    { file: ".env.example", kw: ["env.example", "dotenv example", "environment example"] },
    { file: ".gitignore", kw: ["gitignore", "ignore folder", "git ignore"] },
    { file: "Dockerfile", kw: ["dockerfile", "docker file"] },
    { file: "docker-compose.yml", kw: ["docker compose", "docker-compose"] },
    { file: "package.json", kw: ["package.json", "npm config"] },
    { file: "tsconfig.json", kw: ["tsconfig", "types config", "typescript config"] },
    { file: "vite.config.ts", kw: ["vite.config.ts", "vite typescript config"] },
    { file: "vite.config.js", kw: ["vite.config.js", "vite js config"] },
    { file: "tailwind.config.js", kw: ["tailwind config", "tailwind.config"] },
    { file: "postcss.config.js", kw: ["postcss.config", "postcss config"] },
    { file: "firestore.rules", kw: ["firestore rules", "firestore.rules", "database rule"] }
  ];

  for (const check of specialFiles) {
    if (check.kw.some(kw => lower.includes(kw))) {
      return check.file;
    }
  }

  // Scan file contents for exact indicators
  const cleanCode = code.trim();
  if (cleanCode.startsWith("{") && cleanCode.includes("\"dependencies\"") && cleanCode.includes("\"scripts\"")) {
    return "package.json";
  }
  if (cleanCode.includes("module.exports = {") && cleanCode.includes("tailwind")) {
    return "tailwind.config.js";
  }
  if (cleanCode.startsWith("rules_version =")) {
    return "firestore.rules";
  }
  if (cleanCode.includes("CompilerOptions") || cleanCode.includes("compilerOptions")) {
    return "tsconfig.json";
  }

  return null;
}

/**
 * Primary algorithm to calculate the smart, professional filename based on code, lang, prompting and context.
 */
export function getSmartFileName({
  code,
  lang,
  promptText,
  prosePreceding = "",
  allMessages = [],
  blockIndex = 0,
  sessionTitle = ""
}: {
  code: string;
  lang: string;
  promptText: string;
  prosePreceding?: string;
  allMessages?: { sender: "user" | "ai"; text: string; id: string }[];
  blockIndex?: number;
  sessionTitle?: string;
}): string {
  // Extract initial extension from code-metadata language
  let currentExt = "js";
  const lowerLang = lang.toLowerCase();
  
  if (lowerLang.includes("typescript") || lowerLang === "ts" || lowerLang === "tsx") currentExt = "tsx";
  else if (lowerLang.includes("react") || lowerLang === "jsx") currentExt = "jsx";
  else if (lowerLang.includes("html") || lowerLang === "xml") currentExt = "html";
  else if (lowerLang.includes("css")) currentExt = "css";
  else if (lowerLang.includes("json")) currentExt = "json";
  else if (lowerLang.includes("python") || lowerLang === "py") currentExt = "py";
  else if (lowerLang.includes("java")) currentExt = "java";
  else if (lowerLang.includes("bash") || lowerLang === "sh") currentExt = "sh";
  else if (lowerLang.includes("yaml") || lowerLang === "yml") currentExt = "yml";
  else if (lowerLang.includes("markdown") || lowerLang === "md") currentExt = "md";

  // Sniff content to fix any language mismatches securely (Case 5)
  const resolvedExt = resolveCodeExtensionBySniffing(code, currentExt);

  // Check 1: Special configs (Case 7)
  const specialFile = matchSpecialConfigFiles(promptText, code);
  if (specialFile) {
    return specialFile;
  }

  // Check 2: Parse prose preceding for file headings or labels (Priority 1)
  // E.g., looking for markdown header containing file name like: "### src/utils/pricing.tsx"
  const lines = prosePreceding.split("\n").map(l => l.trim()).filter(Boolean);
  const recentLines = lines.slice(-5); // Check the nearest 5 lines of markdown prose

  // Regexes to extract paths/filenames
  const backtickRegex = /`([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)`/;
  const boldOrHeadingRegex = /(?:#{1,6}|\*\*)\s*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\s*(?:\*\*|$)/;
  const labelPrefixRegex = /(?:file|path|create|update|modify|in|for|save as):\s*`?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)`?/i;

  for (let i = recentLines.length - 1; i >= 0; i--) {
    const line = recentLines[i];
    
    // Check prefix label "File: components/Item.tsx"
    const labelMatch = line.match(labelPrefixRegex);
    if (labelMatch && labelMatch[1]) {
      return sanitizeResolvedPath(labelMatch[1], resolvedExt);
    }

    // Check backticks `src/App.tsx`
    const backtickMatch = line.match(backtickRegex);
    if (backtickMatch && backtickMatch[1]) {
      return sanitizeResolvedPath(backtickMatch[1], resolvedExt);
    }

    // Check headings or bold texts
    const boldMatch = line.match(boldOrHeadingRegex);
    if (boldMatch && boldMatch[1]) {
      return sanitizeResolvedPath(boldMatch[1], resolvedExt);
    }
  }

  // Check 3: Extract explicit filename in current user prompt (Case 1)
  const userFileRegex = /\b([a-zA-Z0-9_\-\/]+\.(?:tsx?|jsx?|html?|css|json|py|java|sh|md|env|yml|yaml|xml|gradle|properties|config|example))\b/i;
  const promptMatch = promptText.match(userFileRegex);
  if (promptMatch && promptMatch[1]) {
    return sanitizeResolvedPath(promptMatch[1], resolvedExt);
  }

  // Check 4: Check if any previous user prompts in history mention filenames
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msg = allMessages[i];
    if (msg.sender === "user") {
      const historyMatch = msg.text.match(userFileRegex);
      if (historyMatch && historyMatch[1]) {
        return sanitizeResolvedPath(historyMatch[1], resolvedExt);
      }
    }
  }

  // Check 5: Match purpose to component schemas semantically (Case 2 & Case 3)
  const semanticBase = guessNameBySemanticPurpose(promptText, resolvedExt);
  let resolvedFilename = `${semanticBase}.${resolvedExt}`;

  // Check 6: Check for session-history to avoid overriding or implement version counts (Case 6)
  let matchingCount = 0;
  allMessages.forEach(msg => {
    // Scan previously rendered messages for presence of the file being discussed
    if (msg.sender === "ai") {
      const regex = new RegExp(`file|path|create|update:\\s*[\`\\*]*([a-zA-Z0-9_\\-\\.\\/]+\\.[a-zA-Z0-9]+)`, "gi");
      let m;
      while ((m = regex.exec(msg.text)) !== null) {
        if (m[1] && m[1].toLowerCase().includes(semanticBase.toLowerCase())) {
          matchingCount++;
        }
      }
    }
  });

  // If there are prior entries, create a v2/v3 suffix or timestamp (Case 6)
  // Also check if user or session title asks for version updates specifically
  const asksForVersion = promptText.toLowerCase().includes("version") || promptText.toLowerCase().includes("v2") || promptText.toLowerCase().includes("update");
  if (matchingCount > 0 || asksForVersion) {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const vString = matchingCount > 0 ? `_v${matchingCount + 1}` : `_${todayStr}`;
    resolvedFilename = `${semanticBase}${vString}.${resolvedExt}`;
  }

  // Check 7: Multiple files with same name across blocks in same response (Case 4)
  // If this is block index 1, 2, etc. and we guessed the same name, append index
  if (blockIndex > 0) {
    const nameWithoutExt = resolvedFilename.substring(0, resolvedFilename.lastIndexOf("."));
    resolvedFilename = `${nameWithoutExt}_part_${blockIndex + 1}.${resolvedExt}`;
  }

  return resolvedFilename;
}

/**
 * Clears folder noise and verifies extension validity.
 */
function sanitizeResolvedPath(filepath: string, targetExt: string): string {
  // If path is specified, strip or keep appropriately
  const pathParts = filepath.split("/");
  const actualFilename = pathParts[pathParts.length - 1];

  // Make sure extension is valid or preserve path if desired
  const dotIndex = actualFilename.lastIndexOf(".");
  if (dotIndex !== -1) {
    const currentExt = actualFilename.substring(dotIndex + 1).toLowerCase();
    // Validate if extension is accurate, otherwise enforce sniffed extension
    if (currentExt !== targetExt && ["js", "jsx", "ts", "tsx", "py", "java", "html", "css"].includes(targetExt)) {
      // Allow minor TSX/JSX transitions, otherwise convert
      if (["js", "jsx", "ts", "tsx"].includes(currentExt) && ["js", "jsx", "ts", "tsx"].includes(targetExt)) {
        return filepath; // keep original closely-related typescript extensions
      } else {
        // Enforce safe target sniffing
        const pathNoFile = filepath.substring(0, filepath.lastIndexOf("/") + 1);
        const nameNoExt = actualFilename.substring(0, dotIndex);
        return `${pathNoFile}${nameNoExt}.${targetExt}`;
      }
    }
  }

  return filepath;
}

/**
 * Triggers in-browser individual file download automatically.
 */
export function triggerBrowserFileDownload(filename: string, code: string) {
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  // For individual files, strip the folder paths completely and download only the filename (e.g., "Button.jsx" instead of "components/Button.jsx")
  const pathParts = filename.split("/");
  const cleanDownloadName = pathParts[pathParts.length - 1];
  link.download = cleanDownloadName;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a ZIP archive download containing multiple files (Case 8 & Case 4 folders).
 */
export async function triggerZipArchiveDownload(sessionTitle: string, files: ResolvedFileBlock[]) {
  const zip = new JSZip();

  files.forEach((file) => {
    // Determine the proper entry path
    const fileEntryPath = file.path || file.filename;
    // Add code entry contents
    zip.file(fileEntryPath, file.code);
  });

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  
  const link = document.createElement("a");
  link.href = url;
  
  const timestamp = new Date().toISOString().split("T")[0];
  const cleanedTitle = sessionTitle.toLowerCase().replace(/[^a-z0-9]/g, "-") || "vibecoder-app";
  link.download = `${cleanedTitle}-${timestamp}.zip`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
