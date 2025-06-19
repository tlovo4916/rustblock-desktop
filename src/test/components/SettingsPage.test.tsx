import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '@pages/SettingsPage';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.dispatchEvent
const mockDispatchEvent = vi.fn();
Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent,
});

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'deepseek_api_key') return 'existing-key';
      if (key === 'deepseek_api_url') return 'https://api.deepseek.com/v1/chat/completions';
      return null;
    });
  });

  it('renders settings interface', () => {
    render(<SettingsPage />);

    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText('AI 配置')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('API URL')).toBeInTheDocument();
  });

  it('loads existing configuration from localStorage', () => {
    render(<SettingsPage />);

    const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
    const apiUrlInput = screen.getByLabelText('API URL') as HTMLInputElement;

    expect(apiKeyInput.value).toBe('existing-key');
    expect(apiUrlInput.value).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('saves configuration to localStorage when save button is clicked', async () => {
    render(<SettingsPage />);

    const apiKeyInput = screen.getByLabelText('API Key');
    const saveButton = screen.getByText('保存 AI 设置');

    fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('deepseek_api_key', 'new-api-key');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'deepseek_api_url',
        'https://api.deepseek.com/v1/chat/completions'
      );
    });
  });

  it('dispatches custom event when configuration is saved', async () => {
    render(<SettingsPage />);

    const saveButton = screen.getByText('保存 AI 设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-config-updated',
          detail: {
            apiKey: 'existing-key',
            apiUrl: 'https://api.deepseek.com/v1/chat/completions',
          },
        })
      );
    });
  });

  it('validates API key is not empty', () => {
    render(<SettingsPage />);

    const apiKeyInput = screen.getByLabelText('API Key');
    const saveButton = screen.getByText('保存 AI 设置');

    fireEvent.change(apiKeyInput, { target: { value: '' } });
    fireEvent.click(saveButton);

    // Should show validation message or prevent save
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  it('shows success message after saving', async () => {
    render(<SettingsPage />);

    const saveButton = screen.getByText('保存 AI 设置');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/设置已保存/)).toBeInTheDocument();
    });
  });
});
