import BatteryService from "../services/battery/BatteryService";
import NotificationService from "../services/notification/NotificationService";
import PollingService from "../services/polling/PollingService";
import { BatteryNotificationManager } from "./BatteryNotificationManager";

/**
 * Returns object that manages notifications for the battery state. This function has two implementations.
 * This version works on mobile only. It has libs unsupported on web, which can't even
 * be imported on web without blowing it up.
 * @returns BatteryNotificationManager
 */
export default function createBatteryNotifier(): BatteryNotificationManager {
    return new BatteryNotificationManager(
        new BatteryService(),
        new PollingService("Slop Battery", "Monitoring battery level."),
        new NotificationService(),
    );
}
