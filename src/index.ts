/**
 * Expo Finance Kit - A comprehensive library for Apple FinanceKit integration
 * Provides type-safe, modular access to financial data on iOS devices
 */

// Core module exports
export { default as ExpoFinanceKit } from './ExpoFinanceKitModule';

// Type exports
export * from './ExpoFinanceKit.types';

// Authorization module
export {
  requestAuthorization,
  getAuthorizationStatus,
  isFinanceKitAvailable,
  ensureAuthorized,
  authorizationListener,
  waitForAuthorization,
  getAuthorizationStatusDescription,
  canRequestAuthorization,
} from './modules/authorization';

// Account management
export {
  getAccounts,
  getAccountsWithOptions,
  getAccountById,
  getAccountsWithMetadata,
  getAccountsByInstitution,
  getPrimaryAccount,
  refreshAccounts,
} from './modules/accounts';

// Transaction management
export {
  getTransactions,
  getTransactionsByAccount,
  getRecentTransactions,
  getTransactionsByDateRange,
  getIncomeTransactions,
  getExpenseTransactions,
  getPendingTransactions,
  searchTransactions,
  groupTransactionsByDate,
  calculateTransactionStats,
} from './modules/transactions';

// Balance management
export {
  getBalances,
  getBalanceByAccount,
  getTotalBalance,
  getBalanceSummary,
  monitorBalanceChanges,
  getBalanceHistory,
} from './modules/balances';

// Utilities
export {
  // Validators
  validateAccountQueryOptions,
  validateTransactionQueryOptions,
  validateBalanceQueryOptions,
  isValidCurrencyCode,
  isValidAccountId,
  sanitizeTransactionDescription,
  // Type guards
  isAuthorizationStatus,
  isTransaction,
  isAccount,
} from './utils/validators';

export {
  // Error handling
  createFinanceKitError,
  isFinanceKitError,
  getUserFriendlyErrorMessage,
  withErrorHandling,
  logError,
  ErrorRecovery,
} from './utils/errors';

export {
  // Formatters
  formatCurrency,
  formatDate,
  formatRelativeDate,
  formatTransaction,
  formatMerchantCategory,
  formatAccountName,
  formatPercentage,
  formatNumber,
  abbreviateNumber,
  formatDuration,
  formatBalanceChange,
} from './utils/formatters';

export {
  // Analytics
  generateSpendingInsights,
  calculateSpendingTrends,
  findUnusualTransactions,
  calculateSavingsRate,
  predictFutureBalance,
} from './utils/analytics';

// React hooks
export {
  useAuthorizationStatus,
  useAccounts,
  useAccount,
  useTransactions,
  useRecentTransactions,
  useAccountBalance,
  useTotalBalance,
  useTransactionStream,
} from './hooks/useFinanceKit';

// Cache utilities
export {
  MemoryCache,
  accountCache,
  transactionCache,
  balanceCache,
  clearAllCaches,
} from './utils/cache';

// Legacy exports for backward compatibility
export { requestAuthorizationWithStatus } from './helpers';

// Convenience namespace exports
export * as Accounts from './modules/accounts';
export * as Transactions from './modules/transactions';
export * as Balances from './modules/balances';
export * as Authorization from './modules/authorization';
export * as Formatters from './utils/formatters';
export * as Analytics from './utils/analytics';
export * as Validators from './utils/validators';
export * as Errors from './utils/errors';
export * as Cache from './utils/cache';
export * as Hooks from './hooks/useFinanceKit';
