// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod device;
mod ai;
mod utils;

use tauri::Manager;
use device::{
    detector::DeviceDetector,
    uploader::DeviceUploader,
    serial::SerialManager,
};
use commands::device::{DeviceDetectorState, DeviceUploaderState, SerialManagerState};
use commands::ai::AIServiceState;

#[tokio::main]
async fn main() {
    // 初始化日志，设置为INFO级别以便看到更多信息
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();
    
    println!("=== RustBlock Desktop 启动 ===");
    println!("版本: 0.0.1");
    println!("系统: {}", std::env::consts::OS);
    println!("架构: {}", std::env::consts::ARCH);
    
    tauri::Builder::default()
        .manage(DeviceDetectorState::new(DeviceDetector::new()))
        .manage(DeviceUploaderState::new(DeviceUploader::new()))
        .manage(SerialManagerState::new(SerialManager::new()))
        .manage(AIServiceState::new(None))
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            // 设备管理命令
            commands::device::scan_devices,
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::upload_code,
            commands::device::get_device_status,
            commands::device::check_device_drivers,
            commands::device::install_device_driver,
            commands::device::get_available_drivers,
            commands::device::get_installed_drivers,
            // 上传工具命令
            commands::device::check_upload_tools,
            commands::device::install_missing_tools,
            commands::device::get_arduino_libraries,
            commands::device::install_arduino_library,
            // 串口通信命令
            commands::device::connect_serial,
            commands::device::disconnect_serial,
            commands::device::send_serial_data,
            commands::device::read_serial_data,
            commands::device::get_connected_ports,
            commands::device::refresh_device_status,
            commands::device::refresh_all_devices,
            // AI命令
            commands::ai::chat_with_ai,
            commands::ai::analyze_code,
            commands::ai::configure_ai_service,
            // 项目管理命令
            commands::project::new_project,
            commands::project::save_project,
            commands::project::load_project,
            commands::project::list_projects,
            commands::project::delete_project,
            // 代码生成命令
            commands::code_gen::generate_arduino_code,
            commands::code_gen::generate_microbit_code,
            commands::code_gen::validate_blocks_xml,
            commands::code_gen::get_available_blocks
        ])
        .setup(|app| {
            println!("RustBlock Desktop 正在启动...");
            
            // 确保窗口可见
            if let Some(window) = app.get_webview_window("main") {
                println!("找到主窗口，尝试显示...");
                let _ = window.show();
                let _ = window.set_focus();
                
                #[cfg(debug_assertions)]
                {
                    let _ = window.open_devtools();
                }
            } else {
                println!("警告：未找到主窗口！");
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 