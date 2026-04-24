import { action, flowResult } from "mobx";
import { observer, useLocalObservable } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";
import {
    AppState,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { OpenOptimizationSettings } from "react-native-battery-optimization-check";
import { SafeAreaView } from "react-native-safe-area-context";

import { BatteryNotificationManager } from "@/src/notification-manager/BatteryNotificationManager";
import createBatteryNotifier from "@/src/notification-manager/createBatteryNotifier";
import * as RNExitApp from "@logicwind/react-native-exit-app";

const Index = observer(() => {
    const notifierRef = useRef<BatteryNotificationManager | null>(null);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        try {
            notifierRef.current = notifier;
            flowResult(notifier.initAsync())
                .then((val) => {
                    setThresholdInput(val.toString());
                    console.log("[INDEX]: Initialization complete");
                })
                .catch((err) => {
                    console.error("[INDEX] ERROR DURING INIT ", err, err.stack);
                });
        } catch (err: any) {
            console.error("[INDEX] ERROR DURING MOUNT", err, err.stack);
        }

        // When brought back to the foreground, update the battery display
        const subscription = AppState.addEventListener(
            "change",
            (nextAppState) => {
                // Check if transitioning FROM background TO active
                if (
                    appState.current.match(/inactive|background/) &&
                    nextAppState === "active"
                ) {
                    try {
                        notifierRef.current?.updateBatteryLevel();
                    } catch (err: any) {
                        console.error(
                            "[INDEX] Couldn't update battery on reload",
                            err,
                            err.stack,
                        );
                    }
                }
                appState.current = nextAppState;
            },
        );
        return () => {
            console.log("[INDEX] Unmounting component");
            notifierRef.current?.cleanup();
            subscription.remove();
        };
    }, []);

    const notifier = useMemo(() => createBatteryNotifier(), []);

    // special threshold functions to (1) allow update of observable and (2) set value on blur
    const thresholdInput = useLocalObservable(() => ({
        value: notifier.notificationThreshold.toString(),
    }));
    const setThresholdInput = action((val: string) => {
        thresholdInput.value = val;
    });
    const updateThreshold = async (text: string) => {
        const num = Number(text);
        if (text === "" || isNaN(num)) {
            setThresholdInput("90");
            return;
        }
        const clamped = Math.min(100, Math.max(1, Math.round(num)));
        await notifier.setBatteryNotificationThreshold(clamped);
        setThresholdInput(String(clamped));
    };

    const exitApp = async () => {
        console.log("[INDEX] Exiting app");
        try {
            await notifier.cleanup();
        } catch (err: any) {
            console.error("[INDEX] Error during exit", err, err.stack);
        } finally {
            const delay = async (ms: number) =>
                new Promise((res) => setTimeout(res, ms));
            await delay(100);
            RNExitApp.exitApp();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainCard}>
                <Text style={styles.title}>Slop Battery</Text>

                <View style={styles.card}>
                    <View>
                        <Text style={styles.batteryLabel}>Current Battery</Text>
                    </View>
                    <View
                        style={{ flexDirection: "row", position: "relative" }}
                    >
                        <Text
                            style={[
                                styles.batteryNumber,
                                notifier.isCharging && {
                                    color:
                                        notifier.currentBattery > 50
                                            ? "#10b981"
                                            : notifier.currentBattery > 20
                                              ? "#ee9e14"
                                              : "#be3636",
                                },
                            ]}
                        >
                            {notifier.currentBattery}
                        </Text>
                        {notifier.isCharging && (
                            <View style={styles.chargeBadge}>
                                <Text style={styles.chargeBadgeText}>⚡</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.batteryBar}>
                        <View
                            style={[
                                styles.batteryFill,
                                {
                                    width: `${notifier.currentBattery}%`,
                                    backgroundColor:
                                        notifier.currentBattery > 50
                                            ? "#10b981"
                                            : notifier.currentBattery > 20
                                              ? "#f59e0b"
                                              : "#ef4444",
                                },
                            ]}
                        />
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.thresholdContainer}>
                        <Pressable
                            onPress={() =>
                                updateThreshold(
                                    String(notifier.notificationThreshold - 1),
                                )
                            }
                            style={styles.thresholdButton}
                        >
                            <Text style={styles.thresholdButtonText}>−</Text>
                        </Pressable>

                        <TextInput
                            style={styles.thresholdInput}
                            keyboardType="numeric"
                            value={thresholdInput.value}
                            onChangeText={(t) => {
                                if (t.length <= 3) {
                                    t = t ?? "1";
                                    setThresholdInput(t);
                                }
                            }}
                            onEndEditing={(e) =>
                                updateThreshold(e.nativeEvent.text)
                            }
                            onSubmitEditing={() =>
                                updateThreshold(thresholdInput.value)
                            }
                            onBlur={() => updateThreshold(thresholdInput.value)}
                            maxLength={3}
                            returnKeyType="done"
                        />

                        <Pressable
                            onPress={() =>
                                updateThreshold(
                                    String(notifier.notificationThreshold + 1),
                                )
                            }
                            style={styles.thresholdButton}
                        >
                            <Text style={styles.thresholdButtonText}>+</Text>
                        </Pressable>
                    </View>
                </View>

                {notifier.failedNotify && (
                    <View style={styles.card}>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#e62910ad",
                                marginTop: 4,
                            }}
                        >
                            Unable to get notification permission
                        </Text>
                    </View>
                )}

                {Platform.OS === "android" && (
                    <View style={{ marginTop: 16 }}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => OpenOptimizationSettings()}
                        >
                            <Text style={styles.buttonText}>
                                ⚙️ Doze Settings
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {Platform.OS === "android" && (
                    <View style={{ marginTop: 16 }}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => exitApp()}
                        >
                            <Text style={styles.buttonText}>❌ Exit</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#0f172a",
    },
    mainCard: {
        backgroundColor: "#1e293b",
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.3)",
        elevation: 8,
        width: "90%",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#334155",
    },
    title: {
        fontSize: 36,
        fontWeight: "700",
        color: "#38bdf8",
        marginBottom: 40,
        textAlign: "center",
        letterSpacing: 0.5,
    },
    batteryLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#94a3b8",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    batteryNumber: {
        fontSize: 64,
        fontWeight: "800",
        color: "#f1f5f9",
        marginBottom: 16,
    },
    chargeBadge: {
        position: "absolute",
        top: 6,
        right: -16,
        backgroundColor: "#10b981",
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    chargeBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
    },
    batteryBar: {
        width: "100%",
        height: 8,
        backgroundColor: "#334155",
        borderRadius: 4,
        overflow: "hidden",
        marginTop: 8,
    },
    batteryFill: {
        height: "100%",
        borderRadius: 4,
    },
    card: {
        backgroundColor: "#0f172a",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
        elevation: 5,
        width: "80%",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#1e293b",
    },
    thresholdContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    thresholdInput: {
        marginHorizontal: 10,
        paddingVertical: 0,
        includeFontPadding: false,
        borderWidth: 1,
        borderColor: "#334155",
        width: 60,
        textAlign: "center",
        minWidth: 90,
        height: 56,
        fontSize: 36,
        fontWeight: "600",
        backgroundColor: "#1e293b",
        color: "#f1f5f9",
        borderRadius: 8,
    },
    thresholdButton: {
        backgroundColor: "#38bdf8",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
    },
    thresholdButtonText: {
        color: "#0f172a",
        fontSize: 24,
        lineHeight: 20,
        fontWeight: "600",
    },
    button: {
        backgroundColor: "#38bdf8",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 12,
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)",
        elevation: 5,
        width: "80%",
    },
    buttonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
        letterSpacing: 0.5,
    },
});

export default Index;
