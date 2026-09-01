/**
 * ============================================================================
 * Centralized Backend Security Module - Validators
 * ============================================================================
 * Responsibility: Reusable, generic input validators for text, email, username,
 * contact names, chat labels, feedback, contact forms, search queries, and phones.
 */

import { ValidationResult, ValidationOptions, ContactFormInput, ContactFormValidationResult } from "./securityTypes";
import { VALIDATION_RULES } from "./validationRules";
import { sanitizeInput } from "./sanitizers";

/**
 * Checks if a string contains malicious injection payloads targeted at SQL,
 * NoSQL, or Firestore databases (e.g. $where, DROP TABLE, UNION SELECT, __proto__).
 */
export function containsDangerousInjectionPayload(text: string): boolean {
  if (!text) return false;

  const lower = text.toLowerCase();

  // 1. Common NoSQL/Firestore injection operators & prototype pollution keywords
  const noSqlPatterns = [
    /\$where\b/i,
    /\$regex\b/i,
    /\$gt\b/i,
    /\$gte\b/i,
    /\$lt\b/i,
    /\$lte\b/i,
    /\$ne\b/i,
    /\$nin\b/i,
    /\$or\b/i,
    /\$and\b/i,
    /__proto__/i,
    /constructor\.prototype/i,
  ];

  for (const pattern of noSqlPatterns) {
    if (pattern.test(text)) return true;
  }

  // 2. SQL injection keywords (only when formatted as statements)
  const sqlPatterns = [
    /\bunion\s+(all\s+)?select\b/i,
    /\bdrop\s+(table|database|view)\b/i,
    /\binsert\s+into\b/i,
    /\bdelete\s+from\b/i,
    /\bupdate\s+\w+\s+set\b/i,
    /\bexec(\s|\()+xp_/i,
    /;\s*--/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(lower)) return true;
  }

  return false;
}

/**
 * Checks for invalid non-printable control characters.
 */
export function containsInvalidControlChars(text: string): boolean {
  if (!text) return false;
  // Allow \t (0x09) and \n (0x0A), reject other control chars
  return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(text);
}

/**
 * Checks for excessive repeated special characters (e.g., !!!!!!!! or $$$$$$$$).
 */
export function containsExcessiveRepeatedSpecialChars(text: string, maxRepeated = 15): boolean {
  if (!text || maxRepeated <= 0) return false;
  // Match any non-alphanumeric special symbol repeated maxRepeated+ times consecutively
  const regex = new RegExp(`([^a-zA-Z0-9\\s])\\1{${maxRepeated},}`);
  return regex.test(text);
}

/**
 * Core reusable text validator. Performs all standard security checks.
 */
export function validateText(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const fieldName = options.fieldName || "Input";

  // 1. Type validation
  if (input === null || input === undefined) {
    if (options.required) {
      return {
        valid: false,
        reason: `${fieldName} is required.`,
        code: "REQUIRED_FIELD_MISSING",
      };
    }
    return { valid: true, sanitizedValue: "" };
  }

  if (typeof input !== "string") {
    return {
      valid: false,
      reason: `${fieldName} must be a valid string.`,
      code: "INVALID_TYPE",
    };
  }

  // 2. Control characters check
  if (containsInvalidControlChars(input)) {
    return {
      valid: false,
      reason: `${fieldName} contains invalid control characters.`,
      code: "INVALID_CONTROL_CHARS",
    };
  }

  // 3. Sanitization
  const sanitized = sanitizeInput(input, {
    normalizeWhitespace: options.normalizeWhitespace !== false,
    keepNewlines: options.keepNewlines === true,
    sanitizeXSS: options.sanitizeXSS !== false,
  });

  // 4. Empty & whitespace-only checks
  if (sanitized.length === 0) {
    if (options.required && !options.allowEmpty) {
      return {
        valid: false,
        reason: `${fieldName} cannot be empty or whitespace-only.`,
        code: "EMPTY_STRING",
      };
    }
    return { valid: true, sanitizedValue: "" };
  }

  // 5. Length checks
  const minLen = options.minLength ?? 0;
  if (sanitized.length < minLen) {
    return {
      valid: false,
      reason: `${fieldName} must be at least ${minLen} character${minLen === 1 ? "" : "s"}.`,
      code: "MIN_LENGTH_VIOLATION",
    };
  }

  const maxLen = options.maxLength ?? 10000;
  if (sanitized.length > maxLen) {
    return {
      valid: false,
      reason: `${fieldName} cannot exceed ${maxLen} characters.`,
      code: "MAX_LENGTH_VIOLATION",
    };
  }

  // 6. Excessive repeated special characters check
  if (options.maxRepeatedChars) {
    if (containsExcessiveRepeatedSpecialChars(sanitized, options.maxRepeatedChars)) {
      return {
        valid: false,
        reason: `${fieldName} contains excessive repeated special characters.`,
        code: "EXCESSIVE_REPEATED_CHARS",
      };
    }
  }

  // 7. Injection payload check
  if (options.preventInjection !== false && containsDangerousInjectionPayload(sanitized)) {
    return {
      valid: false,
      reason: `${fieldName} contains disallowed payload syntax.`,
      code: "INJECTION_PAYLOAD_DETECTED",
    };
  }

  // 8. Pattern matching
  if (options.pattern && !options.pattern.test(sanitized)) {
    return {
      valid: false,
      reason: `${fieldName} format is invalid.`,
      code: "PATTERN_MISMATCH",
    };
  }

  // 9. Custom validator hook
  if (options.customValidator) {
    const customResult = options.customValidator(sanitized);
    if (customResult !== true) {
      return {
        valid: false,
        reason: typeof customResult === "string" ? customResult : `${fieldName} failed custom validation.`,
        code: "CUSTOM_VALIDATION_FAILED",
      };
    }
  }

  return {
    valid: true,
    sanitizedValue: sanitized,
  };
}

/**
 * Validates an email address.
 */
export function validateEmail(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.EMAIL,
    ...options,
  };
  return validateText(input, mergedOptions);
}

/**
 * Validates a username.
 */
export function validateUsername(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.USERNAME,
    ...options,
  };
  return validateText(input, mergedOptions);
}

/**
 * Validates a contact name or inquirer full name.
 */
export function validateContactName(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.CONTACT_NAME,
    ...options,
  };
  return validateText(input, mergedOptions);
}

/**
 * Validates a chat label name.
 */
export function validateChatLabel(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.CHAT_LABEL,
    ...options,
  };
  return validateText(input, mergedOptions);
}

/**
 * Validates user feedback input.
 */
export function validateFeedback(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.FEEDBACK,
    ...options,
  };
  return validateText(input, mergedOptions);
}

/**
 * Validates a search field query.
 */
export function validateSearchQuery(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.SEARCH,
    ...options,
  };
  return validateText(input, mergedOptions);
}

/**
 * Helper to check if a phone number is a fake / sequential / dummy pattern.
 */
export function isFakeOrInvalidMobile(phone: string): { isFake: boolean; reason?: string } {
  const digitsOnly = phone.replace(/[^0-9]/g, "");

  if (digitsOnly.length !== 10) {
    return { isFake: true, reason: "A valid mobile number must be exactly 10 digits." };
  }

  // Must start with a valid telecom mobile prefix (6, 7, 8, 9)
  if (!/^[6-9]/.test(digitsOnly)) {
    return { isFake: true, reason: "Mobile number must start with a valid prefix (6, 7, 8, or 9)." };
  }

  // Check for repeating identical digits (e.g. 9999999999, 8888888888, 0000000000)
  if (/^(\d)\1{9}$/.test(digitsOnly)) {
    return { isFake: true, reason: "Invalid phone number: Repeated dummy digits are not permitted." };
  }

  // Check for sequential dummy numbers
  const sequentialPatterns = [
    "1234567890",
    "0123456789",
    "9876543210",
    "0987654321",
    "2345678901",
    "8765432109",
    "1122334455",
    "1212121212",
  ];
  if (sequentialPatterns.includes(digitsOnly)) {
    return { isFake: true, reason: "Invalid phone number: Sequential or dummy sequence is not permitted." };
  }

  // Check for too few unique digits (e.g. 9898989898 or 7070707070)
  const uniqueDigits = new Set(digitsOnly.split(""));
  if (uniqueDigits.size <= 2) {
    return { isFake: true, reason: "Invalid phone number: Dummy repetitive pattern detected." };
  }

  return { isFake: false };
}

/**
 * Validates a phone number input.
 */
export function validatePhoneNumber(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const mergedOptions: ValidationOptions = {
    ...VALIDATION_RULES.PHONE,
    ...options,
  };
  const baseResult = validateText(input, mergedOptions);
  if (!baseResult.valid) {
    return baseResult;
  }

  if (baseResult.sanitizedValue) {
    const fakeCheck = isFakeOrInvalidMobile(baseResult.sanitizedValue);
    if (fakeCheck.isFake) {
      return {
        valid: false,
        reason: fakeCheck.reason || "Please enter a valid active mobile number.",
        code: "INVALID_PHONE_FORMAT",
      };
    }
  }

  return baseResult;
}

/**
 * Validates a complete contact form object.
 */
export function validateContactForm(input: ContactFormInput): ContactFormValidationResult {
  const errors: Record<string, string> = {};
  const sanitizedData = {
    name: "",
    email: "",
    phone: "",
    message: "",
  };

  // Validate Name
  const nameRes = validateContactName(input.name);
  if (!nameRes.valid) {
    errors.name = nameRes.reason || "Invalid name";
  } else {
    sanitizedData.name = nameRes.sanitizedValue || "";
  }

  // Validate Phone
  const phoneRes = validatePhoneNumber(input.phone);
  if (!phoneRes.valid) {
    errors.phone = phoneRes.reason || "Invalid phone number";
  } else {
    sanitizedData.phone = phoneRes.sanitizedValue || "";
  }

  // Validate Email (if provided)
  if (input.email !== undefined && input.email !== null && String(input.email).trim() !== "") {
    const emailRes = validateEmail(input.email);
    if (!emailRes.valid) {
      errors.email = emailRes.reason || "Invalid email address";
    } else {
      sanitizedData.email = emailRes.sanitizedValue || "";
    }
  }

  // Validate Message (if provided)
  if (input.message !== undefined && input.message !== null && String(input.message).trim() !== "") {
    const msgRes = validateText(input.message, VALIDATION_RULES.CONTACT_MESSAGE);
    if (!msgRes.valid) {
      errors.message = msgRes.reason || "Invalid message text";
    } else {
      sanitizedData.message = msgRes.sanitizedValue || "";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitizedData,
  };
}

/**
 * Helper to validate any field using a named key from VALIDATION_RULES.
 */
export function validateByRule(input: unknown, ruleKey: keyof typeof VALIDATION_RULES, customOverrides: ValidationOptions = {}): ValidationResult {
  const rule = VALIDATION_RULES[ruleKey] || VALIDATION_RULES.GENERIC_TEXT;
  return validateText(input, { ...rule, ...customOverrides });
}
