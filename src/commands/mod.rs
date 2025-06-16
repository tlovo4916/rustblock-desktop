pub mod device;
pub mod ai;
pub mod project;
pub mod code_gen;

use tauri::command;

#[command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
} 