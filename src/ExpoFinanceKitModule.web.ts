import { registerWebModule, NativeModule } from 'expo';

import { ExpoFinanceKitModuleEvents } from './ExpoFinanceKit.types';

class ExpoFinanceKitModule extends NativeModule<ExpoFinanceKitModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoFinanceKitModule, 'ExpoFinanceKitModule');
