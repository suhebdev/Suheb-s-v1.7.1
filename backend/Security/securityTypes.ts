/**
 * ============================================================================
 * Centralized Backend Security Module - Security Types
 * ============================================================================
 * Responsibility: Defining standard type contracts for input validation,
 * sanitization results, rule definitions, and security settings.
 */

export type FieldType = 
  | 'text'
  | 'email'
  | 'username'
  | 'contactName'
  | 'inquirerName'
  | 'chatLabel'
  | 'feedback'
  | 'contactForm'
  | 'search'
  | 'message'
  | 'phone'
  | 'chatId'
  | 'generic';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  sanitizedValue?: string;
  field?: string;
  code?: string;
}

export interface ValidationOptions {
  fieldName?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  allowEmpty?: boolean;
  pattern?: RegExp;
  allowedCharsPattern?: RegExp;
  customValidator?: (value: string) => boolean | string;
  normalizeWhitespace?: boolean;
  keepNewlines?: boolean;
  sanitizeXSS?: boolean;
  preventInjection?: boolean;
  maxRepeatedChars?: number;
}

export interface RuleDefinition extends ValidationOptions {
  fieldName: string;
  minLength: number;
  maxLength: number;
  required: boolean;
}

export interface ContactFormInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
}

export interface ContactFormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitizedData: {
    name: string;
    email: string;
    phone: string;
    message: string;
  };
}
