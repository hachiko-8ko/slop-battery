import notifee, {
    AndroidImportance,
    AuthorizationStatus,
} from "react-native-notify-kit";

import INotificationService from "./INotificationService";

const NOTIFICATION_CHANNEL = "SLOP_BATTERY_NOTIFICATION_CHANNEL";

/**
 * This encapsulates the two functions of notifications, creating a
 * channel and publishing a notification on the channel.
 *
 * It uses react-native-notify-kit to create the notification. Expo-notifications
 * works fine, but we need this one for PollingService so just have one.
 */
export default class NotificationService implements INotificationService {
    public static permissionGranted = false;

    /**
     * Set up the polling channel. Must be done before requesting permission.
     * @param name Name of the channel
     */
    public static async setupNotificationChannel(
        name: string,
        description: string,
    ) {
        try {
            await notifee.createChannel({
                id: NOTIFICATION_CHANNEL,
                importance: AndroidImportance.HIGH,
                name,
                description,
                vibration: false,
                sound: "default",
                badge: false,
            });
        } catch (err: any) {
            console.error(
                "[NotificationService] Error while creating channel",
                err,
                err.stack,
            );
        }
    }

    /**
     * Request permission. Must be done before creating the notification.
     */
    public static async ensurePermissions(): Promise<boolean> {
        try {
            const status = await notifee.requestPermission();
            if (status.authorizationStatus === AuthorizationStatus.DENIED) {
                console.error(
                    "[NotificationService] Could not get permission.",
                    status,
                );
                return false;
            }

            this.permissionGranted = true;

            return true;
        } catch (err: any) {
            console.error(
                "[NotificationService] Error while requesting permission",
                err,
                err.stack,
            );
            return false;
        }
    }

    /**
     * Sends a local notification to the device.
     *
     * @param title The title of the notification.
     * @param message The message to display.
     */
    public async sendNotification(title: string, message: string) {
        if (!NotificationService.permissionGranted) {
            console.log(`[NotificationService] [${title}]: [${message}]`);
            console.error(
                "[NotificationService] Do not have permission to create notification. ",
            );
            return;
        }

        try {
            const notifConfig = {
                title,
                body: message,
                android: {
                    channelId: NOTIFICATION_CHANNEL,
                },
            };
            await notifee.displayNotification(notifConfig);
        } catch (err: any) {
            console.error(
                "[NotificationService] Error creating notification",
                err,
                err.stack,
            );
        }
    }
}
