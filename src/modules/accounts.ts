/**
 * Account management module for Expo Finance Kit
 * Handles fetching and managing financial account data
 */

import ExpoFinanceKit from '../ExpoFinanceKitModule';
import { 
  Account, 
  AccountQueryOptions, 
  AccountWithMetadata,
  FinanceKitErrorCode 
} from '../ExpoFinanceKit.types';
import { ensureAuthorized } from '../helpers';
import { validateAccountQueryOptions, transformAccount } from '../utils/validators';
import { createFinanceKitError } from '../utils/errors';

/**
 * Fetches all authorized financial accounts
 * @returns Promise resolving to array of accounts
 * @throws {FinanceKitError} If unauthorized or unavailable
 */
export async function getAccounts(): Promise<Account[]> {
  const isAuthorized = await ensureAuthorized();
  if (!isAuthorized) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unauthorized,
      'User has not authorized access to financial data'
    );
  }

  try {
    const accounts = await ExpoFinanceKit.getAccounts();
    return accounts.map(transformAccount);
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to fetch accounts',
      { originalError: error }
    );
  }
}

/**
 * Fetches accounts with filtering options
 * @param options - Query options for filtering accounts
 * @returns Promise resolving to filtered array of accounts
 */
export async function getAccountsWithOptions(
  options: AccountQueryOptions
): Promise<Account[]> {
  validateAccountQueryOptions(options);
  
  const accounts = await getAccounts();
  
  return accounts.filter(account => {
    if (options.accountTypes && !options.accountTypes.includes(account.accountType)) {
      return false;
    }
    
    if (options.institutionNames && !options.institutionNames.includes(account.institutionName)) {
      return false;
    }
    
    if (options.currencyCodes && !options.currencyCodes.includes(account.currencyCode)) {
      return false;
    }
    
    return true;
  });
}

/**
 * Fetches a single account by ID
 * @param accountId - The account ID to fetch
 * @returns Promise resolving to the account or null if not found
 */
export async function getAccountById(accountId: string): Promise<Account | null> {
  if (!accountId || typeof accountId !== 'string') {
    throw createFinanceKitError(
      FinanceKitErrorCode.InvalidAccountId,
      'Invalid account ID provided'
    );
  }

  const accounts = await getAccounts();
  const account = accounts.find(acc => acc.id === accountId);
  
  return account || null;
}

/**
 * Fetches accounts with additional metadata
 * @returns Promise resolving to accounts with metadata
 */
export async function getAccountsWithMetadata(): Promise<AccountWithMetadata[]> {
  const accounts = await getAccounts();
  
  // In a real implementation, this would fetch additional data
  // For now, we'll return the accounts with placeholder metadata
  return accounts.map(account => ({
    ...account,
    isActive: true,
    lastTransactionDate: Date.now(),
    accountNumber: undefined, // Would be fetched separately if available
  }));
}

/**
 * Groups accounts by institution
 * @returns Promise resolving to a map of institution names to accounts
 */
export async function getAccountsByInstitution(): Promise<Map<string, Account[]>> {
  const accounts = await getAccounts();
  const groupedAccounts = new Map<string, Account[]>();
  
  accounts.forEach(account => {
    const existing = groupedAccounts.get(account.institutionName) || [];
    groupedAccounts.set(account.institutionName, [...existing, account]);
  });
  
  return groupedAccounts;
}

/**
 * Gets the primary account (first asset account found)
 * @returns Promise resolving to the primary account or null
 */
export async function getPrimaryAccount(): Promise<Account | null> {
  const accounts = await getAccountsWithOptions({ 
    accountTypes: ['asset' as any] 
  });
  
  return accounts.length > 0 ? accounts[0] : null;
}

/**
 * Refreshes account data (forces a new fetch)
 * @returns Promise resolving to refreshed accounts
 */
export async function refreshAccounts(): Promise<Account[]> {
  // In a real implementation, this might clear cache or force a sync
  return getAccounts();
}