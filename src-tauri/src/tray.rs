use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

use crate::snapshot::MetricsSnapshot;

pub struct TrayState {
    pub health: MenuItem<tauri::Wry>,
    pub health_msg: MenuItem<tauri::Wry>,
}

pub fn create_tray(app: &AppHandle) -> tauri::Result<TrayState> {
    let health = MenuItem::with_id(app, "health", "Starting...", false, None::<&str>)?;
    let health_msg = MenuItem::with_id(app, "health_msg", "", false, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Open Burrow", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;

    let tray_menu = Menu::with_items(
        app,
        &[
            &health as &dyn tauri::menu::IsMenuItem<tauri::Wry>,
            &health_msg,
            &sep,
            &show,
            &sep,
            &quit,
        ],
    )?;

    let _tray = TrayIconBuilder::new()
        .menu(&tray_menu)
        .tooltip("Burrow")
        .on_menu_event(|app_handle, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(TrayState {
        health,
        health_msg,
    })
}

pub fn update_tray(app: &AppHandle, snap: &MetricsSnapshot) {
    if let Some(state) = app.try_state::<TrayState>() {
        let _ = state
            .health
            .set_text(format!("Health  {}", snap.health_score));
        let _ = state.health_msg.set_text(&snap.health_message);
    }
}
