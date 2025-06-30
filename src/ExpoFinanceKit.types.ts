export type ExpoFinanceKitModuleEvents = {
  onAuthorizationStatusChanged: (params: AuthorizationStatusChangedPayload) => void;
};

export type AuthorizationStatusChangedPayload = {
  status: AuthorizationStatus;
};

export type AuthorizationStatus = 'notDetermined' | 'denied' | 'authorized' | 'unavailable';

export type AccountType = 'asset' | 'liability' | 'unknown';

export type Account = {
  id: string;
  displayName: string;
  institutionName: string;
  type: AccountType;
  currency: string;
};

export type TransactionCategory = 
  | 'automotive'
  | 'billsAndUtilities'
  | 'cashAndChecks'
  | 'dining'
  | 'education'
  | 'entertainment'
  | 'feesAndAdjustments'
  | 'financialServices'
  | 'food'
  | 'gifts'
  | 'groceries'
  | 'health'
  | 'home'
  | 'income'
  | 'other'
  | 'personalCare'
  | 'shopping'
  | 'transfer'
  | 'transportation'
  | 'travel'
  | 'unknown';

export type TransactionStatus = 'authorized' | 'booked' | 'pending' | 'rejected' | 'unknown';

export type TransactionType = 'credit' | 'debit' | 'unknown';

export type Transaction = {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  date: number; // timestamp in milliseconds
  description: string;
  category?: TransactionCategory;
  status: TransactionStatus;
  type: TransactionType;
};

export type Balance = {
  accountId: string;
  available: number;
  current: number;
  currency: string;
  asOfDate: number; // timestamp in milliseconds
};
