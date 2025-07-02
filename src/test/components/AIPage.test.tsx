import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import AIPage from '@pages/AIPage';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock Tauri API
vi.mock('@tauri-apps/api/core');
import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

// Mock apiKeyStorage
vi.mock('../../utils/secureStorage', () => ({
  apiKeyStorage: {
    getAllApiKeys: vi.fn(() => Promise.resolve({ deepseek: 'test-api-key', openai: '' })),
    setApiKey: vi.fn(() => Promise.resolve()),
    migrateFromLocalStorage: vi.fn(() => Promise.resolve()),
  },
  secureStorage: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    has: vi.fn(),
    keys: vi.fn(),
    init: vi.fn(),
  },
}));

// Mock other utilities
vi.mock('../../utils/tauri', () => ({
  safeInvoke: vi.fn(() => Promise.resolve({ success: true, data: 'AI response' })),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/inputValidation', () => ({
  validateAIMessage: vi.fn((message: string) => ({
    isValid: true,
    sanitized: message,
    errors: [],
  })),
  sanitizeAIResponse: vi.fn((response: string) => response),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <LocaleProvider>{ui}</LocaleProvider>
    </ThemeProvider>
  );
};

describe('AIPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup localStorage mock behavior
    (window.localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === 'ai_model') return 'deepseek-chat';
      if (key === 'ai_api_url') return 'https://api.deepseek.com';
      return null;
    });
  });

  it('renders AI chat interface', async () => {
    renderWithProviders(<AIPage />);

    await waitFor(() => {
      expect(screen.getByText('AI编程助手')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('给小派提问题吧~')).toBeInTheDocument();
      expect(screen.getByText('发送')).toBeInTheDocument();
    });
  });

  it('displays API configuration warning when no key is set', async () => {
    // Mock empty API keys
    const { apiKeyStorage } = await import('../../utils/secureStorage');
    vi.mocked(apiKeyStorage.getAllApiKeys).mockResolvedValue({});

    renderWithProviders(<AIPage />);

    await waitFor(() => {
      expect(screen.getByText(/请先在设置页面配置 API/)).toBeInTheDocument();
    });
  });

  it('sends message when form is submitted', async () => {
    const { safeInvoke } = await import('../../utils/tauri');
    vi.mocked(safeInvoke).mockResolvedValueOnce('AI response');

    renderWithProviders(<AIPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('给小派提问题吧~')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('给小派提问题吧~');
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(safeInvoke).toHaveBeenCalledWith('chat_with_ai_generic', {
        messages: expect.any(Array),
        apiKey: 'test-api-key',
        apiUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
      });
    });
  });

  it('displays loading state while AI is thinking', async () => {
    const { safeInvoke } = await import('../../utils/tauri');
    vi.mocked(safeInvoke).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('Response'), 100))
    );

    renderWithProviders(<AIPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('给小派提问题吧~')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('给小派提问题吧~');
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: '测试消息' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('AI正在思考中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('AI正在思考中...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles API errors gracefully', async () => {
    const { safeInvoke } = await import('../../utils/tauri');
    vi.mocked(safeInvoke).mockRejectedValueOnce(new Error('API Error'));

    renderWithProviders(<AIPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('给小派提问题吧~')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('给小派提问题吧~');
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: '测试消息' } });
    fireEvent.click(sendButton);

    // Wait for error message to appear - the exact text depends on locale
    await waitFor(() => {
      // Check for any element containing error-related text
      const errorElements = screen.queryAllByText(/发送失败|Error|错误/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });
});
