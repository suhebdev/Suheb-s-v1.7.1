/**
 * ============================================================================
 * Centralized Backend Security Module - Firewall Constants
 * ============================================================================
 * Responsibility: Single source of truth for Application Firewall limits,
 * allowed methods, header rules, and pattern signatures.
 */

export const FIREWALL_CONSTANTS = {
  // HTTP Methods permitted by the application
  ALLOWED_METHODS: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],

  // Limits for URL, headers, and query strings
  MAX_URL_LENGTH: 2048,
  MAX_QUERY_STRING_LENGTH: 1024,
  MAX_HEADER_VALUE_LENGTH: 8192,
  MAX_HEADER_COUNT: 100,

  // Path Traversal & Suspicious File URL Signatures
  PATH_TRAVERSAL_PATTERNS: [
    /\.\.[\/\\]/,                   // ../ or ..\
    /%2e%2e/i,                      // URL encoded ..
    /%252e/i,                       // Double URL encoded .
    /\/etc\/passwd/i,
    /boot\.ini/i,
    /cmd\.exe/i,
    /\/wp-admin/i,
    /\/wp-login/i,
    /phpmyadmin/i,
    /\/\.env\b/i,
    /\/\.git\b/i,
    /composer\.json/i,
    /package-lock\.json/i,
  ],

  // SQL Injection Signatures
  SQL_INJECTION_PATTERNS: [
    /\bunion\s+(all\s+)?select\b/i,
    /\bdrop\s+(table|database|view)\b/i,
    /\binsert\s+into\b/i,
    /\bdelete\s+from\b/i,
    /\bupdate\s+\w+\s+set\b/i,
    /\b(or|and)\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i,
    /['"]\s*or\s+['"]/i,
    /;\s*--/i,
    /\/\*[\s\S]*?\*\//,
    /\bxp_cmdshell\b/i,
    /\bsleep\s*\(\s*\d+\s*\)/i,
    /\bbenchmark\s*\(/i,
    /\binformation_schema\b/i,
  ],

  // XSS Attack Signatures
  XSS_PATTERNS: [
    /<script\b/i,
    /\bjavascript\s*:/i,
    /\bvbscript\s*:/i,
    /\bonerror\s*=/i,
    /\bonclick\s*=/i,
    /\bonload\s*=/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /\bdocument\.cookie\b/i,
    /\bwindow\.location\b/i,
  ],

  // Command Injection Signatures
  COMMAND_INJECTION_PATTERNS: [
    /;\s*(rm\s+-rf|chmod|wget|curl|shutdown|powershell|bash|cmd)\b/i,
    /(&&|\|\|)\s*(rm\s+-rf|chmod|wget|curl|shutdown|powershell|bash|cmd)\b/i,
    /`[^`]*\b(rm|chmod|wget|curl|powershell|bash)\b[^`]*`/i,
    /\$\([^)]*\b(rm|chmod|wget|curl|powershell|bash)\b[^)]*\)/i,
    /\b(cmd|powershell|bash|curl|wget|chmod)\b\s+-[a-z0-9]/i,
    /\brm\s+-rf\b/i,
    /\bshutdown\s+(-h|-r|now)\b/i,
  ],
};
