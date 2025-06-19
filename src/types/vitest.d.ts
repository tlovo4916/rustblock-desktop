import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> extends jest.Matchers<void>, TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends jest.Expect {}
}

declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void>, TestingLibraryMatchers<T, void> {}
  }
}
