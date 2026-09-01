# Centralized Security Module: Input Validation & Sanitization

## Overview

The `backend/Security` module provides production-grade, centralized input validation and sanitization for the entire application. It safeguards both client-side components and server-side endpoints against cross-site scripting (XSS), SQL/NoSQL injection, prototype pollution, control character exploits, and malformed inputs while ensuring 100% support for multilingual text and Unicode Emojis.

---

## Directory Structure

```
backend/Security/
├── securityTypes.ts       # TypeScript interfaces, options, and validation result schemas
├── validationRules.ts     # Centralized, configurable length limits, patterns, and security flags
├── sanitizers.ts          # Normalization, control-character stripping, and XSS payload neutralization
├── validators.ts          # Core reusable validators (Text, Email, Phone, Name, Search, Feedback, etc.)
├── index.ts               # Module barrel re-export
└── README.md              # Documentation and usage guidelines
```

---

## Core Security Features

1. **Centralized Field Rules (`validationRules.ts`)**:
   All string length limits, required flags, and regex patterns are centrally configured. No length checks or field limits are hardcoded directly inside visual components.

2. **Multilingual & Emoji Preservation**:
   Strictly preserves non-Latin alphabets (Arabic, Hindi, Cyrillic, Chinese, Japanese, Spanish, French, etc.) and multi-byte Unicode surrogate pairs (Emojis).

3. **Control Character & Invisible Bidi Filtering**:
   Removes non-printable control characters (`\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F-\x9F`) and zero-width directional override Unicode codes (`\u200B-\u200D`, `\uFEFF`, `\u202A-\u202E`) that could conceal exploits.

4. **Executable XSS Neutralization**:
   Neutralizes active script tags (`<script>`), dangerous embeds (`<iframe>`, `<object>`, `<embed>`), inline handlers (`onerror=`, `onload=`, `onclick=`), and URI protocols (`javascript:`, `vbscript:`) without stripping harmless plain text or brackets.

5. **Injection Payload Detection**:
   Rejects malicious syntax targeting NoSQL/Firestore (`$where`, `$regex`, `$gt`, `__proto__`) and SQL statements (`UNION SELECT`, `DROP TABLE`).

---

## Quick Usage Examples

### 1. Validating a Contact Form in React

```typescript
import { validateContactForm } from "@/backend/Security";

const onSubmit = (formData) => {
  const result = validateContactForm(formData);

  if (!result.valid) {
    console.error("Validation failed:", result.errors);
    return;
  }

  // Use sanitized data for backend or Firestore calls
  const { name, email, phone, message } = result.sanitizedData;
  await saveToFirestore({ name, email, phone, message });
};
```

### 2. Validating a Single Field by Rule Key

```typescript
import { validateByRule } from "@/backend/Security";

const nameResult = validateByRule(inputName, "INQUIRER_NAME");
if (!nameResult.valid) {
  toast.error(nameResult.reason);
  return;
}
const cleanName = nameResult.sanitizedValue;
```

### 3. Validating Incoming Requests in Express Routes

```typescript
import { validateByRule } from "@/backend/Security";

app.post("/api/chats/save", (req, res) => {
  const labelRes = validateByRule(req.body.chatLabel, "CHAT_LABEL");
  if (!labelRes.valid) {
    return res.status(400).json({
      success: false,
      error: { code: labelRes.code, message: labelRes.reason }
    });
  }
  // Proceed with labelRes.sanitizedValue...
});
```

---

## Performance & Execution Standard

- **Sub-millisecond execution**: All validations execute in < 2ms without heavy CPU overhead or exponential regex backtracking.
- **Fail-safe response object**: Returns standardized `{ valid: boolean, reason?: string, sanitizedValue?: string }` without throwing raw runtime exceptions for normal validation failures.
