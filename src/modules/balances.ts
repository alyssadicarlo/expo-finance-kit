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
    const balances = await ExpoFinanceKit.getBalance({});
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

  const balances = await getBalances({ accountIds: [accountId] });
  return balances.length > 0 ? balances[0] : null;
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
  const balances = await getBalances();
  const byCurrency = new Map<string, number>();
  let totalInUSD = 0; // Would need exchange rates for accurate conversion

  balances.forEach(balance => {
    const current = byCurrency.get(balance.currencyCode) || 0;
    byCurrency.set(balance.currencyCode, current + balance.amount);
    
    // For now, just sum all amounts (would need currency conversion)
    totalInUSD += balance.amount;
  });

  return {
    total: totalInUSD,
    byCurrency,
    accounts: balances,
  };
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