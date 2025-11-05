/**
 * Transaction monitoring module for Expo Finance Kit
 * Handles real-time transaction change streams from FinanceKit
 */

import { NativeEventEmitter, Platform } from 'react-native';
import ExpoFinanceKit from '../ExpoFinanceKitModule';
import { 
  TransactionsChangedPayload, 
  Transaction,
  FinanceKitErrorCode 
} from '../ExpoFinanceKit.types';
import { ensureAuthorized } from '../helpers';
import { createFinanceKitError } from '../utils/errors';

/**
 * Callback type for transaction change events
 */
export type TransactionChangeCallback = (payload: TransactionsChangedPayload) => void;

/**
 * Transaction monitoring manager
 * Provides real-time updates when transactions are inserted, updated, or deleted
 */
class TransactionMonitor {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: Map<string, TransactionChangeCallback> = new Map();
  private isMonitoring: boolean = false;

  constructor() {
    if (Platform.OS === 'ios') {
      this.eventEmitter = new NativeEventEmitter(ExpoFinanceKit as any);
    }
  }

  /**
   * Start monitoring transactions for specified accounts
   * If no account IDs are provided, monitors all accounts
   * @param accountIds - Optional array of account IDs to monitor
   * @returns Promise that resolves when monitoring starts
   */
  async startMonitoring(accountIds?: string[]): Promise<void> {
    const isAuthorized = await ensureAuthorized();
    if (!isAuthorized) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unauthorized,
        'User has not authorized access to financial data'
      );
    }

    if (Platform.OS !== 'ios') {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unavailable,
        'Transaction monitoring is only available on iOS'
      );
    }

    try {
      await ExpoFinanceKit.startMonitoringTransactions(accountIds);
      this.isMonitoring = true;
    } catch (error) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        'Failed to start transaction monitoring',
        { originalError: error }
      );
    }
  }

  /**
   * Stop monitoring transactions
   * @returns Promise that resolves when monitoring stops
   */
  async stopMonitoring(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      await ExpoFinanceKit.stopMonitoringTransactions();
      this.isMonitoring = false;
    } catch (error) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        'Failed to stop transaction monitoring',
        { originalError: error }
      );
    }
  }

  /**
   * Add a listener for transaction changes
   * @param callback - Callback function to invoke when transactions change
   * @returns Unsubscribe function
   */
  addListener(callback: TransactionChangeCallback): () => void {
    if (Platform.OS !== 'ios' || !this.eventEmitter) {
      return () => {};
    }

    const listenerId = `transaction_change_${Date.now()}_${Math.random()}`;
    
    // Store the callback
    this.listeners.set(listenerId, callback);

    // Set up native event listener
    const subscription = this.eventEmitter.addListener(
      'onTransactionsChanged',
      (payload: TransactionsChangedPayload) => {
        // Transform the payload to ensure proper types
        const transformedPayload: TransactionsChangedPayload = {
          accountId: payload.accountId,
          timestamp: payload.timestamp,
          inserted: payload.inserted?.map(transformTransaction) || [],
          updated: payload.updated?.map(transformTransaction) || [],
          deleted: payload.deleted || [],
          hasHistoryToken: payload.hasHistoryToken,
        };
        
        callback(transformedPayload);
      }
    );

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listenerId);
      subscription.remove();
    };
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('onTransactionsChanged');
      this.listeners.clear();
    }
  }

  /**
   * Check if monitoring is currently active
   */
  get monitoring(): boolean {
    return this.isMonitoring;
  }
}

/**
 * Transform raw transaction data to ensure proper type safety
 */
function transformTransaction(data: any): Transaction {
  return {
    id: data.id,
    accountId: data.accountId,
    amount: typeof data.amount === 'number' ? data.amount : 0,
    currencyCode: data.currencyCode || 'USD',
    transactionDate: typeof data.transactionDate === 'number' 
      ? data.transactionDate 
      : new Date(data.transactionDate || Date.now()).getTime(),
    merchantName: data.merchantName,
    transactionDescription: data.transactionDescription || '',
    merchantCategoryCode: data.merchantCategoryCode,
    status: data.status || 'unknown',
    transactionType: data.transactionType || 'unknown',
    creditDebitIndicator: data.creditDebitIndicator || 'debit',
  } as Transaction;
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor();

/**
 * Start monitoring transactions for specified accounts
 * @param accountIds - Optional array of account IDs to monitor
 */
export async function startMonitoringTransactions(accountIds?: string[]): Promise<void> {
  return transactionMonitor.startMonitoring(accountIds);
}

/**
 * Stop monitoring transactions
 */
export async function stopMonitoringTransactions(): Promise<void> {
  return transactionMonitor.stopMonitoring();
}

/**
 * Add a listener for transaction changes
 * @param callback - Callback function to invoke when transactions change
 * @returns Unsubscribe function
 */
export function addTransactionChangeListener(
  callback: TransactionChangeCallback
): () => void {
  return transactionMonitor.addListener(callback);
}

/**
 * Remove all transaction change listeners
 */
export function removeAllTransactionChangeListeners(): void {
  transactionMonitor.removeAllListeners();
}

/**
 * Check if transaction monitoring is currently active
 */
export function isMonitoringTransactions(): boolean {
  return transactionMonitor.monitoring;
}

/**
 * Clear history token for an account (resets monitoring state)
 * @param accountId - Account ID to clear history token for
 */
export async function clearHistoryToken(accountId: string): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    await ExpoFinanceKit.clearHistoryToken(accountId);
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to clear history token',
      { originalError: error }
    );
  }
}

/**
 * Set the app group identifier for background delivery
 * This should match the identifier used in your Expo config plugin
 * @param identifier - App group identifier (e.g., "group.com.yourapp.financekit")
 */
export async function setAppGroupIdentifier(identifier: string): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    await ExpoFinanceKit.setAppGroupIdentifier(identifier);
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to set app group identifier',
      { originalError: error }
    );
  }
}

/**
 * Process pending changes that were stored during background sync
 * This is automatically called when the app becomes active, but can be called manually
 */
export async function processPendingChanges(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }

  try {
    await ExpoFinanceKit.processPendingChanges();
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to process pending changes',
      { originalError: error }
    );
  }
}

