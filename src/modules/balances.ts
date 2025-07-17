/**
 * Balance management module for Expo Finance Kit
 * Handles fetching and managing account balance data
 */

import ExpoFinanceKit from '../ExpoFinanceKitModule';
import { 
  AccountBalance,
  BalanceQueryOptions,
  FinanceKitErrorCode
} from '../ExpoFinanceKit.types';
import { ensureAuthorized } from '../helpers';
import { validateBalanceQueryOptions, transformBalance } from '../utils/validators';
import { createFinanceKitError } from '../utils/errors';

/**
 * Fetches account balances
 * @param options - Query options for filtering balances
 * @returns Promise resolving to array of account balances
 */
export async function getBalances(
  options?: BalanceQueryOptions
): Promise<AccountBalance[]> {
  const isAuthorized = await ensureAuthorized();
  if (!isAuthorized) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unauthorized,
      'User has not authorized access to financial data'
    );
  }

  if (options) {
    validateBalanceQueryOptions(options);
  }

  try {
    const balances = await ExpoFinanceKit.getBalances();
    let filteredBalances = balances.map(transformBalance);

    // Apply filters
    if (options?.accountIds && options.accountIds.length > 0) {
      filteredBalances = filteredBalances.filter((balance: AccountBalance) =>
        options.accountIds!.includes(balance.accountId)
      );
    }

    return filteredBalances;
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to fetch balances',
      { originalError: error }
    );
  }
}

/**
 * Fetches balance for a specific account
 * @param accountId - The account ID to fetch balance for
 * @returns Promise resolving to the account balance or null
 */
export async function getBalanceByAccount(accountId: string): Promise<AccountBalance | null> {
  if (!accountId || typeof accountId !== 'string') {
    throw createFinanceKitError(
      FinanceKitErrorCode.InvalidAccountId,
      'Invalid account ID provided'
    );
  }

  const isAuthorized = await ensureAuthorized();
  if (!isAuthorized) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unauthorized,
      'User has not authorized access to financial data'
    );
  }

  try {
    // Use the new native method that gets balance for specific account
    const balance = await ExpoFinanceKit.getBalanceForAccount(accountId);
    return balance ? transformBalance(balance) : null;
  } catch (error) {
    // If the new method is not available, fall back to filtering
    if (error && typeof error === 'object' && 'message' in error && 
        typeof (error as any).message === 'string' &&
        (error as any).message.includes('getBalanceForAccount')) {
      const balances = await getBalances();
      const filtered = balances.filter(b => b.accountId === accountId);
      return filtered.length > 0 ? filtered[0] : null;
    }
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to fetch balance for account',
      { originalError: error }
    );
  }
}

/**
 * Fetches all balances and calculates total
 * @returns Promise resolving to total balance across all accounts
 */
export async function getTotalBalance(): Promise<{
  total: number;
  byCurrency: Map<string, number>;
  accounts: AccountBalance[];
}> {
  const isAuthorized = await ensureAuthorized();
  if (!isAuthorized) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unauthorized,
      'User has not authorized access to financial data'
    );
  }

  try {
    // First get all accounts
    const accounts = await ExpoFinanceKit.getAccounts();
    
    // Get current balance for each account
    const balancePromises = accounts.map(async (account: any) => {
      try {
        const balance = await ExpoFinanceKit.getBalanceForAccount(account.id);
        return balance ? transformBalance(balance) : null;
      } catch (error) {
        console.warn(`Failed to get balance for account ${account.id}:`, error);
        return null;
      }
    });
    
    const balanceResults = await Promise.all(balancePromises);
    const validBalances = balanceResults.filter((b): b is AccountBalance => b !== null);
    
    const byCurrency = new Map<string, number>();
    let totalInUSD = 0; // Would need exchange rates for accurate conversion

    validBalances.forEach(balance => {
      const current = byCurrency.get(balance.currencyCode) || 0;
      byCurrency.set(balance.currencyCode, current + balance.amount);
      
      // For now, just sum all amounts (would need currency conversion)
      totalInUSD += balance.amount;
    });

    return {
      total: totalInUSD,
      byCurrency,
      accounts: validBalances,
    };
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to fetch total balance',
      { originalError: error }
    );
  }
}

/**
 * Gets balance summary for all accounts
 * @returns Promise resolving to balance summary
 */
export async function getBalanceSummary(): Promise<{
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accountCount: number;
  lastUpdated: number;
}> {
  const balances = await getBalances();
  
  // In a real implementation, we'd correlate with account types
  // For now, we'll use positive/negative balance as a proxy
  const totalAssets = balances
    .filter(b => b.amount > 0)
    .reduce((sum, b) => sum + b.amount, 0);
    
  const totalLiabilities = Math.abs(
    balances
      .filter(b => b.amount < 0)
      .reduce((sum, b) => sum + b.amount, 0)
  );

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    accountCount: balances.length,
    lastUpdated: Date.now(),
  };
}

/**
 * Monitors balance changes over time
 * @param accountId - Account to monitor
 * @param callback - Callback function for balance updates
 * @returns Function to stop monitoring
 */
export function monitorBalanceChanges(
  accountId: string,
  callback: (balance: AccountBalance) => void
): () => void {
  let intervalId: ReturnType<typeof setInterval>;
  let lastBalance: number | null = null;

  const checkBalance = async () => {
    try {
      const balance = await getBalanceByAccount(accountId);
      if (balance && balance.amount !== lastBalance) {
        lastBalance = balance.amount;
        callback(balance);
      }
    } catch (error) {
      console.error('Error monitoring balance:', error);
    }
  };

  // Check every 5 minutes
  intervalId = setInterval(checkBalance, 5 * 60 * 1000);
  
  // Initial check
  checkBalance();

  // Return cleanup function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Gets historical balance data (simulated)
 * @param accountId - Account ID to get history for
 * @param days - Number of days of history
 * @returns Promise resolving to historical balance data
 */
export async function getBalanceHistory(
  accountId: string,
  days: number = 30
): Promise<Array<{ date: number; balance: number }>> {
  // This would typically fetch from a data source that tracks balance history
  // For now, we'll simulate it
  const currentBalance = await getBalanceByAccount(accountId);
  if (!currentBalance) {
    throw createFinanceKitError(
      FinanceKitErrorCode.AccountNotFound,
      'Account not found'
    );
  }

  const history: Array<{ date: number; balance: number }> = [];
  const dailyChange = (Math.random() - 0.5) * 100; // Simulate daily changes

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const variance = currentBalance.amount * 0.01 * (Math.random() - 0.5);
    const balance = currentBalance.amount + (dailyChange * i) + variance;
    
    history.push({
      date: date.getTime(),
      balance: Math.round(balance * 100) / 100,
    });
  }

  return history;
}