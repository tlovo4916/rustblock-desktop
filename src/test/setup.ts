import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock Ant Design message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      warn: vi.fn(),
      loading: vi.fn(),
      open: vi.fn(),
      destroy: vi.fn(),
      config: vi.fn(),
    },
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Mock crypto
const cryptoMock = {
  subtle: {
    generateKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = vi.fn().mockImplementation(() => ({
  encode: (text: string) => new Uint8Array([...text].map(c => c.charCodeAt(0))),
})) as any;

global.TextDecoder = vi.fn().mockImplementation(() => ({
  decode: (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    return String.fromCharCode(...bytes);
  },
})) as any;

// Mock btoa and atob
global.btoa = (str: string) => Buffer.from(str).toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString();

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

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock crypto
  Object.defineProperty(window, 'crypto', {
    value: cryptoMock,
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
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Global test cleanup
afterAll(() => {
  vi.clearAllMocks();
});
