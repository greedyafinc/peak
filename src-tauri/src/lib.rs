// Shared entry point for desktop and mobile. On iOS/Android Tauri calls
// `run()` through the generated `mobile_entry_point`; on desktop `main.rs` calls it.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // On-device persistence: a JSON store in the per-platform app-data dir
        // ($APPDATA on desktop, the app sandbox on iOS/Android). Peak keeps ALL
        // of a user's data here — nothing is sent off the device.
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running Peak");
}
