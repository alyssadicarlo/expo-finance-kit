/**
 * Error handling utilities for Expo Finance Kit
 * Provides consistent error creation and handling
 */

import { FinanceKitError, FinanceKitErrorCode } from '../ExpoFinanceKit.types';

/**
 * Creates a FinanceKit error with proper structure
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns FinanceKitError
 */
export function createFinanceKitError(
  code: FinanceKitErrorCode,
  message: string,
  details?: Record<string, any>
): FinanceKitError {
  const error = new Error(message) as FinanceKitError;
  error.code = code;
  error.details = details;
  error.name = 'FinanceKitError';
  
  return error;
}

/**
 * Checks if an error is a FinanceKit error
 * @param error - Error to check
 * @returns Boolean indicating if it's a FinanceKit error
 */
export function isFinanceKitError(error: any): error is FinanceKitError {
  return (
    error instanceof Error &&
    'code' in error &&
    Object.values(FinanceKitErrorCode).includes(error.code as FinanceKitErrorCode)
  );
}

/**
 * Gets user-friendly error message
 * @param error - Error to get message for
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (isFinanceKitError(error)) {
    switch (error.code) {
      case FinanceKitErrorCode.Unavailable:
        return 'FinanceKit is not available on this device. Please ensure you are using iOS 17.4 or later.';
      case FinanceKitErrorCode.Unauthorized:
        return 'Access to financial data has not been authorized. Please grant permission in Settings.';
      case FinanceKitErrorCode.InvalidAccountId:
        return 'The specified account could not be found.';
      case FinanceKitErrorCode.AccountNotFound:
        return 'The requested account does not exist.';
      case FinanceKitErrorCode.InvalidDateRange:
        return 'The specified date range is invalid.';
      case FinanceKitErrorCode.RateLimitExceeded:
        return 'Too many requests. Please try again later.';
      case FinanceKitErrorCode.NetworkError:
        return 'Network error occurred. Please check your connection.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Wraps an async function with error handling
 * @param fn - Async function to wrap
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isFinanceKitError(error)) {
        throw error;
      }
      
      // Transform unknown errors to FinanceKit errors
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        error instanceof Error ? error.message : 'Unknown error occurred',
        { originalError: error }
      );
    }
  }) as T;
}

/**
 * Logs error with context
 * @param error - Error to log
 * @param context - Additional context
 */
export function logError(error: any, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: {
      message: error.message,
      code: isFinanceKitError(error) ? error.code : undefined,
      details: isFinanceKitError(error) ? error.details : undefined,
      stack: error.stack,
    },
  };
  
  console.error('[ExpoFinanceKit Error]', errorInfo);
}

/**
 * Error recovery strategies
 */
export const ErrorRecovery = {
  /**
   * Retries a function with exponential backoff
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @param initialDelay - Initial delay in milliseconds
   * @returns Result of the function
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry certain errors
        if (isFinanceKitError(error)) {
          if ([
            FinanceKitErrorCode.Unauthorized,
            FinanceKitErrorCode.Unavailable,
            FinanceKitErrorCode.InvalidAccountId,
          ].includes(error.code)) {
            throw error;
          }
        }
        
        // Wait before retrying
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  },
  
  /**
   * Provides a fallback value if function fails
   * @param fn - Function to try
   * @param fallback - Fallback value
   * @returns Result of function or fallback
   */
  async fallback<T>(
    fn: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      logError(error, 'Using fallback value');
      return fallback;
    }
  },
};