const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");

// Android 14 manifest needs <service android:name="app.notifee.core.ForegroundService" android:exported="false" android:foregroundServiceType="shortService" />
// This is SUPPOSED to add that to the file (FFS just release the files)
module.exports = function withNotifeeForegroundService(config) {
    return withAndroidManifest(config, (config) => {
        // Use helper to safely get the <application> tag
        const mainApplication =
            AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

        if (!mainApplication.service) mainApplication.service = [];

        const serviceName = "app.notifee.core.ForegroundService";

        // Check for duplicates
        const hasService = mainApplication.service.some(
            (s) => s.$["android:name"] === serviceName,
        );

        if (!hasService) {
            mainApplication.service.push({
                $: {
                    "android:name": serviceName,
                    "android:foregroundServiceType": "dataSync",
                    "android:exported": "false",
                },
            });
        }

        console.log(JSON.stringify(mainApplication.service, null, 2));
        return config;
    });
};
