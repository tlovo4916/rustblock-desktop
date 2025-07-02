import { describe, it, expect } from 'vitest';
import {
  validateAIMessage,
  validateApiKey,
  validateUrl,
  sanitizeAIResponse,
  sanitizeHtml,
} from '../../utils/inputValidation';

describe('Input Validation', () => {
  describe('validateAIMessage', () => {
    it('validates empty message', () => {
      const result = validateAIMessage('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message cannot be empty');
    });

    it('validates message length', () => {
      const longMessage = 'a'.repeat(10001);
      const result = validateAIMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message is too long. Maximum length is 10000 characters');
      expect(result.sanitized.length).toBe(10000);
    });

    it('removes control characters', () => {
      const result = validateAIMessage('Hello\x00World\x1F');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('HelloWorld');
    });

    it('sanitizes HTML in message', () => {
      const result = validateAIMessage('Hello <script>alert("xss")</script> World');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('handles SQL injection patterns', () => {
      const result = validateAIMessage('SELECT * FROM users; DROP TABLE users;--');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).not.toContain(';');
      expect(result.sanitized).not.toContain('--');
    });
  });

  describe('validateApiKey', () => {
    it('validates empty API key', () => {
      const result = validateApiKey('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key cannot be empty');
    });

    it('validates API key length', () => {
      const longKey = 'a'.repeat(201);
      const result = validateApiKey(longKey);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('API key is too long. Maximum length is 200 characters');
    });

    it('validates API key format', () => {
      const result = validateApiKey('valid-api-key_123');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('valid-api-key_123');
    });

    it('removes invalid characters from API key', () => {
      const result = validateApiKey('api@key#with$special%chars');
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('apikeywithspecialchars');
    });
  });

  describe('validateUrl', () => {
    it('validates empty URL', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL cannot be empty');
    });

    it('validates URL format', () => {
      const result = validateUrl('https://api.example.com');
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('https://api.example.com');
    });

    it('rejects invalid URL format', () => {
      const result = validateUrl('not a url');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });

    it('only allows HTTP and HTTPS protocols', () => {
      const result = validateUrl('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Only HTTP and HTTPS protocols are allowed');
    });
  });

  describe('sanitizeAIResponse', () => {
    it('removes script tags', () => {
      const result = sanitizeAIResponse('Hello <script>alert("xss")</script> World');
      expect(result).toBe('Hello [SCRIPT REMOVED] World');
    });

    it('removes event handlers', () => {
      const result = sanitizeAIResponse('<div onclick="alert(1)">Click me</div>');
      expect(result).not.toContain('onclick');
    });

    it('removes javascript protocols', () => {
      const result = sanitizeAIResponse('<a href="javascript:alert(1)">Link</a>');
      expect(result).toContain('[JAVASCRIPT REMOVED]');
    });

    it('converts URLs to safe links', () => {
      const result = sanitizeAIResponse('Check out https://example.com');
      expect(result).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">');
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML entities', () => {
      const result = sanitizeHtml('<div>Test & "quotes" \'single\'</div>');
      expect(result).toBe('&lt;div&gt;Test &amp; &quot;quotes&quot; &#x27;single&#x27;&lt;&#x2F;div&gt;');
    });

    it('removes dangerous patterns', () => {
      const result = sanitizeHtml('<script>alert(1)</script><iframe src="evil"></iframe>');
      expect(result).not.toContain('script');
      expect(result).not.toContain('iframe');
    });
  });
});