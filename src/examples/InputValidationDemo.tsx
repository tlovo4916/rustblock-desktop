import React, { useState } from 'react';
import { validateAIMessage, validateApiKey, validateUrl, sanitizeAIResponse } from '../utils/inputValidation';

/**
 * Demo component showing input validation in action
 * This demonstrates how the validation utilities protect against various security threats
 */
const InputValidationDemo: React.FC = () => {
  const [message, setMessage] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [url, setUrl] = useState('https://api.example.com');
  const [aiResponse, setAiResponse] = useState('');
  
  const [messageError, setMessageError] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleMessageSubmit = () => {
    const result = validateAIMessage(message);
    if (!result.isValid) {
      setMessageError(result.errors.join(' '));
    } else {
      setMessageError('');
      alert(`Message is valid! Sanitized: ${result.sanitized}`);
    }
  };

  const handleApiKeySubmit = () => {
    const result = validateApiKey(apiKey);
    if (!result.isValid) {
      setApiKeyError(result.errors.join(' '));
    } else {
      setApiKeyError('');
      alert(`API Key is valid! Sanitized: ${result.sanitized}`);
    }
  };

  const handleUrlSubmit = () => {
    const result = validateUrl(url);
    if (!result.isValid) {
      setUrlError(result.errors.join(' '));
    } else {
      setUrlError('');
      alert(`URL is valid! Sanitized: ${result.sanitized}`);
    }
  };

  const handleAiResponseDemo = () => {
    const dangerousResponse = `
      Here's some code: <script>alert('XSS')</script>
      Click here: <a href="javascript:alert('evil')">Link</a>
      Visit: https://example.com
    `;
    const sanitized = sanitizeAIResponse(dangerousResponse);
    setAiResponse(sanitized);
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1>Input Validation Demo</h1>
      
      <div style={{ marginBottom: 30 }}>
        <h2>AI Message Validation</h2>
        <p>Try entering:</p>
        <ul>
          <li>Normal text</li>
          <li>Text with HTML: {`<script>alert('xss')</script>`}</li>
          <li>SQL injection: SELECT * FROM users; DROP TABLE users;</li>
          <li>Very long text (over 10,000 characters)</li>
        </ul>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message..."
          style={{ width: '100%', height: 100 }}
        />
        {messageError && <div style={{ color: 'red' }}>Error: {messageError}</div>}
        <button onClick={handleMessageSubmit}>Validate Message</button>
      </div>

      <div style={{ marginBottom: 30 }}>
        <h2>API Key Validation</h2>
        <p>Valid format: letters, numbers, hyphens, underscores only</p>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API key..."
          style={{ width: '100%' }}
        />
        {apiKeyError && <div style={{ color: 'red' }}>Error: {apiKeyError}</div>}
        <button onClick={handleApiKeySubmit}>Validate API Key</button>
      </div>

      <div style={{ marginBottom: 30 }}>
        <h2>URL Validation</h2>
        <p>Must be a valid HTTP or HTTPS URL</p>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL..."
          style={{ width: '100%' }}
        />
        {urlError && <div style={{ color: 'red' }}>Error: {urlError}</div>}
        <button onClick={handleUrlSubmit}>Validate URL</button>
      </div>

      <div style={{ marginBottom: 30 }}>
        <h2>AI Response Sanitization</h2>
        <button onClick={handleAiResponseDemo}>Show Sanitized AI Response</button>
        {aiResponse && (
          <div style={{ marginTop: 10, padding: 10, background: '#f0f0f0' }}>
            <h3>Sanitized Response:</h3>
            <div dangerouslySetInnerHTML={{ __html: aiResponse }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default InputValidationDemo;