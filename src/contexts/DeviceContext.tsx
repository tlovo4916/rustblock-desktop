import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { message } from 'antd';

interface DeviceContextType {
  connectedPorts: string[];
  isConnecting: boolean;
  connectDevice: (port: string, baudRate: number) => Promise<void>;
  disconnectDevice: (port: string) => Promise<void>;
  isDeviceConnected: (port: string) => boolean;
  hasAnyConnection: boolean;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectedPorts, setConnectedPorts] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectDevice = useCallback(async (port: string, baudRate: number) => {
    setIsConnecting(true);
    try {
      await invoke('connect_serial', { port, baudRate });
      setConnectedPorts(prev => [...prev, port]);
      message.success(`设备已连接: ${port}`);
    } catch (error) {
      console.error('Failed to connect device:', error);
      message.error(`连接失败: ${error}`);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectDevice = useCallback(async (port: string) => {
    try {
      await invoke('disconnect_serial', { port });
      setConnectedPorts(prev => prev.filter(p => p !== port));
      message.success(`设备已断开: ${port}`);
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      message.error(`断开连接失败: ${error}`);
      throw error;
    }
  }, []);

  const isDeviceConnected = useCallback((port: string) => {
    return connectedPorts.includes(port);
  }, [connectedPorts]);

  const hasAnyConnection = connectedPorts.length > 0;

  // Check connected devices on mount
  useEffect(() => {
    const checkConnectedDevices = async () => {
      try {
        const ports = await invoke<string[]>('get_connected_ports');
        setConnectedPorts(ports || []);
      } catch (error) {
        console.error('Failed to get connected ports:', error);
      }
    };
    
    checkConnectedDevices();
  }, []);

  return (
    <DeviceContext.Provider
      value={{
        connectedPorts,
        isConnecting,
        connectDevice,
        disconnectDevice,
        isDeviceConnected,
        hasAnyConnection
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};