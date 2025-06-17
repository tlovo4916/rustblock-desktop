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
use commands::enhanced_ai::EnhancedAIServiceState;
use commands::performance::{PerformanceMonitorState, GlobalCacheState, TaskManagerState};

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
    
    // 创建性能管理状态
    let (performance_monitor, global_cache, task_manager) = commands::performance::create_performance_states();
    
    tauri::Builder::default()
        .manage(DeviceDetectorState::new(DeviceDetector::new()))
        .manage(DeviceUploaderState::new(DeviceUploader::new()))
        .manage(SerialManagerState::new(SerialManager::new()))
        .manage(AIServiceState::new(None))
        .manage(EnhancedAIServiceState::new(None))
        .manage(performance_monitor)
        .manage(global_cache)
        .manage(task_manager)
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
            // 设备配置文件命令
            commands::device_profile::create_device_profile,
            commands::device_profile::update_device_profile,
            commands::device_profile::delete_device_profile,
            commands::device_profile::get_device_profile,
            commands::device_profile::list_device_profiles,
            commands::device_profile::associate_device_profile,
            commands::device_profile::get_device_connection_status,
            commands::device_profile::batch_connect_devices,
            commands::device_profile::batch_disconnect_devices,
            commands::device_profile::batch_apply_profile,
            commands::device_profile::export_device_profiles,
            commands::device_profile::import_device_profiles,
            commands::device_profile::cleanup_disconnected_devices,
            commands::device_profile::enable_auto_reconnect,
            commands::device_profile::disable_auto_reconnect,
            // AI命令
            commands::ai::chat_with_ai,
            commands::ai::analyze_code,
            commands::ai::configure_ai_service,
            // 增强AI命令
            commands::enhanced_ai::optimize_code,
            commands::enhanced_ai::generate_learning_path,
            commands::enhanced_ai::get_project_template,
            commands::enhanced_ai::get_suitable_templates,
            commands::enhanced_ai::recommend_projects,
            commands::enhanced_ai::generate_custom_template,
            commands::enhanced_ai::configure_enhanced_ai_service,
            commands::enhanced_ai::get_optimization_suggestions,
            commands::enhanced_ai::generate_personalized_curriculum,
            commands::enhanced_ai::get_age_appropriate_templates,
            commands::enhanced_ai::validate_child_code,
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
            commands::code_gen::get_available_blocks,
            // 性能优化命令
            commands::performance::get_system_status,
            commands::performance::get_performance_history,
            commands::performance::clear_cache,
            commands::performance::optimize_performance,
            commands::performance::preload_resources,
            commands::performance::get_cache_info,
            commands::performance::configure_performance_settings,
            commands::performance::run_performance_benchmark,
            commands::performance::enable_lazy_loading,
            commands::performance::get_resource_usage
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