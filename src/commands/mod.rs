pub mod device;
pub mod device_profile;
pub mod ai;
pub mod enhanced_ai;
pub mod project;
pub mod code_gen;
pub mod performance;

use tauri::command;

#[command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
} 