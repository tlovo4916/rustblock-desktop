// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod device;
mod ai;
mod utils;

use tauri::Manager;
use device::detector::DeviceDetector;
use commands::device::DeviceDetectorState;
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
        .manage(AIServiceState::new(None))
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::device::scan_devices,
            commands::device::connect_device,
            commands::device::disconnect_device,
            commands::device::upload_code,
            commands::ai::chat_with_ai,
            commands::ai::analyze_code,
            commands::ai::configure_ai_service,
            commands::project::new_project,
            commands::project::save_project,
            commands::project::load_project,
            commands::project::list_projects,
            commands::project::delete_project,
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