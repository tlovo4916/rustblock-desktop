import React, { useEffect, useState } from 'react';
import { Badge, Tooltip, Button } from 'antd';
import { useDevice } from '../contexts/DeviceContext';
import { useTranslation } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import DeviceBoardIcon from './DeviceBoardIcon';
import './DeviceStatusIndicator.css';

interface DeviceStatusIndicatorProps {
  onClick?: () => void;
}

export const DeviceStatusIndicator: React.FC<DeviceStatusIndicatorProps> = ({ onClick }) => {
  const { hasAnyConnection, connectedPorts } = useDevice();
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const [isBlinking, setIsBlinking] = useState(!hasAnyConnection);

  useEffect(() => {
    setIsBlinking(!hasAnyConnection);
  }, [hasAnyConnection]);

  const tooltipText = hasAnyConnection 
    ? t('device.connectedDevices', { count: connectedPorts.length })
    : t('device.noConnection');

  return (
    <Tooltip title={tooltipText}>
      <Button
        type="text"
        onClick={onClick}
        className="device-status-indicator"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          height: 'auto',
          background: isDarkMode ? '#262626' : '#f0f0f0',
          border: 'none',
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div
            className={`status-dot ${!hasAnyConnection ? 'blinking' : ''}`}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: hasAnyConnection ? '#52c41a' : '#ff4d4f',
            }}
          />
        </div>
        <DeviceBoardIcon style={{ fontSize: 16 }} />
        <span style={{ fontSize: '14px' }}>{t('device.hardwareDevice')}</span>
      </Button>
    </Tooltip>
  );
};