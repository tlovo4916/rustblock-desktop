use anyhow::{Result, anyhow};
use serialport::SerialPort;
use std::io::{Read, Write};
use std::time::Duration;
use log::{info, debug};

pub struct SerialConnection {
    port: Box<dyn SerialPort>,
    port_name: String,
    baud_rate: u32,
}

impl SerialConnection {
    /// 打开串口连接
    pub fn open(port_name: &str, baud_rate: u32) -> Result<Self> {
        info!("尝试打开串口: {} (波特率: {})", port_name, baud_rate);
        
        let port = serialport::new(port_name, baud_rate)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| anyhow!("打开串口失败 {}: {}", port_name, e))?;
        
        info!("串口连接成功: {}", port_name);
        Ok(Self {
            port,
            port_name: port_name.to_string(),
            baud_rate,
        })
    }
    
    /// 发送数据
    pub fn write(&mut self, data: &[u8]) -> Result<usize> {
        debug!("发送数据到 {}: {} bytes", self.port_name, data.len());
        
        self.port.write(data)
            .map_err(|e| anyhow!("串口写入失败: {}", e))
    }
    
    /// 发送字符串
    pub fn write_string(&mut self, text: &str) -> Result<usize> {
        self.write(text.as_bytes())
    }
    
    /// 读取数据
    pub fn read(&mut self, buffer: &mut [u8]) -> Result<usize> {
        self.port.read(buffer)
            .map_err(|e| anyhow!("串口读取失败: {}", e))
    }
    
    /// 读取字符串（直到换行符或超时）
    pub fn read_line(&mut self, timeout_ms: u64) -> Result<String> {
        let mut buffer = Vec::new();
        let mut single_byte = [0u8; 1];
        let start_time = std::time::Instant::now();
        
        loop {
            if start_time.elapsed().as_millis() > timeout_ms as u128 {
                break;
            }
            
            match self.port.read(&mut single_byte) {
                Ok(1) => {
                    let byte = single_byte[0];
                    if byte == b'\n' || byte == b'\r' {
                        if !buffer.is_empty() {
                            break;
                        }
                    } else {
                        buffer.push(byte);
                    }
                },
                Ok(_) => {}, // 没有读取到数据，继续
                Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    // 超时是正常的，继续尝试
                    std::thread::sleep(Duration::from_millis(10));
                },
                Err(e) => {
                    return Err(anyhow!("读取串口数据失败: {}", e));
                }
            }
        }
        
        String::from_utf8(buffer)
            .map_err(|e| anyhow!("串口数据不是有效的UTF-8: {}", e))
    }
    
    /// 清空输入缓冲区
    pub fn flush_input(&mut self) -> Result<()> {
        let mut buffer = [0u8; 1024];
        while let Ok(_) = self.port.read(&mut buffer) {
            // 继续读取直到没有数据
        }
        Ok(())
    }
    
    /// 清空输出缓冲区
    pub fn flush_output(&mut self) -> Result<()> {
        self.port.flush()
            .map_err(|e| anyhow!("刷新串口输出缓冲区失败: {}", e))
    }
    
    /// 设置RTS和DTR信号（用于重置某些设备）
    pub fn reset_device(&mut self) -> Result<()> {
        info!("重置设备: {}", self.port_name);
        
        // 拉低DTR和RTS
        self.port.write_data_terminal_ready(false)?;
        self.port.write_request_to_send(false)?;
        std::thread::sleep(Duration::from_millis(100));
        
        // 拉高DTR和RTS
        self.port.write_data_terminal_ready(true)?;
        self.port.write_request_to_send(true)?;
        std::thread::sleep(Duration::from_millis(100));
        
        info!("设备重置完成: {}", self.port_name);
        Ok(())
    }
    
    /// 获取串口名称
    pub fn port_name(&self) -> &str {
        &self.port_name
    }
    
    /// 获取波特率
    pub fn baud_rate(&self) -> u32 {
        self.baud_rate
    }
    
    /// 检查串口是否仍然可用
    pub fn is_available(&self) -> bool {
        // 尝试获取串口状态来检查连接
        serialport::available_ports()
            .map(|ports| {
                ports.iter().any(|port| port.port_name == self.port_name)
            })
            .unwrap_or(false)
    }
}

impl Drop for SerialConnection {
    fn drop(&mut self) {
        info!("关闭串口连接: {}", self.port_name);
    }
}

/// 串口管理器
pub struct SerialManager {
    connections: std::collections::HashMap<String, SerialConnection>,
}

impl SerialManager {
    pub fn new() -> Self {
        Self {
            connections: std::collections::HashMap::new(),
        }
    }
    
    /// 打开串口连接
    pub fn connect(&mut self, port_name: &str, baud_rate: u32) -> Result<()> {
        if self.connections.contains_key(port_name) {
            return Err(anyhow!("串口 {} 已经连接", port_name));
        }
        
        let connection = SerialConnection::open(port_name, baud_rate)?;
        self.connections.insert(port_name.to_string(), connection);
        
        Ok(())
    }
    
    /// 断开串口连接
    pub fn disconnect(&mut self, port_name: &str) -> Result<()> {
        match self.connections.remove(port_name) {
            Some(_) => {
                info!("断开串口连接: {}", port_name);
                Ok(())
            },
            None => Err(anyhow!("串口 {} 未连接", port_name)),
        }
    }
    
    /// 获取串口连接
    pub fn get_connection(&mut self, port_name: &str) -> Option<&mut SerialConnection> {
        self.connections.get_mut(port_name)
    }
    
    /// 检查串口是否已连接
    pub fn is_connected(&self, port_name: &str) -> bool {
        self.connections.contains_key(port_name)
    }
    
    /// 获取所有已连接的串口
    pub fn connected_ports(&self) -> Vec<&str> {
        self.connections.keys().map(|s| s.as_str()).collect()
    }
} 