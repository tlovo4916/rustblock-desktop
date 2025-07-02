# Secure Storage Migration Guide

## Overview

The application now uses a secure storage utility for handling sensitive data like API keys. This replaces the previous localStorage implementation with encrypted storage.

## Features

### 1. **Encryption Support**
- Uses Web Crypto API for AES-GCM 256-bit encryption when available
- Automatically generates and manages encryption keys
- Falls back to obfuscation if crypto APIs are unavailable

### 2. **Tauri Integration Ready**
- Prepared for integration with Tauri's secure storage APIs
- Graceful fallback to browser storage when Tauri is not available

### 3. **Automatic Migration**
- Automatically migrates existing API keys from localStorage
- Preserves existing functionality while enhancing security

### 4. **TypeScript Support**
- Fully typed interfaces for better developer experience
- Type-safe API key management

## Implementation Details

### Files Modified

1. **`src/utils/secureStorage.ts`** - New secure storage utility
2. **`src/pages/SettingsPage.tsx`** - Updated to use secure storage for API keys
3. **`src/pages/AIPage.tsx`** - Updated to load API keys from secure storage
4. **`src/components/AISidePanel.tsx`** - Updated to use secure storage
5. **`src/pages/EnhancedAIPage.tsx`** - Updated to use secure storage
6. **`src/pages/DebugPage.tsx`** - Updated to use secure storage
7. **`src/test/utils/secureStorage.test.ts`** - Comprehensive test suite
8. **`src/types/tauri-commands.d.ts`** - Type definitions for future Tauri integration

### Usage Examples

```typescript
import { apiKeyStorage } from '../utils/secureStorage';

// Store an API key
await apiKeyStorage.setApiKey('deepseek', 'your-api-key');

// Retrieve an API key
const apiKey = await apiKeyStorage.getApiKey('deepseek');

// Get all API keys
const allKeys = await apiKeyStorage.getAllApiKeys();

// Delete an API key
await apiKeyStorage.deleteApiKey('deepseek');

// Migrate from localStorage (called automatically on first load)
await apiKeyStorage.migrateFromLocalStorage();
```

### Security Considerations

1. **Encryption Key Storage**: The encryption key is stored in localStorage. For enhanced security, consider:
   - Storing the key in Tauri's secure storage
   - Using hardware security modules (HSM)
   - Implementing key rotation policies

2. **Browser Limitations**: Web Crypto API has browser-specific limitations:
   - Not available in insecure contexts (non-HTTPS)
   - May have platform-specific implementations

3. **Fallback Security**: When encryption is unavailable, the utility falls back to base64 obfuscation, which provides minimal security.

## Future Enhancements

### 1. **Tauri Backend Integration**

To enable Tauri secure storage, implement these commands in `src-tauri/src/commands/mod.rs`:

```rust
use tauri::State;
use keyring::Entry;

#[tauri::command]
async fn get_secure_storage(key: &str) -> Result<Option<String>, String> {
    let entry = Entry::new("rustblock", key);
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn set_secure_storage(key: &str, value: &str) -> Result<(), String> {
    let entry = Entry::new("rustblock", key);
    entry.set_password(value).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_secure_storage(key: &str) -> Result<(), String> {
    let entry = Entry::new("rustblock", key);
    entry.delete_password().map_err(|e| e.to_string())
}
```

Add to `Cargo.toml`:
```toml
[dependencies]
keyring = "2.3"
```

### 2. **Key Rotation**

Implement periodic key rotation:

```typescript
async rotateEncryptionKey() {
  // Generate new key
  // Re-encrypt all data with new key
  // Update stored key
}
```

### 3. **Audit Logging**

Add logging for security events:

```typescript
async set(key: string, value: string) {
  await this.init();
  logger.info(`Secure storage: Setting value for key: ${key}`);
  // ... rest of implementation
}
```

## Testing

Run the test suite:

```bash
npm test src/test/utils/secureStorage.test.ts
```

## Rollback Plan

If issues arise, you can temporarily revert to localStorage by:

1. Commenting out the `apiKeyStorage` imports
2. Replacing `apiKeyStorage.getApiKey()` with `localStorage.getItem()`
3. Replacing `apiKeyStorage.setApiKey()` with `localStorage.setItem()`

However, this is not recommended as it reduces security.

## Conclusion

The secure storage implementation provides a significant security improvement while maintaining backward compatibility and preparing for future Tauri integration.