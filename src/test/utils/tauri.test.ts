import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri invoke first
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock logger
vi.mock('@utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { safeInvoke } from '@utils/tauri';
import { invoke } from '@tauri-apps/api/core';
import { logger } from '@utils/logger';

const mockInvoke = vi.mocked(invoke);

describe('safeInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully invokes Tauri command', async () => {
    const mockResponse = { success: true, data: 'test-data' };
    mockInvoke.mockResolvedValueOnce(mockResponse);

    const result = await safeInvoke('test-command', { arg1: 'value1' });

    expect(mockInvoke).toHaveBeenCalledWith('test-command', { arg1: 'value1' });
    expect(result).toEqual(mockResponse);
  });

  it('handles Tauri invoke errors', async () => {
    const mockError = new Error('Tauri command failed');
    mockInvoke.mockRejectedValueOnce(mockError);

    await expect(safeInvoke('failing-command')).rejects.toThrow('Tauri command failed');
  });

  it('logs errors to console', async () => {
    const mockError = new Error('Test error');
    mockInvoke.mockRejectedValueOnce(mockError);

    try {
      await safeInvoke('test-command');
    } catch (error) {
      // Expected to throw
    }

    expect(logger.error).toHaveBeenCalledWith(
      "Tauri invoke error for command 'test-command':",
      mockError
    );
  });

  it('works without arguments', async () => {
    const mockResponse = { data: 'no-args-response' };
    mockInvoke.mockResolvedValueOnce(mockResponse);

    const result = await safeInvoke('no-args-command');

    expect(mockInvoke).toHaveBeenCalledWith('no-args-command', undefined);
    expect(result).toEqual(mockResponse);
  });

  it('preserves response type information', async () => {
    interface TestResponse {
      id: number;
      name: string;
    }

    const mockResponse: TestResponse = { id: 1, name: 'test' };
    mockInvoke.mockResolvedValueOnce(mockResponse);

    const result = await safeInvoke<TestResponse>('typed-command');

    expect(result.id).toBe(1);
    expect(result.name).toBe('test');
  });
});
