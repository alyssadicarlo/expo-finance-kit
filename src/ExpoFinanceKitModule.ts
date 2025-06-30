import { NativeModule, requireNativeModule } from 'expo';

import { ExpoFinanceKitModuleEvents } from './ExpoFinanceKit.types';

declare class ExpoFinanceKitModule extends NativeModule<ExpoFinanceKitModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoFinanceKitModule>('ExpoFinanceKit');
