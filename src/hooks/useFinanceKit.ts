/**
 * React hooks for Expo Finance Kit
 * Provides easy integration with React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Account,
  Transaction,
  AccountBalance,
  AuthorizationStatus,
  TransactionQueryOptions,
  AccountQueryOptions,
  LastSyncInfo,
} from '../ExpoFinanceKit.types';
import {
  getAccounts,
  getAccountsWithOptions,
  getAccountById,
} from '../modules/accounts';
import {
  getTransactions,
  getRecentTransactions,
  getTransactionsByAccount,
} from '../modules/transactions';
import {
  getBalances,
  getBalanceByAccount,
  getTotalBalance,
} from '../modules/balances';
import {
  getLastSyncInfo,
  backgroundDataListener,
  isBackgroundSyncAvailable,
} from '../modules/backgroundSync';
import {
  getAuthorizationStatus,
  requestAuthorization,
  authorizationListener,
} from '../modules/authorization';

/**
 * Hook for managing authorization status
 */
export function useAuthorizationStatus() {
  const [status, setStatus] = useState<AuthorizationStatus>('notDetermined');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial status
    getAuthorizationStatus()
      .then(setStatus)
      .catch(setError)
      .finally(() => setLoading(false));

    // Listen for changes
    const unsubscribe = authorizationListener.addStatusChangeListener((payload) => {
      setStatus(payload.status);
    });

    return unsubscribe;
  }, []);

  const requestAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestAuthorization();
      setStatus(result.status);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    status,
    loading,
    error,
    requestAuthorization: requestAuth,
    isAuthorized: status === 'authorized',
  };
}

/**
 * Hook for fetching accounts
 */
export function useAccounts(options?: AccountQueryOptions) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = options 
        ? await getAccountsWithOptions(options)
        : await getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
  };
}

/**
 * Hook for fetching a single account
 */
export function useAccount(accountId: string) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    getAccountById(accountId)
      .then(setAccount)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [accountId]);

  return {
    account,
    loading,
    error,
  };
}

/**
 * Hook for fetching transactions
 */
export function useTransactions(options?: TransactionQueryOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTransactions(optionsRef.current);
      setTransactions(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    optionsRef.current = options;
    fetchTransactions();
  }, [options, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

/**
 * Hook for fetching recent transactions
 */
export function useRecentTransactions(limit: number = 50) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecentTransactions(limit);
      setTransactions(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

/**
 * Hook for fetching account balance
 */
export function useAccountBalance(accountId?: string) {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = accountId 
        ? await getBalanceByAccount(accountId)
        : (await getBalances())[0] || null;
      setBalance(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Hook for fetching total balance across all accounts
 */
export function useTotalBalance() {
  const [totalBalance, setTotalBalance] = useState<{
    total: number;
    byCurrency: Map<string, number>;
    accounts: AccountBalance[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTotalBalance();
      setTotalBalance(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    totalBalance,
    loading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Hook for real-time transaction updates
 */
export function useTransactionStream(
  accountId?: string,
  pollingInterval: number = 30000 // 30 seconds
) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = accountId
        ? await getTransactionsByAccount(accountId, { limit: 100 })
        : await getRecentTransactions(100);
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    // Initial fetch
    fetchTransactions();

    // Set up polling
    intervalRef.current = setInterval(fetchTransactions, pollingInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTransactions, pollingInterval]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

/**
 * Hook to monitor background sync status
 * @param options - Hook options
 * @returns Background sync status and utilities
 */
export function useBackgroundSync(options?: {
  autoRefreshOnChange?: boolean;
  onDataChanged?: () => void | Promise<void>;
}) {
  const [lastSyncInfo, setLastSyncInfo] = useState<LastSyncInfo>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSyncInfo = useCallback(async () => {
    try {
      const info = await getLastSyncInfo();
      setLastSyncInfo(info);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSyncInfo();

    // Set up listener for background changes
    const unsubscribe = backgroundDataListener.addListener(async (payload) => {
      console.log('Background data changed:', payload);
      
      // Refresh sync info
      await fetchSyncInfo();
      
      // Call custom handler if provided
      if (options?.onDataChanged) {
        await options.onDataChanged();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchSyncInfo, options]);

  return {
    lastSyncInfo,
    loading,
    error,
    refetch: fetchSyncInfo,
    isBackgroundSyncAvailable: isBackgroundSyncAvailable(),
  };
}