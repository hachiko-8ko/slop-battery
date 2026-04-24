export interface IBatteryService {
    /**
     * Return the current battery level (0..1).
     */
    getBatteryLevelAsync(): Promise<number>;

    /**
     * Return the current battery state (charging not charging).
     */
    getBatteryStateAsync(): Promise<boolean>;

    /**
     * Sets up the event listener to listen to plugged/unplugged events.
     * @param setChargeState callback to set current charge state
     * @param unpluggedCallback callback executed when device becomes unplugged
     */
    subscribeToChargeStateEvents(
        setChargeState: (isCharging: boolean) => void,
        unpluggedCallback?: () => void,
    ): void;

    /**
     * Remove any event handlers / cleanup resources.
     */
    cleanup(): void;
}
