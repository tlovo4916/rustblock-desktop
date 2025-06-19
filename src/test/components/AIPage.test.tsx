import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri invoke first
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import AIPage from '@pages/AIPage';
import { invoke } from '@tauri-apps/api/core';

const mockInvoke = vi.mocked(invoke);

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AIPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'deepseek_api_key') return 'test-api-key';
      if (key === 'deepseek_api_url') return 'https://api.deepseek.com/v1/chat/completions';
      return null;
    });
  });

  it('renders AI chat interface', () => {
    render(<AIPage />);

    expect(screen.getByText('AI 助手')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入您的问题...')).toBeInTheDocument();
    expect(screen.getByText('发送')).toBeInTheDocument();
  });

  it('displays API configuration warning when no key is set', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<AIPage />);

    expect(screen.getByText(/请先在设置页面配置 API/)).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    mockInvoke.mockResolvedValueOnce({ success: true, data: 'AI response' });

    render(<AIPage />);

    const input = screen.getByPlaceholderText('输入您的问题...');
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('chat_with_deepseek', {
        message: '你好',
        api_key: 'test-api-key',
        api_url: 'https://api.deepseek.com/v1/chat/completions',
      });
    });
  });

  it('displays loading state while AI is thinking', async () => {
    mockInvoke.mockImplementation(
      () =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: 'Response' }), 100))
    );

    render(<AIPage />);

    const input = screen.getByPlaceholderText('输入您的问题...');
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: '测试消息' } });
    fireEvent.click(sendButton);

    expect(screen.getByText('AI正在思考中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('AI正在思考中...')).not.toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockInvoke.mockResolvedValueOnce({ success: false, error: 'API Error' });

    render(<AIPage />);

    const input = screen.getByPlaceholderText('输入您的问题...');
    const sendButton = screen.getByText('发送');

    fireEvent.change(input, { target: { value: '测试消息' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/发送失败/)).toBeInTheDocument();
    });
  });
});
