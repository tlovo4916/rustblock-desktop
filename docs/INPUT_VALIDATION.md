# Input Validation Documentation

## Overview

This document describes the input validation and sanitization implementation for AI-related components in the RustBlock Desktop application.

## Validation Utilities

The validation utilities are located in `src/utils/inputValidation.ts` and provide the following functions:

### 1. `validateAIMessage(input: string): ValidationResult`

Validates and sanitizes user messages before sending to AI:
- Checks for empty messages
- Enforces maximum length (10,000 characters)
- Removes control characters
- Detects and sanitizes SQL injection patterns
- Sanitizes HTML content to prevent XSS

### 2. `validateApiKey(key: string): ValidationResult`

Validates API key format:
- Checks for empty keys
- Enforces maximum length (200 characters)
- Ensures only alphanumeric characters, hyphens, and underscores
- Removes invalid characters

### 3. `validateUrl(url: string): ValidationResult`

Validates URL format:
- Checks for empty URLs
- Validates proper URL format
- Only allows HTTP and HTTPS protocols
- Prevents localhost URLs in production

### 4. `sanitizeAIResponse(response: string): string`

Sanitizes AI responses before display:
- Removes script tags
- Removes event handlers
- Removes javascript: protocols
- Converts plain URLs to safe links

### 5. `sanitizeHtml(input: string): string`

General HTML sanitization:
- Escapes HTML entities
- Removes dangerous patterns (scripts, iframes, etc.)

## Implementation in Components

### AIPage.tsx

```typescript
// Validate user input before sending
const validationResult = validateAIMessage(inputValue);
if (!validationResult.isValid) {
  setInputError(validationResult.errors.join(' '));
  message.error(validationResult.errors.join(' '));
  return;
}

// Sanitize AI response before display
const sanitizedResponse = sanitizeAIResponse(response);
```

### SettingsPage.tsx

```typescript
// Validate API key
const apiKeyValidation = validateApiKey(apiKey);
if (!apiKeyValidation.isValid) {
  message.error(apiKeyValidation.errors.join(' '));
  return;
}

// Validate API URL
const urlValidation = validateUrl(apiUrl);
if (!urlValidation.isValid) {
  message.error(urlValidation.errors.join(' '));
  return;
}
```

### AISidePanel.tsx

Similar validation is applied in the AI side panel component for both user messages and AI responses.

## Security Considerations

1. **XSS Prevention**: All user input and AI responses are sanitized to prevent script injection
2. **SQL Injection**: Basic SQL patterns are detected and removed from user messages
3. **API Key Security**: API keys are validated for format and stored securely
4. **URL Validation**: Only safe protocols are allowed to prevent protocol-based attacks

## Error Handling

Validation errors are displayed to users in two ways:
1. **Inline error messages**: Red error text appears below input fields
2. **Toast messages**: Ant Design message component shows validation errors

## Testing

Comprehensive tests are provided in `src/test/utils/inputValidation.test.ts` covering:
- Empty input validation
- Length validation
- Character sanitization
- HTML/script removal
- URL format validation
- API key format validation

## Example Usage

See `src/examples/InputValidationDemo.tsx` for a working demonstration of all validation functions.

## Best Practices

1. Always validate user input before sending to AI
2. Always sanitize AI responses before displaying
3. Show clear error messages to users
4. Log validation failures for monitoring
5. Keep validation rules updated with security best practices