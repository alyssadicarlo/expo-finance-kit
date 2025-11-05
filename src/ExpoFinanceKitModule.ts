import { requireNativeModule } from "expo";
import { ExpoFinanceKitModule as ExpoFinanceKitModuleType } from "./ExpoFinanceKit.types";
import { Platform } from "react-native";

// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
let nativeModule: any = null;
if (Platform.OS === 'ios') {
  try {
    nativeModule = requireNativeModule("ExpoFinanceKit");
  } catch (error) {
    // Native module not found - likely needs to be rebuilt
    console.warn('ExpoFinanceKit native module not found. Make sure to rebuild your app with npx expo prebuild or npx expo run:ios');
    nativeModule = null;
  }
}

// Create a proxy that returns no-op functions for Android or when module is unavailable
const ExpoFinanceKitModule = new Proxy({}, {
  get(target, prop) {
    if (Platform.OS === 'android') {
      // Return a function that rejects with an appropriate error for Android
      return async () => {
        throw new Error('ExpoFinanceKit is only available on iOS devices');
      };
    }
    
    // For iOS, use the native module if available
    if (nativeModule) {
      return nativeModule[prop];
    }
    
    // If native module not available, return appropriate defaults
    if (prop === 'isAvailable') {
      return false;
    }
    
    // For methods, return a function that throws an error
    return async () => {
      throw new Error('ExpoFinanceKit native module not found. Please rebuild your app with npx expo prebuild or npx expo run:ios');
    };
  }
});

export default ExpoFinanceKitModule as ExpoFinanceKitModuleType;