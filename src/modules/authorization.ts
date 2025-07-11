/**
 * Authorization management module for Expo Finance Kit
 * Handles FinanceKit authorization flows and status management
 */

import ExpoFinanceKit from '../ExpoFinanceKitModule';
import { 
  AuthorizationStatus,
  AuthorizationResult,
  AuthorizationStatusChangedPayload,
  FinanceKitErrorCode
} from '../ExpoFinanceKit.types';
import { createFinanceKitError } from '../utils/errors';

/**
 * Requests authorization to access financial data
 * @returns Promise resolving to authorization result
 */
export async function requestAuthorization(): Promise<AuthorizationResult> {
  try {
    const granted = await ExpoFinanceKit.requestAuthorization();
    const status = await ExpoFinanceKit.getAuthorizationStatus();
    
    return {
      granted,
      status: status as AuthorizationStatus,
    };
  } catch (error) {
    console.error('Error requesting FinanceKit authorization:', error);
    return {
      granted: false,
      status: 'denied',
    };
  }
}

/**
 * Gets current authorization status
 * @returns Promise resolving to current authorization status
 */
export async function getAuthorizationStatus(): Promise<AuthorizationStatus> {
  try {
    const status = await ExpoFinanceKit.getAuthorizationStatus();
    return status as AuthorizationStatus;
  } catch (error) {
    console.error('Error getting authorization status:', error);
    return 'unavailable';
  }
}

/**
 * Checks if FinanceKit is available on the device
 * @returns Boolean indicating availability
 */
export function isFinanceKitAvailable(): boolean {
  return ExpoFinanceKit.isAvailable || false;
}

/**
 * Ensures user has authorized access before proceeding
 * @param requestIfNeeded - Whether to request authorization if not determined
 * @returns Promise resolving to boolean indicating authorization status
 */
export async function ensureAuthorized(requestIfNeeded: boolean = true): Promise<boolean> {
  const status = await getAuthorizationStatus();
  
  if (status === 'authorized') {
    return true;
  }
  
  if (status === 'notDetermined' && requestIfNeeded) {
    const { granted } = await requestAuthorization();
    return granted;
  }
  
  return false;
}

/**
 * Authorization status change listener manager
 */
class AuthorizationListener {
  private listeners: Map<string, Function> = new Map();

  /**
   * Adds a listener for authorization status changes
   * @param callback - Function to call when status changes
   * @returns Function to remove the listener
   */
  addStatusChangeListener(
    callback: (payload: AuthorizationStatusChangedPayload) => void
  ): () => void {
    const listenerId = Math.random().toString(36).substring(2, 11);
    
    const listener = (payload: AuthorizationStatusChangedPayload) => {
      callback({
        ...payload,
        timestamp: payload.timestamp || Date.now(),
      });
    };

    this.listeners.set(listenerId, listener);
    
    if (ExpoFinanceKit.addListener) {
      ExpoFinanceKit.addListener('onAuthorizationStatusChanged', listener);
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
      ExpoFinanceKit.removeListener('onAuthorizationStatusChanged', listener);
      this.listeners.delete(listenerId);
    }
  }

  /**
   * Removes all authorization listeners
   */
  removeAllListeners(): void {
    if (ExpoFinanceKit.removeAllListeners) {
      ExpoFinanceKit.removeAllListeners('onAuthorizationStatusChanged');
    }
    this.listeners.clear();
  }
}

export const authorizationListener = new AuthorizationListener();

/**
 * Waits for authorization with timeout
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise resolving to authorization result
 */
export async function waitForAuthorization(timeoutMs: number = 30000): Promise<AuthorizationResult> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      removeListener();
      reject(createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        'Authorization timeout'
      ));
    }, timeoutMs);

    const removeListener = authorizationListener.addStatusChangeListener((payload) => {
      if (payload.status !== 'notDetermined') {
        clearTimeout(timeout);
        removeListener();
        resolve({
          granted: payload.status === 'authorized',
          status: payload.status,
        });
      }
    });

    // Check current status immediately
    getAuthorizationStatus().then(status => {
      if (status !== 'notDetermined') {
        clearTimeout(timeout);
        removeListener();
        resolve({
          granted: status === 'authorized',
          status,
        });
      }
    });
  });
}

/**
 * Gets human-readable description for authorization status
 * @param status - Authorization status
 * @returns Human-readable description
 */
export function getAuthorizationStatusDescription(status: AuthorizationStatus): string {
  switch (status) {
    case 'authorized':
      return 'Access to financial data has been granted';
    case 'denied':
      return 'Access to financial data has been denied';
    case 'notDetermined':
      return 'Authorization has not been requested yet';
    case 'unavailable':
      return 'FinanceKit is not available on this device';
    default:
      return 'Unknown authorization status';
  }
}

/**
 * Checks if authorization can be requested
 * @returns Promise resolving to boolean
 */
export async function canRequestAuthorization(): Promise<boolean> {
  if (!isFinanceKitAvailable()) {
    return false;
  }

  const status = await getAuthorizationStatus();
  return status === 'notDetermined';
}