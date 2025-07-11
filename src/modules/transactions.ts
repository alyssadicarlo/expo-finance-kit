/**
 * Transaction management module for Expo Finance Kit
 * Handles fetching and managing financial transaction data
 */

import ExpoFinanceKit from '../ExpoFinanceKitModule';
import { 
  Transaction, 
  TransactionQueryOptions,
  TransactionStatus,
  CreditDebitIndicator,
  FinanceKitErrorCode 
} from '../ExpoFinanceKit.types';
import { ensureAuthorized } from '../helpers';
import { validateTransactionQueryOptions, transformTransaction } from '../utils/validators';
import { createFinanceKitError } from '../utils/errors';

/**
 * Fetches transactions based on query options
 * @param options - Query options for filtering transactions
 * @returns Promise resolving to array of transactions
 */
export async function getTransactions(
  options: TransactionQueryOptions = {}
): Promise<Transaction[]> {
  const isAuthorized = await ensureAuthorized();
  if (!isAuthorized) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unauthorized,
      'User has not authorized access to financial data'
    );
  }

  validateTransactionQueryOptions(options);

  try {
    // Convert dates to timestamps
    const startDate = options.startDate 
      ? (options.startDate instanceof Date ? options.startDate.getTime() : options.startDate)
      : undefined;
    const endDate = options.endDate
      ? (options.endDate instanceof Date ? options.endDate.getTime() : options.endDate)
      : undefined;

    // Fetch transactions from native module
    const transactions = await ExpoFinanceKit.getTransactions(
      options.accountId || undefined,
      startDate,
      endDate
    );

    // Transform and apply additional filters
    let filteredTransactions = transactions.map(transformTransaction);

    // Apply additional filters not supported natively
    if (options.minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter((t: Transaction) => t.amount >= options.minAmount!);
    }

    if (options.maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter((t: Transaction) => t.amount <= options.maxAmount!);
    }

    if (options.merchantName) {
      const searchTerm = options.merchantName.toLowerCase();
      filteredTransactions = filteredTransactions.filter((t: Transaction) => 
        t.merchantName?.toLowerCase().includes(searchTerm) ||
        t.transactionDescription.toLowerCase().includes(searchTerm)
      );
    }

    if (options.transactionTypes && options.transactionTypes.length > 0) {
      filteredTransactions = filteredTransactions.filter((t: Transaction) => 
        options.transactionTypes!.includes(t.transactionType)
      );
    }

    if (options.statuses && options.statuses.length > 0) {
      filteredTransactions = filteredTransactions.filter((t: Transaction) => 
        options.statuses!.includes(t.status)
      );
    }

    if (options.creditDebitIndicator) {
      filteredTransactions = filteredTransactions.filter((t: Transaction) => 
        t.creditDebitIndicator === options.creditDebitIndicator
      );
    }

    if (options.merchantCategoryCodes && options.merchantCategoryCodes.length > 0) {
      filteredTransactions = filteredTransactions.filter((t: Transaction) => 
        t.merchantCategoryCode && options.merchantCategoryCodes!.includes(t.merchantCategoryCode)
      );
    }

    // Apply sorting
    if (options.sortBy) {
      filteredTransactions.sort((a: Transaction, b: Transaction) => {
        let compareValue = 0;
        
        switch (options.sortBy) {
          case 'date':
            compareValue = a.transactionDate - b.transactionDate;
            break;
          case 'amount':
            compareValue = a.amount - b.amount;
            break;
          case 'merchantName':
            compareValue = (a.merchantName || '').localeCompare(b.merchantName || '');
            break;
        }
        
        return options.sortOrder === 'desc' ? -compareValue : compareValue;
      });
    }

    // Apply pagination
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit || filteredTransactions.length;
      filteredTransactions = filteredTransactions.slice(offset, offset + limit);
    }

    return filteredTransactions;
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to fetch transactions',
      { originalError: error }
    );
  }
}

/**
 * Fetches transactions for a specific account
 * @param accountId - The account ID to fetch transactions for
 * @param options - Additional query options
 * @returns Promise resolving to array of transactions
 */
export async function getTransactionsByAccount(
  accountId: string,
  options: Omit<TransactionQueryOptions, 'accountId'> = {}
): Promise<Transaction[]> {
  if (!accountId || typeof accountId !== 'string') {
    throw createFinanceKitError(
      FinanceKitErrorCode.InvalidAccountId,
      'Invalid account ID provided'
    );
  }

  return getTransactions({ ...options, accountId });
}

/**
 * Fetches recent transactions (last 30 days)
 * @param limit - Maximum number of transactions to return
 * @returns Promise resolving to array of recent transactions
 */
export async function getRecentTransactions(limit: number = 50): Promise<Transaction[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return getTransactions({
    startDate: thirtyDaysAgo,
    limit,
    sortBy: 'date',
    sortOrder: 'desc',
  });
}

/**
 * Fetches transactions for a specific date range
 * @param startDate - Start date for the range
 * @param endDate - End date for the range
 * @returns Promise resolving to array of transactions
 */
export async function getTransactionsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  if (startDate > endDate) {
    throw createFinanceKitError(
      FinanceKitErrorCode.InvalidDateRange,
      'Start date must be before end date'
    );
  }

  return getTransactions({
    startDate,
    endDate,
    sortBy: 'date',
    sortOrder: 'desc',
  });
}

/**
 * Fetches all income transactions (credits)
 * @param options - Additional query options
 * @returns Promise resolving to array of income transactions
 */
export async function getIncomeTransactions(
  options: Omit<TransactionQueryOptions, 'creditDebitIndicator'> = {}
): Promise<Transaction[]> {
  return getTransactions({
    ...options,
    creditDebitIndicator: CreditDebitIndicator.Credit,
  });
}

/**
 * Fetches all expense transactions (debits)
 * @param options - Additional query options
 * @returns Promise resolving to array of expense transactions
 */
export async function getExpenseTransactions(
  options: Omit<TransactionQueryOptions, 'creditDebitIndicator'> = {}
): Promise<Transaction[]> {
  return getTransactions({
    ...options,
    creditDebitIndicator: CreditDebitIndicator.Debit,
  });
}

/**
 * Fetches pending transactions
 * @param options - Additional query options
 * @returns Promise resolving to array of pending transactions
 */
export async function getPendingTransactions(
  options: Omit<TransactionQueryOptions, 'statuses'> = {}
): Promise<Transaction[]> {
  return getTransactions({
    ...options,
    statuses: [TransactionStatus.Pending],
  });
}

/**
 * Searches transactions by merchant name or description
 * @param searchTerm - The search term
 * @param options - Additional query options
 * @returns Promise resolving to array of matching transactions
 */
export async function searchTransactions(
  searchTerm: string,
  options: Omit<TransactionQueryOptions, 'merchantName'> = {}
): Promise<Transaction[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Search term cannot be empty'
    );
  }

  return getTransactions({
    ...options,
    merchantName: searchTerm,
  });
}

/**
 * Groups transactions by date
 * @param transactions - Array of transactions to group
 * @returns Map of date strings to transaction arrays
 */
export function groupTransactionsByDate(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach(transaction => {
    const date = new Date(transaction.transactionDate).toDateString();
    const existing = grouped.get(date) || [];
    grouped.set(date, [...existing, transaction]);
  });

  return grouped;
}

/**
 * Calculates transaction statistics
 * @param transactions - Array of transactions to analyze
 * @returns Object containing transaction statistics
 */
export function calculateTransactionStats(transactions: Transaction[]) {
  const stats = {
    total: transactions.length,
    totalAmount: 0,
    totalIncome: 0,
    totalExpenses: 0,
    averageTransaction: 0,
    largestExpense: 0,
    largestIncome: 0,
  };

  transactions.forEach(transaction => {
    stats.totalAmount += transaction.amount;

    if (transaction.creditDebitIndicator === CreditDebitIndicator.Credit) {
      stats.totalIncome += transaction.amount;
      stats.largestIncome = Math.max(stats.largestIncome, transaction.amount);
    } else {
      stats.totalExpenses += transaction.amount;
      stats.largestExpense = Math.max(stats.largestExpense, transaction.amount);
    }
  });

  stats.averageTransaction = stats.total > 0 ? stats.totalAmount / stats.total : 0;

  return stats;
}