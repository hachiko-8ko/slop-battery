import * as Battery from "expo-battery";
import { IBatteryService } from "./IBatteryService";

/**
 * Encapsulates all the battery/charging access logic for mobile devices.
 */
export default class BatteryService implements IBatteryService {
    private batteryStateSubscription?: Battery.Subscription;

    /**
     * Return the current battery level.
     */
    public getBatteryLevelAsync() {
        return Battery.getBatteryLevelAsync();
    }

    /**
     * Return the current battery state (charging not charging).
     */
    public async getBatteryStateAsync(): Promise<boolean> {
        const batteryState = await Battery.getBatteryStateAsync();
        return (
            batteryState === Battery.BatteryState.CHARGING ||
            batteryState === Battery.BatteryState.FULL
        );
    }

    /**
     * Sets up the event listener to listen to plugged/unplugged events.
     *
     * @param setChargeState A callback that can be used to set the current charge state.
     * @param unpluggedCallback A callback that triggers an activity when unplugged.
     */
    public subscribeToChargeStateEvents(
        setChargeState: (isCharging: boolean) => void,
        unpluggedCallback?: () => void,
    ) {
        const payload = (batteryState: Battery.BatteryState) => {
            const isCharging = this.handleChargingChange(
                batteryState,
                unpluggedCallback,
            );
            setChargeState(isCharging);
        };

        Battery.getBatteryStateAsync().then(payload);
        this.batteryStateSubscription = Battery.addBatteryStateListener(
            ({ batteryState }) => {
                payload(batteryState);
            },
        );
    }

    /**
     * Remove the event handler. Do this before exiting.
     */
    public cleanup() {
        console.log("[BatteryService] Cleanup called");

        if (this.batteryStateSubscription) {
            this.batteryStateSubscription.remove();
        }
    }

    /**
     *
     * @param batteryState Pass the current battery state
     * @param callback A callback to run when the charging state changes
     * @returns Indicatator of currently charging state
     */
    private handleChargingChange(
        batteryState: Battery.BatteryState,
        callback?: () => void,
    ) {
        // BatteryState 2 is CHARGING, 3 is FULL
        const isCharging =
            batteryState === Battery.BatteryState.CHARGING ||
            batteryState === Battery.BatteryState.FULL;

        if (!isCharging && callback) {
            callback();
        }

        return isCharging;
    }
}
