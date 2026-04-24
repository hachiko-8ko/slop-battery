import notifee, {
    AndroidImportance,
    AuthorizationStatus,
} from "react-native-notify-kit";

import { IPollingService } from "./IPollingService";

const POLLING_CHANNEL = "SLOP_BATTERY_POLLING_CHANNEL";
export const POLLING_TASK = "SLOP_BATTERY_POLLING_TASK";

/**
 * This encapsulates polling (start/stop) logic for mobile devices.
 * It is using react-native-notify-kit, a fork of notifee, to create a permanent
 * notification, in which the task runs.
 *
 * This is the one notification lib that could do this in modern expo ... do not use
 * expo-notifications (doesn't poll), expo-location (doesn't poll), or notifee (deprecated).
 * I think there's at least one other that my mind refuses to recall. Trauma, man.
 * Don't use any background task library (SO MANY), because they either don't build or
 * go to sleep the moment the app goes into the background.
 * Don't use expo-background-task or expo-background-fetch (min 15 minutes).
 *
 * This requires a call to notifee.registerForegroundService in index.js. This file doesn't
 * exist by default in Expo.
 */
export default class PollingService implements IPollingService {
    private static permissionGranted = false;

    /**
     * Set up the polling channel. Must be done before requesting permission.
     * @param name Name of the channel
     */
    public static async setupPollingChannel(name: string, description: string) {
        try {
            await notifee.createChannel({
                id: POLLING_CHANNEL,
                importance: AndroidImportance.LOW,
                name,
                description,
                vibration: false,
                badge: false,
            });
        } catch (err: any) {
            console.error(
                "[PollingService] Error while creating channel",
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
                    "[PollingService] Could not get permission.",
                    status,
                );
                return false;
            }

            this.permissionGranted = true;

            return true;
        } catch (err: any) {
            console.error(
                "[PollingService] Error while requesting permission",
                err,
                err.stack,
            );
            return false;
        }
    }

    private started = false;

    constructor(
        private notificationTitle: string,
        private notificationText: string,
    ) {}

    /**
     * Start polling a certain callback every n seconds.
     * @param seconds # of seconds between each poll
     * @param callback The function to call on each poll
     */
    public async startPolling(seconds: number, callback: () => Promise<void>) {
        if (this.started) {
            // No way for this to happen in this app currently
            console.error("[PollingService] TRIED TO START TASK TWICE");
            return;
        }

        if (!PollingService.permissionGranted) {
            console.error(
                "[PollingService] Do not have permission. Will not create task",
            );
            return;
        }

        try {
            console.log(
                "[PollingService] Replacing foreground service (outside)",
            );

            // It is important that there be an entry point file, set in package.json, that registers a dummy task.
            // "Only a single foreground service can exist for the application, and calling this method more than once will update the existing task runner."
            // This means the dummy task can be replaced with one that works.
            notifee.registerForegroundService(async () => {
                console.log(
                    "[PollingService] Replaced foreground service (inside)",
                );
                setInterval(async () => {
                    console.log("[PollingService] About to call callback");
                    try {
                        await callback();
                    } catch (err: any) {
                        console.error(
                            "[PollingService] Error in callback",
                            err,
                            err.stack,
                        );
                    }
                }, seconds * 1000);
            });

            // Create the persistent notification, this should cause the logic to execute
            console.log("[PollingService] Create persistent notification.");
            const notifConfig: any = {
                title: this.notificationTitle,
                body: this.notificationText,
                android: {
                    channelId: POLLING_CHANNEL,
                    asForegroundService: true,
                    sticky: true,
                },
            };
            await notifee.displayNotification(notifConfig);

            this.started = true;
        } catch (err: any) {
            console.error(
                "[PollingService] Failed to start foreground action",
                err,
                err.stack,
            );
        }
    }

    /**
     * Stop polling if it's currently active. Call this to clean up.
     */
    public async cleanup() {
        console.log("[PollingService] Cleanup called");

        if (this.started) {
            // I don't know if it can be restarted. In this app, it never will be.
            await notifee.stopForegroundService();
            this.started = false;
        }
    }
}
