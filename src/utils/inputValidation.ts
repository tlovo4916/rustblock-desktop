// Input validation and sanitization utilities

const MAX_MESSAGE_LENGTH = 10000;
const MAX_API_KEY_LENGTH = 200;
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // Event handlers like onclick=
  /<embed[^>]*>/gi,
  /<object[^>]*>/gi,
];

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
}

/**
 * Sanitize HTML content by removing dangerous patterns
 */
export function sanitizeHtml(input: string): string {
  let sanitized = input;
  
  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Escape HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

/**
 * Validate and sanitize AI message input
 */
export function validateAIMessage(input: string): ValidationResult {
  const errors: string[] = [];
  let sanitized = input.trim();
  
  // Check if empty
  if (!sanitized) {
    errors.push('Message cannot be empty');
    return { isValid: false, sanitized: '', errors };
  }
  
  // Check length
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    errors.push(`Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters`);
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
  }
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Check for SQL injection patterns (basic check)
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|table|database)\b)/i,
    /(;|--|\||\\)/g
  ];
  
  let hasSqlPattern = false;
  sqlPatterns.forEach(pattern => {
    if (pattern.test(sanitized)) {
      hasSqlPattern = true;
    }
  });
  
  if (hasSqlPattern) {
    // Remove suspicious SQL-like patterns
    sanitized = sanitized.replace(/[;|\\]/g, '');
    sanitized = sanitized.replace(/--/g, '');
  }
  
  // Sanitize HTML if needed
  if (/<[^>]*>/.test(sanitized)) {
    sanitized = sanitizeHtml(sanitized);
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validate API key format
 */
export function validateApiKey(key: string): ValidationResult {
  const errors: string[] = [];
  let sanitized = key.trim();
  
  if (!sanitized) {
    errors.push('API key cannot be empty');
    return { isValid: false, sanitized: '', errors };
  }
  
  if (sanitized.length > MAX_API_KEY_LENGTH) {
    errors.push(`API key is too long. Maximum length is ${MAX_API_KEY_LENGTH} characters`);
    return { isValid: false, sanitized, errors };
  }
  
  // Check for valid API key format (alphanumeric, hyphens, underscores)
  const apiKeyPattern = /^[a-zA-Z0-9_\-]+$/;
  if (!apiKeyPattern.test(sanitized)) {
    errors.push('API key contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed');
  }
  
  // Remove any non-allowed characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-]/g, '');
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];
  let sanitized = url.trim();
  
  if (!sanitized) {
    errors.push('URL cannot be empty');
    return { isValid: false, sanitized: '', errors };
  }
  
  try {
    const urlObj = new URL(sanitized);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS protocols are allowed');
    }
    
    // Check for localhost in production
    if (process.env.NODE_ENV === 'production' && 
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
      errors.push('Localhost URLs are not allowed in production');
    }
    
  } catch (e) {
    errors.push('Invalid URL format');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Sanitize AI response content before display
 */
export function sanitizeAIResponse(response: string): string {
  // Remove any executable code patterns
  let sanitized = response;
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '[SCRIPT REMOVED]');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '[JAVASCRIPT REMOVED]');
  
  // Convert URLs to safe links (optional)
  // This is a simple example - in production you might want more sophisticated URL handling
  sanitized = sanitized.replace(
    /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  return sanitized;
}

/**
 * Validate model name
 */
export function validateModelName(model: string): ValidationResult {
  const errors: string[] = [];
  let sanitized = model.trim();
  
  if (!sanitized) {
    errors.push('Model name cannot be empty');
    return { isValid: false, sanitized: '', errors };
  }
  
  // Allow alphanumeric, hyphens, underscores, dots, and forward slashes
  const modelPattern = /^[a-zA-Z0-9_\-\.\/]+$/;
  if (!modelPattern.test(sanitized)) {
    errors.push('Model name contains invalid characters');
  }
  
  // Remove any non-allowed characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-\.\/]/g, '');
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}