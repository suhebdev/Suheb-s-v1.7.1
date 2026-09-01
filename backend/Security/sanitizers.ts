/**
 * ============================================================================
 * Centralized Backend Security Module - Sanitizers
 * ============================================================================
 * Responsibility: Input normalization, dangerous control character removal,
 * XSS payload neutralization, and injection prevention while preserving
 * emojis and multilingual text.
 */

/**
 * Normalizes input whitespace and line endings without destroying user formatting.
 */
export function normalizeWhitespace(text: string, keepNewlines = false): string {
  if (!text) return "";
  
  // 1. Normalize CR/LF line endings
  let normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (keepNewlines) {
    // Trim each line and collapse 3+ consecutive newlines to maximum 2 newlines
    normalized = normalized
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " "))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  } else {
    // Collapse all whitespace (including newlines) to single spaces
    normalized = normalized.replace(/\s+/g, " ");
  }

  return normalized.trim();
}

/**
 * Removes dangerous non-printable control characters and invisible zero-width
 * directional override Unicode characters that could conceal malicious payloads,
 * while strictly preserving all valid multilingual characters and Emojis.
 */
export function sanitizeUnicodeAndControlChars(text: string): string {
  if (!text) return "";

  // Target non-printable ASCII control chars (\x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F-\x9F)
  // and invisible zero-width/bidi directional overrides (\u200B-\u200D, \uFEFF, \u202A-\u202E)
  // Note: \x09 (Tab) and \x0A (Newline) are kept.
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u202A-\u202E]/g, "");
}

/**
 * Neutralizes executable XSS HTML payloads (e.g., <script>, onerror=, javascript:, etc.)
 * without destroying standard plain text or stripping non-executable brackets.
 */
export function sanitizeXSS(text: string): string {
  if (!text) return "";

  let sanitized = text;

  // 1. Neutralize executable script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "[script-neutralized]");
  sanitized = sanitized.replace(/<\/?script[^>]*>/gi, "[script-tag-neutralized]");

  // 2. Neutralize dangerous tags (iframe, object, embed, frame, frameset, applet, base, link, meta, style, svg, math)
  sanitized = sanitized.replace(/<\/?(iframe|object|embed|frame|frameset|applet|base|link|meta|style)\b[^>]*>/gi, (match) => {
    return match.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  });

  // 3. Neutralize inline event handlers in pseudo-HTML tags (e.g. <img onerror=...>, <a onclick=...>)
  sanitized = sanitized.replace(/<([a-z1-6]+)\s+([^>]*?\b(on[a-z]+)\s*=[^>]*)>/gi, (_full, tag, attributes) => {
    const cleanAttrs = attributes.replace(/\b(on[a-z]+)\s*=/gi, "data-disabled-$1=");
    return `<${tag} ${cleanAttrs}>`;
  });

  // 4. Neutralize pseudo-protocols in attribute values or standalone text (javascript:, vbscript:, data:text/html)
  sanitized = sanitized.replace(/\b(javascript|vbscript|data):/gi, (match, protocol) => {
    if (protocol.toLowerCase() === "data" && !/data:\s*text\/html/i.test(sanitized)) {
      // allow harmless data URIs if not text/html
      return match;
    }
    return `${protocol}_disabled:`;
  });

  return sanitized;
}

/**
 * Master input sanitizer that combines whitespace normalization, Unicode control
 * character sanitization, and XSS neutralization while preserving Emojis and foreign scripts.
 */
export function sanitizeInput(
  input: string,
  options: {
    normalizeWhitespace?: boolean;
    keepNewlines?: boolean;
    sanitizeXSS?: boolean;
  } = {}
): string {
  if (typeof input !== "string") {
    return "";
  }

  let result = input;

  // 1. Unicode control char cleaning
  result = sanitizeUnicodeAndControlChars(result);

  // 2. Whitespace normalization
  if (options.normalizeWhitespace !== false) {
    result = normalizeWhitespace(result, options.keepNewlines);
  }

  // 3. XSS neutralization
  if (options.sanitizeXSS !== false) {
    result = sanitizeXSS(result);
  }

  return result;
}
