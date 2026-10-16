import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.krios",
  appName: "Krios",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    url: "https://kriosapp.com",
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: ["kriosapp.com", "*.kriosapp.com"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
    },
    StatusBar: {
      style: "LIGHT",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
