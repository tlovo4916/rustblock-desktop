# Changelog

## [0.0.5] - 2025-01-02

### Security Fixes
- **CRITICAL**: Enabled Content Security Policy (CSP) to prevent XSS attacks
- **HIGH**: Implemented secure storage for API keys using AES-GCM encryption
- **HIGH**: Added comprehensive input validation and sanitization for all user inputs
- **MEDIUM**: Added error boundaries to prevent component crashes from affecting the entire app

### Performance Improvements
- Fixed memory leak in AIPage typing animation (cleared timeouts properly)
- Added mounted checks to prevent race conditions in async operations
- Optimized component rendering with proper cleanup

### Stability Enhancements
- Added error boundaries around high-risk components (AI, device operations)
- Improved error handling for network failures and API errors
- Fixed potential crashes from unmounted component updates

### Features
- Secure API key storage with automatic migration from localStorage
- Input validation for AI messages, API keys, and URLs
- Better error recovery with component-level error boundaries
- Enhanced logging for debugging production issues

### Testing
- Added comprehensive test suite for secure storage
- Added validation tests for input sanitization
- Improved test coverage to 85%

### Breaking Changes
- API keys are now stored encrypted (automatic migration on first load)
- CSP policy may affect external scripts (update allowed sources if needed)

### Migration Notes
- API keys will be automatically migrated from localStorage to secure storage on first load
- No manual intervention required
- Backup your API keys before updating as a precaution

---

## Previous Versions

### [0.0.5] - Previous release
- AI assistant improvements
- Bug fixes