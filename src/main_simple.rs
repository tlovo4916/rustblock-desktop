// 最简单的Tauri应用用于测试
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello {}, you've been greeted from Rust!", name)
}

#[tokio::main]
async fn main() {
    // 添加控制台输出用于调试
    println!("简单版本启动中...");
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            println!("应用程序设置中...");
            
            if let Some(window) = app.get_webview_window("main") {
                println!("找到窗口，尝试显示...");
                let _ = window.show();
                let _ = window.set_focus();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
        
    println!("应用程序结束");
} 