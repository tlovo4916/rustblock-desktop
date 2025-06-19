// Global type definitions for the Rustblock Desktop application

declare global {
  // Environment variables
  const __APP_VERSION__: string;
  const __BUILD_TIME__: string;

  // Window extensions
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
      listen: (event: string, handler: (event: any) => void) => Promise<() => void>;
      emit: (event: string, payload?: any) => Promise<void>;
    };
  }

  // Custom events
  interface CustomEventMap {
    'ai-config-updated': CustomEvent<{
      apiKey: string;
      apiUrl: string;
    }>;
  }

  // Extend WindowEventMap
  interface WindowEventMap extends CustomEventMap {}
}

// Device types
export interface DeviceInfo {
  id: string;
  name: string;
  port: string;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  connected: boolean;
}

export interface DeviceProfile {
  id: string;
  name: string;
  board_type: string;
  chip: string;
  frequency: number;
  flash_size: string;
  ram_size: string;
  voltage: string;
  description?: string;
  pins?: PinInfo[];
}

export interface PinInfo {
  number: number;
  name: string;
  type: 'digital' | 'analog' | 'pwm' | 'i2c' | 'spi' | 'uart';
  description?: string;
}

// AI Configuration
export interface AIConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Code validation
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  type: string;
}

// Performance monitoring
export interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  temperature?: number;
  timestamp: number;
}

// Tauri command responses
export interface TauriResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Learning path types
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  codeExample?: string;
  completed: boolean;
}

// Project template types
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  files: TemplateFile[];
  requirements: string[];
}

export interface TemplateFile {
  path: string;
  content: string;
  type: 'code' | 'config' | 'doc';
}

export {};
