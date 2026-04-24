import { IBatteryService } from "./IBatteryService";

/**
 * Mock implementation that does not depend on expo-battery.
 * - Simulates battery level changes (0..1) over time.
 * - Simulates charge state changes (charging / not charging).
 * - Useful for tests or environments without expo.
 */
export class MockBatteryService implements IBatteryService {
    private levelInterval?: NodeJS.Timeout;
    private stateInterval?: NodeJS.Timeout;
    private currentLevel = 0.5;
    private charging = true;
    private chargeStateCallback?: (isCharging: boolean) => void;
    private unpluggedCallback?: () => void;

    constructor(
        // optional configuration for simulation speed
        private opts: {
            levelStep?: number;
            levelTickMs?: number;
            stateTickMs?: number;
        } = {},
    ) {
        this.opts = {
            levelStep: 0.01,
            levelTickMs: 3000,
            stateTickMs: 60000,
            ...this.opts,
        };
    }

    async getBatteryLevelAsync(): Promise<number> {
        console.log("[MOCK] getBatteryLevelAsync called");

        // return a snapshot (0..1)
        return this.currentLevel;
    }

    public async getBatteryStateAsync(): Promise<boolean> {
        return this.charging;
    }

    // On the mock this also sets up simulated battery activity
    subscribeToChargeStateEvents(
        setChargeState: (isCharging: boolean) => void,
        unpluggedCallback?: () => void,
    ): void {
        // set up charge level changes
        this.setUpBatteryActivity();

        console.log("[MOCK] subscribeToChargeStateEvents called");

        this.chargeStateCallback = setChargeState;
        this.unpluggedCallback = unpluggedCallback;

        // emit initial state immediately
        setChargeState(this.charging);

        // simulate state changes on an interval
        if (this.stateInterval != null) return;
        this.stateInterval = setInterval(() => {
            // flip charging state with low probability to make tests deterministic-ish use opts
            this.charging = !this.charging;
            console.log(
                this.charging ? "[MOCK] Plugged In" : "[MOCK] Unplugged",
            );
            setChargeState(this.charging);
            if (!this.charging && unpluggedCallback) {
                // call unplugged callback when becoming unplugged
                unpluggedCallback();
            }
        }, this.opts.stateTickMs);
    }

    cleanup(): void {
        console.log("[MOCK] cleanup called");

        if (this.levelInterval != null) {
            clearInterval(this.levelInterval);
            this.levelInterval = undefined;
        }
        if (this.stateInterval != null) {
            clearInterval(this.stateInterval);
            this.stateInterval = undefined;
        }
        this.chargeStateCallback = undefined;
        this.unpluggedCallback = undefined;
    }

    // Helpers for tests: manually control state if desired
    setCharging(isCharging: boolean) {
        console.log("[MOCK] setCharging called");

        const prev = this.charging;
        this.charging = isCharging;
        if (prev !== isCharging && this.chargeStateCallback) {
            this.chargeStateCallback(isCharging);
            if (!isCharging && this.unpluggedCallback) this.unpluggedCallback();
        }
    }

    setBatteryLevel(level: number) {
        console.log("[MOCK] setBatteryLevel called");

        this.currentLevel = Math.max(0, Math.min(1, level));
    }

    // simulate battery level changes on an interval
    setUpBatteryActivity() {
        console.log("[MOCK] setUpBatteryActivity called: ", this.opts);

        // if already running, do nothing
        if (this.levelInterval != null) return;

        // simulate battery drain/charge by flipping sign with charging state
        this.levelInterval = setInterval(() => {
            const step = this.opts.levelStep ?? 0.01;
            if (this.charging) {
                this.currentLevel = Math.min(1, this.currentLevel + step);
            } else {
                this.currentLevel = Math.max(0, this.currentLevel - step);
            }
            console.log(`[MOCK] Battery at ${this.currentLevel}`);
        }, this.opts.levelTickMs);
    }
}
