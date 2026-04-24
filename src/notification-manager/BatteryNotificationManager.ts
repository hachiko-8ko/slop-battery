import { makeAutoObservable, runInAction } from "mobx";
import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { IBatteryService } from "../services/battery/IBatteryService";
import INotificationService from "../services/notification/INotificationService";
import NotificationService from "../services/notification/NotificationService";
import { IPollingService } from "../services/polling/IPollingService";
import PollingService from "../services/polling/PollingService";

export const BATTERY_POLLING_TASK = "BATTERY_POLLING_TASK";

const BATTERY_NOTIFICATION_THRESHOLD_KEY = "BATTERY_NOTIFICATION_THRESHOLD_KEY";

/**
 * If the current battery is over the configured threshold, and notifications are
 * enabled, this creates a push notification. It checks once every 30s.
 */
export class BatteryNotificationManager {
    /**
     * Gets the persisted value for threshold on android, always hardcoded on web.
     * @returns The starting threshold value
     */
    public static async getNotificationThreshold(): Promise<number> {
        let stored: string | null = "";
        if (Platform.OS === "web") {
            // AsyncStorage doesn't work in web and Expo doesn't know localStorage. So hardcode it.
            stored = "90";
        } else {
            stored = await AsyncStorage.getItem(
                BATTERY_NOTIFICATION_THRESHOLD_KEY,
            );
        }

        const num = parseInt(stored ?? "", 10);
        if (isNaN(num)) {
            return 90;
        }
        return num;
    }

    isCharging: boolean = false;
    currentBattery: number = 0;
    notificationThreshold: number = 0;
    failedNotify: boolean = false;

    // internal fields, not tracked
    private _thresholdLoaded: boolean = false;
    private readonly _pollingService: IPollingService;
    private readonly _batteryService: IBatteryService;
    private readonly _notificationService: INotificationService;

    constructor(
        batteryService: IBatteryService,
        pollingService: IPollingService,
        notificationService: INotificationService,
    ) {
        this._batteryService = batteryService;
        this._pollingService = pollingService;
        this._notificationService = notificationService;
        makeAutoObservable<
            BatteryNotificationManager,
            | "_pollingService"
            | "_batteryService"
            | "_notificationService"
            | "_thresholdLoaded"
        >(this, {
            _pollingService: false,
            _batteryService: false,
            _notificationService: false,
            _thresholdLoaded: false,
        });
    }

    /**
     * Initialize android events. Call this once inside onEffect()
     */
    public *initAsync(): Generator {
        // These fake asyncs (slightly cleaner than runInAction everywhere) are nasty.
        // They have a very similar API to async but they break down in places.
        // Yield should only yield promises, so no nesting generators or else crashes on Android.
        // Using private members, crashes on Android.
        // Not a good fit for RN but not going to rewrite it. Workable for web, though.
        try {
            // Ensure notification channels exist
            yield PollingService.setupPollingChannel(
                "Slop Battery Service",
                "To function, this application runs within a permanent notification.",
            );
            yield NotificationService.setupNotificationChannel(
                "Slop Battery Alerts",
                "Alerts when battery reaches configured threshold",
            );
            // Request notification permissions
            yield this._requestPermissions();

            // Fetch the starting battery level and state
            yield this.updateBatteryLevel();
            this.isCharging = yield this._batteryService.getBatteryStateAsync();

            // Start polling to check the battery
            const interval = Platform.OS === "web" ? 10 : 30;
            yield this._pollingService.startPolling(interval, async () => {
                this._pollBattery();
            });

            // Subscribe to battery/charging events
            this._batteryService.subscribeToChargeStateEvents(
                (isCharging: boolean) => {
                    // runs on every state change
                    runInAction(() => {
                        this.isCharging = isCharging;
                    });
                },
            );

            // Kick off loading the persisted threshold in the background so the
            // manager and UI receive the stored value as soon as possible.
            const startingThreshold = yield this._getNotificationThreshold();
            return startingThreshold;
        } catch (err: any) {
            console.error(
                "[BatteryNotificationManager] Error during init",
                err,
                err.stack,
            );
            return 0;
        }
    }

    /**
     * Set the threshold and persist it in android for future reloads
     * @param value The percentage value to save
     */
    public async setBatteryNotificationThreshold(value: number) {
        await this._persistBatteryNotificationThreshold(value);
        runInAction(() => {
            this.notificationThreshold = value;
        });
    }

    /**
     * Pull the battery level from the battery service and set the field
     */
    public async updateBatteryLevel(): Promise<number> {
        const level = await this._batteryService.getBatteryLevelAsync();
        const current = Math.round(level * 100);
        runInAction(() => {
            this.currentBattery = current;
        });
        return current;
    }

    /**
     * Clean up polling and battery services
     */
    public async cleanup() {
        try {
            this._batteryService.cleanup();
        } finally {
            await this._pollingService.cleanup();
        }
    }

    /**
     * When called, updates the battery level and state.
     * If plugged in and level is higher than the threshold, trigger a notification.
     */
    *_pollBattery(): Generator {
        // Fetch and populate the current battery (should be set by events but I found that on Android,
        // charge change events are not being emitted, and according to google this is by design);
        const battery = yield this.updateBatteryLevel();

        // When the app is in the background, plugged/unplugged events are unreliable,
        // even when opting out of doze. Manually check to be sure.
        const isCharging = yield this._batteryService.getBatteryStateAsync();
        this.isCharging = isCharging;

        // Wait for persisted threshold to be loaded before checking,
        // so the first poll uses the correct configured value.
        const threshold = yield this._getNotificationThreshold();

        const onePingOnly = isCharging && battery >= threshold;
        console.log(`[BatteryNotificationManager] Current: ${battery}; Threshold: ${threshold}; Charging: ${isCharging}; Sound: ${onePingOnly}`);

        if (onePingOnly) {
            this._notificationService.sendNotification(
                "Battery Charged",
                `Battery at ${battery}%`,
            );
        }
    }

    // Ensure the persisted threshold is loaded into the manager before starting polling.
    // This prevents a race where polling starts with a default value before the
    // stored threshold is applied.
    async _getNotificationThreshold(): Promise<number> {
        if (this._thresholdLoaded) return this.notificationThreshold;

        const val = await BatteryNotificationManager.getNotificationThreshold();

        return Promise.resolve(val).then((val) => {
            runInAction(() => {
                this.notificationThreshold = val;
                this._thresholdLoaded = true;
            });
            return val;
        });
    }

    async _requestPermissions() {
        let granted = await PollingService.ensurePermissions();
        if (granted) {
            granted = await NotificationService.ensurePermissions();
        }
        runInAction(() => {
            if (!granted) {
                console.error(
                    "[BatteryNotificationManager] Didn't get permissions for notifications",
                );
                this.failedNotify = true;
            } else {
                this.failedNotify = false;
            }
        });
    }

    async _persistBatteryNotificationThreshold(value: number) {
        if (Platform.OS === "web") {
            return;
        }
        await AsyncStorage.setItem(
            BATTERY_NOTIFICATION_THRESHOLD_KEY,
            value.toString(),
        );
    }
}
