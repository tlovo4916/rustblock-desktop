import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock DOM methods for testing
beforeAll(() => {
  // Mock window.__TAURI_INTERNALS__
  Object.defineProperty(window, '__TAURI_INTERNALS__', {
    value: {
      invoke: vi.fn(),
      listen: vi.fn(),
      emit: vi.fn(),
    },
    writable: true,
  });

  // Mock scrollIntoView for DOM elements
  Element.prototype.scrollIntoView = vi.fn();

  // Mock @tauri-apps/api
  vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
  }));

  vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: vi.fn(() => ({
      listen: vi.fn(),
      emit: vi.fn(),
    })),
  }));

  vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(),
    emit: vi.fn(),
  }));
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Global test cleanup
afterAll(() => {
  vi.clearAllMocks();
});
