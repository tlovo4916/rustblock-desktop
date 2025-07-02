import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import SettingsPage from '@pages/SettingsPage';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock Tauri API
vi.mock('@tauri-apps/api/core');

// Mock apiKeyStorage
vi.mock('../../utils/secureStorage', () => ({
  apiKeyStorage: {
    getAllApiKeys: vi.fn(() => Promise.resolve({ deepseek: 'existing-key', openai: '' })),
    setApiKey: vi.fn(() => Promise.resolve()),
    getApiKey: vi.fn((provider: string) => Promise.resolve(provider === 'deepseek' ? 'existing-key' : '')),
    deleteApiKey: vi.fn(() => Promise.resolve()),
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
  safeInvoke: vi.fn(() => Promise.resolve(null)),
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
  validateApiKey: vi.fn((key: string) => ({
    isValid: key.length > 0,
    sanitized: key,
    errors: key.length === 0 ? ['API key is required'] : [],
  })),
  validateUrl: vi.fn((url: string) => ({
    isValid: true,
    sanitized: url,
    errors: [],
  })),
}));

// Store original dispatchEvent
const originalDispatchEvent = window.dispatchEvent;
const mockDispatchEvent = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <LocaleProvider>{ui}</LocaleProvider>
    </ThemeProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup localStorage mock behavior
    (window.localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === 'ai_model') return 'deepseek-chat';
      if (key === 'ai_api_url') return 'https://api.deepseek.com';
      return null;
    });
    // Mock window.dispatchEvent
    window.dispatchEvent = mockDispatchEvent;
  });

  afterEach(() => {
    // Restore original dispatchEvent
    window.dispatchEvent = originalDispatchEvent;
  });

  it('renders settings interface', async () => {
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('应用设置')).toBeInTheDocument();
      expect(screen.getByText('🤖 AI助手配置')).toBeInTheDocument();
      expect(screen.getByText('API密钥:')).toBeInTheDocument();
      expect(screen.getByText('API URL:')).toBeInTheDocument();
    });
  });

  it('loads existing configuration from localStorage', async () => {
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText('输入你的 API 密钥...') as HTMLInputElement;
      const apiUrlInput = screen.getByDisplayValue('https://api.deepseek.com') as HTMLInputElement;

      expect(apiKeyInput.value).toBe('existing-key');
      expect(apiUrlInput.value).toBe('https://api.deepseek.com');
    });
  });

  it('saves configuration to localStorage when save button is clicked', async () => {
    const { apiKeyStorage } = await import('../../utils/secureStorage');
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText('输入你的 API 密钥...');
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
    });

    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiKeyStorage.setApiKey).toHaveBeenCalledWith('deepseek', 'new-api-key');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('ai_model', 'deepseek-chat');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('ai_api_url', 'https://api.deepseek.com');
    });
  });

  it('dispatches custom event when configuration is saved', async () => {
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-config-updated',
          detail: expect.objectContaining({
            apiKey: 'existing-key',
            apiUrl: 'https://api.deepseek.com',
            model: 'deepseek-chat',
          }),
        })
      );
    });
  });

  it('validates API key is not empty', async () => {
    // Mock the message.error function to capture the call
    const { message } = await import('antd');
    const mockError = vi.mocked(message.error);
    
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      const apiKeyInput = screen.getByPlaceholderText('输入你的 API 密钥...');
      fireEvent.change(apiKeyInput, { target: { value: '' } });
    });

    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);

    // Should show validation message via antd message
    await waitFor(() => {
      expect(mockError).toHaveBeenCalled();
    });
  });

  it('shows success message after saving', async () => {
    // Mock the message.success function to capture the call
    const { message } = await import('antd');
    const mockSuccess = vi.mocked(message.success);
    
    renderWithProviders(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('保存配置')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('保存配置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalled();
    });
  });
});
