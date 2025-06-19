import { invoke as tauriInvoke } from '@tauri-apps/api/core';

// 安全的 invoke 包装器
export async function safeInvoke<T = any>(
  cmd: string,
  args?: Record<string, any>
): Promise<T> {
  try {
    // 直接尝试调用，让 Tauri API 自己处理错误
    return await tauriInvoke<T>(cmd, args);
  } catch (error) {
    console.error(`Tauri invoke error for command '${cmd}':`, error);
    throw error;
  }
}

// 检查是否在 Tauri 环境中
export function isTauri(): boolean {
  try {
    // 尝试访问 Tauri API
    return typeof tauriInvoke !== 'undefined';
  } catch {
    return false;
  }
}