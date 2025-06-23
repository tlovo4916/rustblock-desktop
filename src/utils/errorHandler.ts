import { message } from 'antd';
import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// 错误代码映射
const errorMessages: Record<string, string> = {
  DEVICE_NOT_FOUND: '未找到设备',
  CONNECTION_FAILED: '连接失败',
  UPLOAD_FAILED: '上传失败',
  COMPILE_FAILED: '编译失败',
  INVALID_CODE: '代码无效',
  PERMISSION_DENIED: '权限被拒绝',
  NETWORK_ERROR: '网络错误',
  UNKNOWN_ERROR: '未知错误',
};

// 统一错误处理函数
export const handleError = (error: any, showMessage: boolean = true): AppError => {
  let appError: AppError;

  if (typeof error === 'string') {
    appError = {
      code: 'UNKNOWN_ERROR',
      message: error,
    };
  } else if (error.code && errorMessages[error.code]) {
    appError = {
      code: error.code,
      message: errorMessages[error.code],
      details: error.details,
    };
  } else if (error.message) {
    appError = {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      details: error,
    };
  } else {
    appError = {
      code: 'UNKNOWN_ERROR',
      message: '发生了一个未知错误',
      details: error,
    };
  }

  // 记录错误
  logger.error('Application error:', appError);

  // 显示错误消息
  if (showMessage) {
    message.error(appError.message);
  }

  return appError;
};

// 创建自定义错误
export const createError = (code: string, details?: any): AppError => {
  return {
    code,
    message: errorMessages[code] || '未知错误',
    details,
  };
};