import { IPollingService } from "./IPollingService";

export class MockPollingService implements IPollingService {
    private pollIntervalId: number | null = null;

    public async startPolling(seconds: number, callback: () => Promise<void>) {
        if (this.pollIntervalId !== null) {
            this.cleanup();
        }

        console.log("[MOCK] Starting polling");

        // Use global setInterval; cast to number for environments where setInterval returns a numeric id
        const id = setInterval(async () => {
            console.log("[MOCK] POLLED");
            try {
                await callback();
            } catch (err: any) {
                console.error(
                    "MockPollingService callback error",
                    err,
                    err.stack,
                );
            }
        }, seconds * 1000) as unknown as number;

        this.pollIntervalId = id;
    }

    public async cleanup() {
        console.log("[MOCK] Stopping polling");

        if (this.pollIntervalId !== null) {
            clearInterval(this.pollIntervalId);
            this.pollIntervalId = null;
        }
    }
}
