import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Alert, Button } from 'antd';
import { useTranslation } from '../contexts/LocaleContext';

interface DeviceOperationErrorBoundaryProps {
  children: React.ReactNode;
  operationName?: string;
}

const DeviceOperationErrorBoundary: React.FC<DeviceOperationErrorBoundaryProps> = ({ 
  children, 
  operationName = 'device operation' 
}) => {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      isolate
      fallback={
        <Alert
          message={`${operationName} 操作失败`}
          description="设备操作遇到错误，可能是由于设备连接问题或驱动问题。请检查设备连接并重试。"
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      }
      onError={(error, errorInfo) => {
        console.error(`Device operation error in ${operationName}:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default DeviceOperationErrorBoundary;