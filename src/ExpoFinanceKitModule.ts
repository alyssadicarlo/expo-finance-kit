import { NativeModules } from 'react-native';
import { 
  Account, 
  Transaction, 
  Balance,
  AuthorizationStatus
} from './ExpoFinanceKit.types';

// Function to get the native module, trying multiple approaches
const getNativeModule = () => {
  // Try different ways to access the module
  const module = 
    NativeModules.ExpoFinanceKit ||
    // @ts-ignore - Access TurboModuleRegistry directly
    global.RN$TurboModuleRegistry?.getEnforcing?.('ExpoFinanceKit') ||
    // @ts-ignore - Access NativeModuleRegistry directly  
    global.__turboModuleProxy?.('ExpoFinanceKit');

  return module;
};

// Create a proxy that safely accesses the native module
const createModuleProxy = () => {
  const handler = {
    get(target: any, prop: string) {
      const module = getNativeModule();
      
      // Handle isAvailable specially since it's a constant
      if (prop === 'isAvailable') {
        if (!module || !module.isAvailable) {
          return false;
        }
        return module.isAvailable;
      }
      
      // For methods, return a function that checks module availability
      if (typeof prop === 'string' && prop !== 'then') {
        return (...args: any[]) => {
          const currentModule = getNativeModule();
          if (!currentModule) {
            console.warn(`ExpoFinanceKit: Native module not available for ${prop}()`);
            return Promise.reject(new Error('ExpoFinanceKit native module not available'));
          }
          
          const method = currentModule[prop];
          if (typeof method === 'function') {
            return method.apply(currentModule, args);
          }
          
          return Promise.reject(new Error(`ExpoFinanceKit: ${prop} is not a function`));
        };
      }
      
      return Reflect.get(target, prop);
    }
  };
  
  return new Proxy({}, handler);
};

// Export the proxied module
const ExpoFinanceKit = createModuleProxy() as {
  isAvailable: boolean;
  requestAuthorization(): Promise<boolean>;
  getAuthorizationStatus(): Promise<AuthorizationStatus>;
  getAccounts(): Promise<Account[]>;
  getTransactions(accountId?: string, startDate?: number, endDate?: number): Promise<Transaction[]>;
  getBalance(accountId: string): Promise<Balance>;
};

export default ExpoFinanceKit;

// Export a function to check if the module is available
export const isFinanceKitModuleAvailable = (): boolean => {
  return !!getNativeModule();
};