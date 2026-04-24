export default interface INotificationService {
    /**
     * Sends a local notification to the device.
     *
     * @param title The title of the notification.
     * @param message The message to display.
     */
    sendNotification(title: string, message: string): Promise<void>;
}
