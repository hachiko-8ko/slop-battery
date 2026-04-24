export interface IPollingService {
    startPolling(seconds: number, callback: () => Promise<void>): Promise<void>;
    cleanup(): Promise<void>;
}
