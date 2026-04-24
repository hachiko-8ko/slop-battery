import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import useRequestNotificationsPermission from "@/src/hooks/useRequestNotificationsPermission";

export default function RootLayout() {
    useRequestNotificationsPermission();
    return (
        <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
    );
}
