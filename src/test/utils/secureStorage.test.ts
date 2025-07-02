import { describe, it, expect, beforeEach, vi } from 'vitest';
import { secureStorage, apiKeyStorage } from '../../utils/secureStorage';

// Mock Tauri utils
vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(() => Promise.reject(new Error('Tauri not available in tests'))),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SecureStorage', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageStore = {};
    
    // Setup localStorage mock behavior
    (window.localStorage.getItem as any).mockImplementation((key: string) => localStorageStore[key] || null);
    (window.localStorage.setItem as any).mockImplementation((key: string, value: string) => {
      localStorageStore[key] = value;
    });
    (window.localStorage.removeItem as any).mockImplementation((key: string) => {
      delete localStorageStore[key];
    });
    (window.localStorage.clear as any).mockImplementation(() => {
      localStorageStore = {};
    });
    
    // Reset secure storage state
    (secureStorage as any).isInitialized = false;
    (secureStorage as any).cryptoKey = null;
    
    // Initialize secure storage
    await secureStorage.init();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values with fallback obfuscation', async () => {
      // Setup crypto to fail
      (window.crypto.subtle.generateKey as any).mockRejectedValue(new Error('Crypto not available'));
      
      await secureStorage.set('test-key', 'test-value');
      const value = await secureStorage.get('test-key');
      
      expect(value).toBe('test-value');
    });

    it('should delete values', async () => {
      await secureStorage.set('test-key', 'test-value');
      await secureStorage.delete('test-key');
      
      const value = await secureStorage.get('test-key');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await secureStorage.set('test-key', 'test-value');
      
      expect(await secureStorage.has('test-key')).toBe(true);
      expect(await secureStorage.has('non-existent')).toBe(false);
    });

    it('should list all keys', async () => {
      await secureStorage.set('key1', 'value1');
      await secureStorage.set('key2', 'value2');
      
      const keys = await secureStorage.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all storage', async () => {
      await secureStorage.set('key1', 'value1');
      await secureStorage.set('key2', 'value2');
      
      await secureStorage.clear();
      
      expect(await secureStorage.keys()).toHaveLength(0);
    });
  });

  describe('Encryption', () => {
    it('should use encryption when Web Crypto API is available', async () => {
      const mockKey = { type: 'secret' };
      const mockExportedKey = { kty: 'oct', k: 'test-key' };
      const mockEncryptedData = new ArrayBuffer(32);
      
      // Reset secure storage to force reinit
      (secureStorage as any).isInitialized = false;
      (secureStorage as any).cryptoKey = null;
      
      (window.crypto.subtle.generateKey as any).mockResolvedValue(mockKey);
      (window.crypto.subtle.exportKey as any).mockResolvedValue(mockExportedKey);
      (window.crypto.subtle.encrypt as any).mockResolvedValue(mockEncryptedData);
      (window.crypto.subtle.decrypt as any).mockResolvedValue(new TextEncoder().encode('test-value').buffer);
      
      await secureStorage.set('test-key', 'test-value');
      
      expect(window.crypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      expect(window.crypto.subtle.encrypt).toHaveBeenCalled();
    });

    it('should import existing encryption key', async () => {
      const mockKey = { type: 'secret' };
      const mockExportedKey = { kty: 'oct', k: 'existing-key' };
      
      // Reset secure storage to force reinit
      (secureStorage as any).isInitialized = false;
      (secureStorage as any).cryptoKey = null;
      
      // Pre-store an encryption key
      localStorageStore['rustblock_encryption_key'] = JSON.stringify(mockExportedKey);
      
      (window.crypto.subtle.importKey as any).mockResolvedValue(mockKey);
      (window.crypto.subtle.encrypt as any).mockResolvedValue(new ArrayBuffer(32));
      
      await secureStorage.set('test-key', 'test-value');
      
      expect(window.crypto.subtle.importKey).toHaveBeenCalledWith(
        'jwk',
        mockExportedKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      expect(window.crypto.subtle.generateKey).not.toHaveBeenCalled();
    });
  });
});

describe('API Key Storage', () => {
  let localStorageStore: Record<string, string> = {};

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageStore = {};
    
    // Setup localStorage mock behavior
    (window.localStorage.getItem as any).mockImplementation((key: string) => localStorageStore[key] || null);
    (window.localStorage.setItem as any).mockImplementation((key: string, value: string) => {
      localStorageStore[key] = value;
    });
    (window.localStorage.removeItem as any).mockImplementation((key: string) => {
      delete localStorageStore[key];
    });
    (window.localStorage.clear as any).mockImplementation(() => {
      localStorageStore = {};
    });
    
    // Reset secure storage state
    (secureStorage as any).isInitialized = false;
    (secureStorage as any).cryptoKey = null;
    
    // Setup crypto to fail (use fallback obfuscation)
    (window.crypto.subtle.generateKey as any).mockRejectedValue(new Error('Crypto not available'));
    
    // Initialize secure storage
    await secureStorage.init();
  });

  it('should store and retrieve API keys', async () => {
    await apiKeyStorage.setApiKey('deepseek', 'test-deepseek-key');
    await apiKeyStorage.setApiKey('openai', 'test-openai-key');
    
    expect(await apiKeyStorage.getApiKey('deepseek')).toBe('test-deepseek-key');
    expect(await apiKeyStorage.getApiKey('openai')).toBe('test-openai-key');
  });

  it('should delete API keys', async () => {
    await apiKeyStorage.setApiKey('deepseek', 'test-key');
    await apiKeyStorage.deleteApiKey('deepseek');
    
    expect(await apiKeyStorage.getApiKey('deepseek')).toBeNull();
  });

  it('should get all API keys', async () => {
    await apiKeyStorage.setApiKey('deepseek', 'deepseek-key');
    await apiKeyStorage.setApiKey('openai', 'openai-key');
    
    const allKeys = await apiKeyStorage.getAllApiKeys();
    
    expect(allKeys).toEqual({
      deepseek: 'deepseek-key',
      openai: 'openai-key',
    });
  });

  it('should migrate API keys from localStorage', async () => {
    // Pre-populate localStorage with old keys
    localStorageStore['deepseek_api_key'] = 'old-deepseek-key';
    localStorageStore['openai_api_key'] = 'old-openai-key';
    
    await apiKeyStorage.migrateFromLocalStorage();
    
    // Check that keys were migrated
    expect(await apiKeyStorage.getApiKey('deepseek')).toBe('old-deepseek-key');
    expect(await apiKeyStorage.getApiKey('openai')).toBe('old-openai-key');
    
    // Check that old keys were removed from localStorage
    expect(window.localStorage.getItem('deepseek_api_key')).toBeNull();
    expect(window.localStorage.getItem('openai_api_key')).toBeNull();
  });

  it('should handle migration errors gracefully', async () => {
    // Make secureStorage.set throw an error
    vi.spyOn(secureStorage, 'set').mockRejectedValue(new Error('Storage error'));
    
    localStorageStore['deepseek_api_key'] = 'test-key';
    
    // Should not throw
    await expect(apiKeyStorage.migrateFromLocalStorage()).resolves.not.toThrow();
    
    // Old key should still be in localStorage since migration failed
    expect(window.localStorage.getItem('deepseek_api_key')).toBe('test-key');
  });
});