import { NativeModule, requireNativeModule } from 'expo';

import { 
  ExpoFinanceKitModuleEvents, 
  Account, 
  Transaction, 
  Balance,
  AuthorizationStatus
} from './ExpoFinanceKit.types';

declare class ExpoFinanceKitModule extends NativeModule<ExpoFinanceKitModuleEvents> {
  isAvailable: boolean;
  
  requestAuthorization(): Promise<boolean>;
  getAuthorizationStatus(): Promise<AuthorizationStatus>;
  getAccounts(): Promise<Account[]>;
  getTransactions(accountId?: string, startDate?: number, endDate?: number): Promise<Transaction[]>;
  getBalance(accountId: string): Promise<Balance>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoFinanceKitModule>('ExpoFinanceKit');
