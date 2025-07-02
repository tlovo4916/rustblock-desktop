/**
 * Type definitions for Tauri commands related to secure storage
 * These commands would need to be implemented in the Rust backend
 */

declare module '@tauri-apps/api/tauri' {
  export interface TauriCommands {
    /**
     * Get a value from secure storage
     * @param key The key to retrieve
     * @returns The encrypted value or null if not found
     */
    get_secure_storage: (args: { key: string }) => Promise<string | null>;

    /**
     * Set a value in secure storage
     * @param key The key to store
     * @param value The value to encrypt and store
     */
    set_secure_storage: (args: { key: string; value: string }) => Promise<void>;

    /**
     * Delete a value from secure storage
     * @param key The key to delete
     */
    delete_secure_storage: (args: { key: string }) => Promise<void>;

    /**
     * Check if secure storage is available and properly configured
     */
    check_secure_storage: () => Promise<boolean>;
  }
}