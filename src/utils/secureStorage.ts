import { safeInvoke } from './tauri';
import { logger } from './logger';

/**
 * Secure storage utility for handling sensitive data like API keys
 * Uses encryption when available, with graceful fallback
 */

interface SecureStorageData {
  [key: string]: string;
}

interface EncryptedData {
  iv: string;
  data: string;
  salt: string;
}

class SecureStorage {
  private readonly STORAGE_KEY = 'rustblock_secure_storage';
  private readonly ENCRYPTION_KEY = 'rustblock_encryption_key';
  private cryptoKey: CryptoKey | null = null;
  private isInitialized = false;

  /**
   * Initialize the secure storage with encryption key
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if Web Crypto API is available
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // Try to get existing key or generate new one
        const storedKey = localStorage.getItem(this.ENCRYPTION_KEY);
        
        if (storedKey) {
          // Import existing key
          const keyData = JSON.parse(storedKey);
          this.cryptoKey = await window.crypto.subtle.importKey(
            'jwk',
            keyData,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
        } else {
          // Generate new key
          this.cryptoKey = await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
          );
          
          // Export and store the key
          const exportedKey = await window.crypto.subtle.exportKey('jwk', this.cryptoKey);
          localStorage.setItem(this.ENCRYPTION_KEY, JSON.stringify(exportedKey));
        }
      }
      
      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize secure storage:', error);
      this.isInitialized = true; // Still mark as initialized to use fallback
    }
  }

  /**
   * Encrypt data using Web Crypto API
   */
  private async encrypt(data: string): Promise<EncryptedData | null> {
    if (!this.cryptoKey || !window.crypto?.subtle) {
      return null;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Generate salt for additional security
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      
      // Encrypt the data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.cryptoKey,
        dataBuffer
      );
      
      return {
        iv: this.arrayBufferToBase64(iv),
        data: this.arrayBufferToBase64(encryptedBuffer),
        salt: this.arrayBufferToBase64(salt)
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      return null;
    }
  }

  /**
   * Decrypt data using Web Crypto API
   */
  private async decrypt(encryptedData: EncryptedData): Promise<string | null> {
    if (!this.cryptoKey || !window.crypto?.subtle) {
      return null;
    }

    try {
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const data = this.base64ToArrayBuffer(encryptedData.data);
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.cryptoKey,
        data
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      logger.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Simple obfuscation as fallback when crypto is not available
   */
  private obfuscate(data: string): string {
    // Simple base64 encoding with reversal for minimal protection
    const reversed = data.split('').reverse().join('');
    return btoa(reversed);
  }

  /**
   * Deobfuscate data
   */
  private deobfuscate(data: string): string {
    try {
      const decoded = atob(data);
      return decoded.split('').reverse().join('');
    } catch {
      return '';
    }
  }

  /**
   * Get all stored data
   */
  private async getAllData(): Promise<SecureStorageData> {
    try {
      // First try to get from Tauri secure storage if available
      const tauriData = await safeInvoke<string | null>('get_secure_storage', {
        key: this.STORAGE_KEY
      });
      
      if (tauriData) {
        return JSON.parse(tauriData);
      }
    } catch (error) {
      // Tauri command not available, use localStorage
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return {};
    }

    try {
      const parsed = JSON.parse(stored);
      
      // Check if it's encrypted data
      if (parsed.encrypted && parsed.data) {
        const decrypted = await this.decrypt(parsed.data);
        if (decrypted) {
          return JSON.parse(decrypted);
        }
      }
      
      // Try deobfuscation as fallback
      if (parsed.obfuscated && parsed.data) {
        const deobfuscated = this.deobfuscate(parsed.data);
        return JSON.parse(deobfuscated);
      }
      
      // Return as-is if not encrypted/obfuscated (for backward compatibility)
      return parsed;
    } catch {
      return {};
    }
  }

  /**
   * Save all data
   */
  private async saveAllData(data: SecureStorageData): Promise<void> {
    const jsonData = JSON.stringify(data);
    
    // Try to encrypt if available
    const encrypted = await this.encrypt(jsonData);
    
    let storageData: string;
    if (encrypted) {
      storageData = JSON.stringify({ encrypted: true, data: encrypted });
    } else {
      // Fallback to obfuscation
      const obfuscated = this.obfuscate(jsonData);
      storageData = JSON.stringify({ obfuscated: true, data: obfuscated });
    }

    try {
      // Try to save to Tauri secure storage
      await safeInvoke('set_secure_storage', {
        key: this.STORAGE_KEY,
        value: storageData
      });
    } catch {
      // Fallback to localStorage
      localStorage.setItem(this.STORAGE_KEY, storageData);
    }
  }

  /**
   * Get a secure value
   */
  async get(key: string): Promise<string | null> {
    await this.init();
    
    try {
      const data = await this.getAllData();
      return data[key] || null;
    } catch (error) {
      logger.error(`Failed to get secure value for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a secure value
   */
  async set(key: string, value: string): Promise<void> {
    await this.init();
    
    try {
      const data = await this.getAllData();
      data[key] = value;
      await this.saveAllData(data);
    } catch (error) {
      logger.error(`Failed to set secure value for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a secure value
   */
  async delete(key: string): Promise<void> {
    await this.init();
    
    try {
      const data = await this.getAllData();
      delete data[key];
      await this.saveAllData(data);
    } catch (error) {
      logger.error(`Failed to delete secure value for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all secure storage
   */
  async clear(): Promise<void> {
    try {
      // Try to clear Tauri secure storage
      await safeInvoke('delete_secure_storage', {
        key: this.STORAGE_KEY
      });
    } catch {
      // Fallback to localStorage
      localStorage.removeItem(this.STORAGE_KEY);
    }
    
    // Also clear the encryption key
    localStorage.removeItem(this.ENCRYPTION_KEY);
    this.cryptoKey = null;
    this.isInitialized = false;
  }

  /**
   * Check if a key exists
   */
  async has(key: string): Promise<boolean> {
    await this.init();
    
    try {
      const data = await this.getAllData();
      return key in data;
    } catch {
      return false;
    }
  }

  /**
   * Get all keys
   */
  async keys(): Promise<string[]> {
    await this.init();
    
    try {
      const data = await this.getAllData();
      return Object.keys(data);
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export types
export type { SecureStorageData, EncryptedData };

// Helper functions for API key management
export const apiKeyStorage = {
  /**
   * Get API key for a specific provider
   */
  async getApiKey(provider: 'deepseek' | 'openai'): Promise<string | null> {
    return secureStorage.get(`${provider}_api_key`);
  },

  /**
   * Set API key for a specific provider
   */
  async setApiKey(provider: 'deepseek' | 'openai', apiKey: string): Promise<void> {
    await secureStorage.set(`${provider}_api_key`, apiKey);
  },

  /**
   * Delete API key for a specific provider
   */
  async deleteApiKey(provider: 'deepseek' | 'openai'): Promise<void> {
    await secureStorage.delete(`${provider}_api_key`);
  },

  /**
   * Get all stored API keys
   */
  async getAllApiKeys(): Promise<Record<string, string>> {
    const keys: Record<string, string> = {};
    
    const deepseekKey = await this.getApiKey('deepseek');
    const openaiKey = await this.getApiKey('openai');
    
    if (deepseekKey) keys.deepseek = deepseekKey;
    if (openaiKey) keys.openai = openaiKey;
    
    return keys;
  },

  /**
   * Migrate from localStorage to secure storage
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Get existing keys from localStorage
      const deepseekKey = localStorage.getItem('deepseek_api_key');
      const openaiKey = localStorage.getItem('openai_api_key');
      
      // Migrate if found
      if (deepseekKey) {
        await this.setApiKey('deepseek', deepseekKey);
        localStorage.removeItem('deepseek_api_key');
        logger.info('Migrated DeepSeek API key to secure storage');
      }
      
      if (openaiKey) {
        await this.setApiKey('openai', openaiKey);
        localStorage.removeItem('openai_api_key');
        logger.info('Migrated OpenAI API key to secure storage');
      }
    } catch (error) {
      logger.error('Failed to migrate API keys:', error);
    }
  }
};