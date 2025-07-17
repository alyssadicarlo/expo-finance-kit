/**
 * Core type definitions for Expo Finance Kit
 * Provides comprehensive type safety for Apple FinanceKit integration
 */

// ==================== Events ====================

/**
 * Event types supported by the ExpoFinanceKit module
 */
export type ExpoFinanceKitModuleEvents = {
  onAuthorizationStatusChanged: (params: AuthorizationStatusChangedPayload) => void;
};

/**
 * Payload for authorization status change events
 */
export type AuthorizationStatusChangedPayload = {
  status: AuthorizationStatus;
  timestamp: number;
};

// ==================== Authorization ====================

/**
 * Possible authorization statuses for FinanceKit access
 */
export type AuthorizationStatus = 'notDetermined' | 'denied' | 'authorized' | 'unavailable';

/**
 * Authorization request result
 */
export interface AuthorizationResult {
  granted: boolean;
  status: AuthorizationStatus;
}

// ==================== Accounts ====================

/**
 * Account types supported by FinanceKit
 */
export enum AccountType {
  Asset = "asset",
  Liability = "liability",
}

/**
 * Financial account information
 */
export interface Account {
  id: string;
  institutionName: string;
  displayName: string;
  accountDescription?: string;
  currencyCode: string;
  accountType: AccountType;
  createdAt?: number;
  lastUpdated?: number;
}

/**
 * Extended account information with additional metadata
 */
export interface AccountWithMetadata extends Account {
  isActive: boolean;
  lastTransactionDate?: number;
  accountNumber?: string; // Last 4 digits only
}

// ==================== Transactions ====================

/**
 * Credit/Debit indicator for transactions
 */
export enum CreditDebitIndicator {
  Credit = "credit",
  Debit = "debit",
}

/**
 * Transaction status types
 */
export enum TransactionStatus {
  Authorized = "authorized",
  Booked = "booked",
  Pending = "pending",
  Rejected = "rejected",
}

/**
 * Comprehensive transaction types matching Apple FinanceKit
 */
export enum TransactionType {
  Adjustment = "adjustment",
  ATM = "atm",
  BillPayment = "billPayment",
  Check = "check",
  Deposit = "deposit",
  DirectDebit = "directDebit",
  DirectDeposit = "directDeposit",
  Dividend = "dividend",
  Fee = "fee",
  Interest = "interest",
  Loan = "loan",
  PointOfSale = "pointOfSale",
  Refund = "refund",
  StandingOrder = "standingOrder",
  Transfer = "transfer",
  Unknown = "unknown",
  Withdrawal = "withdrawal",
}

/**
 * Merchant Category Code (MCC) for transaction classification
 */
export type MerchantCategoryCode = number;

/**
 * Core transaction data
 */
export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currencyCode: string;
  transactionDate: number; // UNIX timestamp in ms
  merchantName?: string;
  transactionDescription: string;
  merchantCategoryCode?: MerchantCategoryCode;
  status: TransactionStatus;
  transactionType: TransactionType;
  creditDebitIndicator: CreditDebitIndicator;
}

/**
 * Extended transaction with additional details
 */
export interface TransactionWithDetails extends Transaction {
  category?: TransactionCategory;
  location?: TransactionLocation;
  tags?: string[];
  notes?: string;
  attachments?: TransactionAttachment[];
}

/**
 * Transaction category for better organization
 */
export interface TransactionCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

/**
 * Location information for a transaction
 */
export interface TransactionLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/**
 * Transaction attachment (receipt, invoice, etc.)
 */
export interface TransactionAttachment {
  id: string;
  type: 'image' | 'pdf' | 'other';
  url: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
}

// ==================== Balances ====================

/**
 * Balance types available in FinanceKit
 */
export enum BalanceType {
  Available = "available",
  Booked = "booked",
  AvailableAndBooked = "availableAndBooked",
}

/**
 * Account balance information
 */
export interface AccountBalance {
  id: string;
  accountId: string;
  amount: number;
  currencyCode: string;
  balanceType?: BalanceType;
  asOfDate?: number;
}

/**
 * Detailed balance information with breakdowns
 */
export interface DetailedBalance extends AccountBalance {
  availableBalance?: number;
  bookedBalance?: number;
  pendingCredits?: number;
  pendingDebits?: number;
  creditLimit?: number;
  minimumPaymentDue?: number;
  paymentDueDate?: number;
}

// ==================== Query Types ====================

/**
 * Options for querying transactions
 */
export interface TransactionQueryOptions {
  accountId?: string;
  startDate?: Date | number;
  endDate?: Date | number;
  minAmount?: number;
  maxAmount?: number;
  merchantName?: string;
  transactionTypes?: TransactionType[];
  statuses?: TransactionStatus[];
  creditDebitIndicator?: CreditDebitIndicator;
  merchantCategoryCodes?: MerchantCategoryCode[];
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'amount' | 'merchantName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Options for querying accounts
 */
export interface AccountQueryOptions {
  accountTypes?: AccountType[];
  institutionNames?: string[];
  currencyCodes?: string[];
  isActive?: boolean;
}

/**
 * Options for querying balances
 */
export interface BalanceQueryOptions {
  accountIds?: string[];
  balanceTypes?: BalanceType[];
  asOfDate?: Date | number;
}

// ==================== Analytics & Insights ====================

/**
 * Spending insights for a given period
 */
export interface SpendingInsights {
  periodStart: number;
  periodEnd: number;
  totalSpent: number;
  totalIncome: number;
  netCashFlow: number;
  categoriesBreakdown: CategoryBreakdown[];
  merchantsBreakdown: MerchantBreakdown[];
  dailyBalances?: DailyBalance[];
}

/**
 * Spending breakdown by category
 */
export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  averageTransaction: number;
}

/**
 * Spending breakdown by merchant
 */
export interface MerchantBreakdown {
  merchantName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  lastTransactionDate: number;
}

/**
 * Daily balance snapshot
 */
export interface DailyBalance {
  date: number;
  balance: number;
  credits: number;
  debits: number;
}

// ==================== Error Types ====================

/**
 * Custom error codes for FinanceKit operations
 */
export enum FinanceKitErrorCode {
  Unavailable = 'FINANCEKIT_UNAVAILABLE',
  Unauthorized = 'FINANCEKIT_UNAUTHORIZED',
  InvalidAccountId = 'INVALID_ACCOUNT_ID',
  AccountNotFound = 'ACCOUNT_NOT_FOUND',
  InvalidDateRange = 'INVALID_DATE_RANGE',
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  NetworkError = 'NETWORK_ERROR',
  Unknown = 'UNKNOWN_ERROR',
}

/**
 * FinanceKit error with additional context
 */
export interface FinanceKitError extends Error {
  code: FinanceKitErrorCode;
  details?: Record<string, any>;
}

// ==================== Module Interface ====================

/**
 * Main interface for the ExpoFinanceKit module
 */
export interface ExpoFinanceKitModule {
  // Constants
  isAvailable: boolean;
  
  // Authorization
  requestAuthorization(): Promise<boolean>;
  getAuthorizationStatus(): Promise<AuthorizationStatus>;
  
  // Data fetching
  getAccounts(options?: AccountQueryOptions): Promise<Account[]>;
  getTransactions(options?: TransactionQueryOptions): Promise<Transaction[]>;
  getBalances(options?: BalanceQueryOptions): Promise<AccountBalance[]>;
  
  // Event handling
  addListener(eventName: keyof ExpoFinanceKitModuleEvents, listener: Function): void;
  removeListener(eventName: keyof ExpoFinanceKitModuleEvents, listener: Function): void;
  removeAllListeners(eventName?: keyof ExpoFinanceKitModuleEvents): void;
}

// ==================== Utility Types ====================

/**
 * Represents a monetary amount with currency
 */
export interface Money {
  amount: number;
  currencyCode: string;
}

/**
 * Represents a date range for queries
 */
export interface DateRange {
  startDate: Date | number;
  endDate: Date | number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Sort options
 */
export interface SortOptions<T> {
  sortBy?: T;
  sortOrder?: 'asc' | 'desc';
}
