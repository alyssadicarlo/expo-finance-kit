import { requireNativeModule } from "expo";
import { ExpoFinanceKitModule } from "./ExpoFinanceKit.types";
import { Platform } from "react-native";

// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
const nativeModule = Platform.OS === 'ios' ? requireNativeModule("ExpoFinanceKit") : null;

// Create a proxy that returns no-op functions for Android
const ExpoFinanceKitModule = new Proxy({}, {
  get(target, prop) {
    if (Platform.OS === 'android') {
      // Return a function that rejects with an appropriate error for Android
      return async () => {
        throw new Error('ExpoFinanceKit is only available on iOS devices');
      };
    }
    // For iOS, use the native module
    return nativeModule?.[prop];
  }
});

export default ExpoFinanceKitModule as ExpoFinanceKitModule;