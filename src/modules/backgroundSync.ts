/**
 * Background sync functionality for FinanceKit
 * Handles data synchronization from background extension
 */

import ExpoFinanceKit from '../ExpoFinanceKitModule';
import type { LastSyncInfo, FinanceDataChangedPayload } from '../ExpoFinanceKit.types';
import { createFinanceKitError } from '../utils/errors';
import { FinanceKitErrorCode } from '../ExpoFinanceKit.types';

/**
 * Gets the last sync information from the background extension
 * @returns Promise resolving to last sync info
 */
export async function getLastSyncInfo(): Promise<LastSyncInfo> {
  try {
    const syncInfo = await ExpoFinanceKit.getLastSyncInfo();
    return syncInfo || {};
  } catch (error) {
    throw createFinanceKitError(
      FinanceKitErrorCode.Unknown,
      'Failed to get sync info',
      { originalError: error }
    );
  }
}

/**
 * Listener for background data changes
 */
class BackgroundDataListener {
  private listeners: Map<string, (payload: FinanceDataChangedPayload) => void> = new Map();
  
  /**
   * Adds a listener for background data changes
   * @param callback - Function to call when data changes
   * @returns Unsubscribe function
   */
  addListener(callback: (payload: FinanceDataChangedPayload) => void): () => void {
    const listenerId = Date.now().toString() + Math.random().toString(36);
    
    const listener = (payload: FinanceDataChangedPayload) => {
      callback(payload);
    };
    
    this.listeners.set(listenerId, listener);
    
    if (ExpoFinanceKit.addListener) {
      ExpoFinanceKit.addListener('onFinanceDataChanged', listener);
    }
    
    return () => {
      this.removeListener(listenerId);
    };
  }
  
  /**
   * Removes a specific listener
   * @param listenerId - ID of the listener to remove
   */
  private removeListener(listenerId: string): void {
    const listener = this.listeners.get(listenerId);
    if (listener && ExpoFinanceKit.removeListener) {
      ExpoFinanceKit.removeListener('onFinanceDataChanged', listener);
      this.listeners.delete(listenerId);
    }
  }
  
  /**
   * Removes all background data listeners
   */
  removeAllListeners(): void {
    if (ExpoFinanceKit.removeAllListeners) {
      ExpoFinanceKit.removeAllListeners('onFinanceDataChanged');
    }
    this.listeners.clear();
  }
}

export const backgroundDataListener = new BackgroundDataListener();

/**
 * Sets up automatic refresh on background data changes
 * @param onRefresh - Callback to execute when data changes
 * @returns Unsubscribe function
 */
export function setupAutoRefresh(onRefresh: () => void | Promise<void>): () => void {
  return backgroundDataListener.addListener(async (payload) => {
    console.log('Background data changed:', payload);
    await onRefresh();
  });
}

/**
 * Checks if background sync is available
 * @returns Whether background sync is supported
 */
export function isBackgroundSyncAvailable(): boolean {
  return ExpoFinanceKit.isAvailable && typeof ExpoFinanceKit.getLastSyncInfo === 'function';
}

/**
 * Gets the time since last sync for a specific data type
 * @param syncType - Type of sync to check ('accounts', 'transactions', or 'balances')
 * @returns Time in milliseconds since last sync, or null if never synced
 */
export async function getTimeSinceLastSync(syncType: 'accounts' | 'transactions' | 'balances'): Promise<number | null> {
  const syncInfo = await getLastSyncInfo();
  const key = `last_sync_${syncType}` as keyof LastSyncInfo;
  const syncData = syncInfo[key];
  
  if (!syncData) {
    return null;
  }
  
  const lastSyncDate = 'timestamp' in syncData 
    ? new Date(syncData.timestamp).getTime()
    : new Date(syncData.lastSyncDate).getTime();
    
  return Date.now() - lastSyncDate;
}

/**
 * Checks if data needs refresh based on age
 * @param syncType - Type of sync to check
 * @param maxAgeMs - Maximum age in milliseconds before refresh is needed
 * @returns Whether data needs refresh
 */
export async function needsRefresh(
  syncType: 'accounts' | 'transactions' | 'balances',
  maxAgeMs: number = 3600000 // 1 hour default
): Promise<boolean> {
  const timeSinceSync = await getTimeSinceLastSync(syncType);
  return timeSinceSync === null || timeSinceSync > maxAgeMs;
}