use anyhow::Result;
use tauri::command;
use log::{info, error, debug};
use serialport::{SerialPort, SerialPortType};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::Duration;

// 全局串口连接管理
lazy_static::lazy_static! {
    static ref SERIAL_CONNECTIONS: Arc<Mutex<HashMap<String, Arc<Mutex<Box<dyn SerialPort>>>>>> = 
        Arc::new(Mutex::new(HashMap::new()));
}

#[derive(serde::Serialize)]
pub struct SerialPortInfo {
    pub port_name: String,
    pub port_type: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    pub serial_number: Option<String>,
    pub manufacturer: Option<String>,
    pub product: Option<String>,
}

#[command]
pub async fn list_serial_ports() -> Result<Vec<SerialPortInfo>, String> {
    info!("列出所有串口");
    
    let ports = serialport::available_ports().map_err(|e| {
        error!("获取串口列表失败: {}", e);
        format!("获取串口列表失败: {}", e)
    })?;
    
    let port_infos: Vec<SerialPortInfo> = ports.into_iter().map(|port| {
        let (port_type_str, vid, pid, serial_number, manufacturer, product) = match &port.port_type {
            SerialPortType::UsbPort(info) => (
                "USB".to_string(),
                Some(info.vid),
                Some(info.pid),
                info.serial_number.clone(),
                info.manufacturer.clone(),
                info.product.clone(),
            ),
            SerialPortType::BluetoothPort => ("Bluetooth".to_string(), None, None, None, None, None),
            SerialPortType::PciPort => ("PCI".to_string(), None, None, None, None, None),
            SerialPortType::Unknown => ("Unknown".to_string(), None, None, None, None, None),
        };
        
        SerialPortInfo {
            port_name: port.port_name,
            port_type: port_type_str,
            vid,
            pid,
            serial_number,
            manufacturer,
            product,
        }
    }).collect();
    
    Ok(port_infos)
}

#[command]
pub async fn connect_serial(port: String, baud_rate: u32) -> Result<(), String> {
    info!("连接串口: {} @ {} baud", port, baud_rate);
    
    // 检查是否已连接
    {
        let connections = SERIAL_CONNECTIONS.lock().await;
        if connections.contains_key(&port) {
            return Err(format!("串口 {} 已连接", port));
        }
    }
    
    // 创建串口连接
    let serial_port = serialport::new(&port, baud_rate)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| {
            error!("打开串口失败: {}", e);
            match e.kind() {
                serialport::ErrorKind::NoDevice => format!("设备未找到: {}", port),
                serialport::ErrorKind::InvalidInput => format!("无效的参数"),
                serialport::ErrorKind::Unknown => format!("未知错误: {}", e),
                _ => format!("串口打开失败: {}", e),
            }
        })?;
    
    // 保存连接
    let mut connections = SERIAL_CONNECTIONS.lock().await;
    connections.insert(port.clone(), Arc::new(Mutex::new(serial_port)));
    
    info!("串口 {} 连接成功", port);
    Ok(())
}

#[command]
pub async fn disconnect_serial(port: String) -> Result<(), String> {
    info!("断开串口: {}", port);
    
    let mut connections = SERIAL_CONNECTIONS.lock().await;
    if connections.remove(&port).is_some() {
        info!("串口 {} 已断开", port);
        Ok(())
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

#[command]
pub async fn write_serial_data(port: String, data: String) -> Result<(), String> {
    debug!("向串口 {} 写入数据: {}", port, data);
    
    let connections = SERIAL_CONNECTIONS.lock().await;
    if let Some(serial_arc) = connections.get(&port) {
        let mut serial = serial_arc.lock().await;
        serial.write_all(data.as_bytes()).map_err(|e| {
            error!("写入串口数据失败: {}", e);
            format!("写入串口数据失败: {}", e)
        })?;
        serial.flush().map_err(|e| {
            error!("刷新串口缓冲区失败: {}", e);
            format!("刷新串口缓冲区失败: {}", e)
        })?;
        Ok(())
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

#[command]
pub async fn read_serial_data(port: String) -> Result<String, String> {
    let connections = SERIAL_CONNECTIONS.lock().await;
    if let Some(serial_arc) = connections.get(&port) {
        let mut serial = serial_arc.lock().await;
        
        let mut buffer = vec![0; 1024];
        match serial.read(&mut buffer) {
            Ok(n) => {
                let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                if n > 0 {
                    debug!("从串口 {} 读取 {} 字节", port, n);
                }
                Ok(data)
            }
            Err(e) => {
                if e.kind() == std::io::ErrorKind::TimedOut {
                    // 超时是正常的，返回空字符串
                    Ok(String::new())
                } else {
                    error!("读取串口数据失败: {}", e);
                    Err(format!("读取串口数据失败: {}", e))
                }
            }
        }
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

#[command]
pub async fn get_connected_ports() -> Result<Vec<String>, String> {
    let connections = SERIAL_CONNECTIONS.lock().await;
    Ok(connections.keys().cloned().collect())
}

#[command]
pub async fn set_serial_params(
    port: String,
    baud_rate: Option<u32>,
    data_bits: Option<u8>,
    stop_bits: Option<u8>,
    parity: Option<String>
) -> Result<(), String> {
    info!("设置串口参数: {}", port);
    
    let connections = SERIAL_CONNECTIONS.lock().await;
    if let Some(serial_arc) = connections.get(&port) {
        let mut serial = serial_arc.lock().await;
        
        if let Some(baud) = baud_rate {
            serial.set_baud_rate(baud).map_err(|e| {
                error!("设置波特率失败: {}", e);
                format!("设置波特率失败: {}", e)
            })?;
        }
        
        if let Some(bits) = data_bits {
            use serialport::DataBits;
            let data_bits = match bits {
                5 => DataBits::Five,
                6 => DataBits::Six,
                7 => DataBits::Seven,
                8 => DataBits::Eight,
                _ => return Err("无效的数据位数".to_string()),
            };
            serial.set_data_bits(data_bits).map_err(|e| {
                error!("设置数据位失败: {}", e);
                format!("设置数据位失败: {}", e)
            })?;
        }
        
        if let Some(bits) = stop_bits {
            use serialport::StopBits;
            let stop_bits = match bits {
                1 => StopBits::One,
                2 => StopBits::Two,
                _ => return Err("无效的停止位数".to_string()),
            };
            serial.set_stop_bits(stop_bits).map_err(|e| {
                error!("设置停止位失败: {}", e);
                format!("设置停止位失败: {}", e)
            })?;
        }
        
        if let Some(parity_str) = parity {
            use serialport::Parity;
            let parity = match parity_str.to_lowercase().as_str() {
                "none" => Parity::None,
                "odd" => Parity::Odd,
                "even" => Parity::Even,
                _ => return Err("无效的校验位设置".to_string()),
            };
            serial.set_parity(parity).map_err(|e| {
                error!("设置校验位失败: {}", e);
                format!("设置校验位失败: {}", e)
            })?;
        }
        
        info!("串口 {} 参数设置成功", port);
        Ok(())
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

#[command]
pub async fn clear_serial_buffers(port: String) -> Result<(), String> {
    info!("清空串口缓冲区: {}", port);
    
    let connections = SERIAL_CONNECTIONS.lock().await;
    if let Some(serial_arc) = connections.get(&port) {
        let mut serial = serial_arc.lock().await;
        serial.clear(serialport::ClearBuffer::All).map_err(|e| {
            error!("清空串口缓冲区失败: {}", e);
            format!("清空串口缓冲区失败: {}", e)
        })?;
        Ok(())
    } else {
        Err(format!("串口 {} 未连接", port))
    }
}

// 连接历史记录
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct ConnectionHistory {
    pub device_id: String,
    pub port: String,
    pub timestamp: i64,
    pub success: bool,
    pub error: Option<String>,
}

lazy_static::lazy_static! {
    static ref CONNECTION_HISTORY: Arc<Mutex<Vec<ConnectionHistory>>> = 
        Arc::new(Mutex::new(Vec::new()));
}

#[command]
pub async fn record_connection_history(
    device_id: String,
    success: bool,
    error: Option<String>,
    timestamp: i64
) -> Result<(), String> {
    let history = ConnectionHistory {
        device_id: device_id.clone(),
        port: String::new(), // 需要从设备信息中获取
        timestamp,
        success,
        error,
    };
    
    let mut histories = CONNECTION_HISTORY.lock().await;
    histories.push(history);
    
    // 保持最近100条记录
    if histories.len() > 100 {
        let drain_count = histories.len() - 100;
        histories.drain(0..drain_count);
    }
    
    debug!("记录连接历史: {} - {}", device_id, if success { "成功" } else { "失败" });
    Ok(())
}

#[command]
pub async fn get_connection_history(device_id: Option<String>) -> Result<Vec<ConnectionHistory>, String> {
    let histories = CONNECTION_HISTORY.lock().await;
    
    if let Some(id) = device_id {
        Ok(histories.iter()
            .filter(|h| h.device_id == id)
            .cloned()
            .collect())
    } else {
        Ok(histories.clone())
    }
}