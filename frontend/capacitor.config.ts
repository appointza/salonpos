import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.krios",
  appName: "Krios",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
    hostname: "kriosapp.com",
    allowNavigation: ["kriosapp.com", "*.kriosapp.com"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
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
