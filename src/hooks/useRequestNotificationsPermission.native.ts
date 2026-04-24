import NotificationService from "@/src/services/notification/NotificationService";
import { useEffect } from "react";
import { Platform } from "react-native";

export default function useRequestNotificationsPermission() {
    useEffect(() => {
        void (async () => {
            if (Platform.OS !== "android") return;

            // Platform.Version can be a number or string depending on RN version
            const version = Number(Platform.Version as unknown as number);
            if (Number.isNaN(version) || version < 33) return;

            try {
                await NotificationService.ensurePermissions();
            } catch (e) {
                // Ignore errors here; permission denial will be handled
                // when the user actually enables notifications.
            }
        })();
    }, []);
}
