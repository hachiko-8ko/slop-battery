import { registerRootComponent } from "expo";
import { App } from "expo-router/build/qualified-entry";
import { configure } from "mobx";
import { Platform } from "react-native";
import notifee from "react-native-notify-kit";

configure({
    useProxies: "ifavailable",
});

if (Platform.OS === "android") {
    notifee.registerForegroundService(async () => {
        // "Only a single foreground service can exist for the application, and calling this method more than once will update the existing task runner."
        // This does nothing but it will be overwriten.
        console.log(
            "[index.ts] TaskManager task created but not replaced. If you're seeing this, task was started before it was ready.",
        );
    });
    // Remove warning in logcat about having no background event when a notification is pressed
    notifee.onBackgroundEvent(async () => {});
}

// Bootstraps Expo Router
registerRootComponent(App);
