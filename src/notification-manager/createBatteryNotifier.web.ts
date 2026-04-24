import { MockBatteryService } from "../services/battery/MockBatteryService";
import MockNotificationService from "../services/notification/MockNotificationService";
import { MockPollingService } from "../services/polling/MockPollingService";
import { BatteryNotificationManager } from "./BatteryNotificationManager";

/**
 * Returns object that manages notifications for the battery state. This function has two implementations.
 * This version works on mobile only. It has libs unsupported on web, which can't even
 * be imported on web without blowing it up.
 * @returns BatteryNotificationManager
 */
export default function createBatteryNotifier(): BatteryNotificationManager {
    return new BatteryNotificationManager(
        new MockBatteryService(),
        new MockPollingService(),
        new MockNotificationService(),
    );
}
