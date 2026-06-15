// Shared entry point for desktop and mobile. On iOS/Android Tauri calls
// `run()` through the generated `mobile_entry_point`; on desktop `main.rs` calls it.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Peak");
}
