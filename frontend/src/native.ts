import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function bootNativeShell() {
  if (!isNativeApp()) return;
  document.documentElement.classList.add("native-app");
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    /* browser */
  }
  try {
    await SplashScreen.hide();
  } catch {
    /* ignore */
  }
  void App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}
