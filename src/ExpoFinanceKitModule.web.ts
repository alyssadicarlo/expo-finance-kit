import { registerWebModule, NativeModule } from 'expo';

import { 
  ExpoFinanceKitModuleEvents,
  AuthorizationStatus,
  Account,
  Transaction,
  AccountBalance
} from './ExpoFinanceKit.types';

class ExpoFinanceKitModule extends NativeModule<ExpoFinanceKitModuleEvents> {
  isAvailable = false;
  
  async requestAuthorization(): Promise<boolean> {
    console.warn('FinanceKit is not available on web platform');
    return false;
  }
  
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    return 'unavailable';
  }
  
  async getAccounts(): Promise<Account[]> {
    console.warn('FinanceKit is not available on web platform');
    return [];
  }
  
  async getTransactions(accountId?: string, startDate?: number, endDate?: number): Promise<Transaction[]> {
    console.warn('FinanceKit is not available on web platform');
    return [];
  }
  
  async getBalance(accountId: string): Promise<AccountBalance> {
    console.warn('FinanceKit is not available on web platform');
    throw new Error('FinanceKit is not available on web platform');
  }
}

export default registerWebModule(ExpoFinanceKitModule, 'ExpoFinanceKitModule');

// Export a function to check if the module is available (always false on web)
export const isFinanceKitModuleAvailable = (): boolean => {
  return false;
};
