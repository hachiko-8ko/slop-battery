import INotificationService from "./INotificationService";

export default class MockNotificationService implements INotificationService {
    async sendNotification(title: string, message: string): Promise<void> {
        console.log(`[NOTIFY] [${title}]: [${message}]`);
    }
}
