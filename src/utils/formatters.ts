/**
 * Formatting utilities for Expo Finance Kit
 * Provides consistent formatting for financial data
 */

import { Transaction, Account } from '../ExpoFinanceKit.types';

/**
 * Formats a currency amount
 * @param amount - Amount to format
 * @param currencyCode - ISO currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Formats a date for display
 * @param date - Date to format (timestamp or Date object)
 * @param format - Format style ('short', 'medium', 'long', 'full')
 * @returns Formatted date string
 */
export function formatDate(
  date: number | Date,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      });
    case 'medium':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    case 'full':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
  }
}

/**
 * Formats a relative date (e.g., "2 days ago")
 * @param date - Date to format (timestamp or Date object)
 * @returns Relative date string
 */
export function formatRelativeDate(date: number | Date): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }
}

/**
 * Formats a transaction for display
 * @param transaction - Transaction to format
 * @returns Formatted transaction object
 */
export function formatTransaction(transaction: Transaction): {
  displayAmount: string;
  displayDate: string;
  displayMerchant: string;
  displayCategory: string;
} {
  return {
    displayAmount: formatCurrency(transaction.amount, transaction.currencyCode),
    displayDate: formatDate(transaction.transactionDate),
    displayMerchant: transaction.merchantName || transaction.transactionDescription,
    displayCategory: formatMerchantCategory(transaction.merchantCategoryCode),
  };
}

/**
 * Formats merchant category code to human-readable string
 * @param mcc - Merchant category code
 * @returns Category name
 */
export function formatMerchantCategory(mcc?: number): string {
  if (!mcc) return 'Other';
  
  // Common MCC mappings
  const categories: Record<number, string> = {
    5411: 'Grocery Stores',
    5541: 'Gas Stations',
    5812: 'Restaurants',
    5813: 'Bars',
    5912: 'Drug Stores',
    7230: 'Beauty Shops',
    8011: 'Doctors',
    8021: 'Dentists',
  };
  
  return categories[mcc] || 'Other';
}

/**
 * Formats an account name for display
 * @param account - Account to format
 * @returns Formatted account name
 */
export function formatAccountName(account: Account): string {
  const lastFour = account.accountDescription?.match(/\d{4}$/)?.[0];
  if (lastFour) {
    return `${account.displayName} (...${lastFour})`;
  }
  return account.displayName;
}

/**
 * Formats a percentage
 * @param value - Value to format (0-1 scale)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats a number with commas
 * @param value - Number to format
 * @returns Formatted number string
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Abbreviates large numbers (e.g., 1.2K, 3.4M)
 * @param value - Number to abbreviate
 * @returns Abbreviated string
 */
export function abbreviateNumber(value: number): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const suffixNum = Math.floor(('' + Math.abs(value)).length / 3);
  const shortValue = parseFloat((suffixNum !== 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(3));
  
  if (shortValue % 1 !== 0) {
    return shortValue.toFixed(1) + suffixes[suffixNum];
  }
  
  return shortValue + suffixes[suffixNum];
}

/**
 * Formats a time duration
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return days === 1 ? '1 day' : `${days} days`;
  } else if (hours > 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  } else if (minutes > 0) {
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  } else {
    return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }
}

/**
 * Formats a balance change
 * @param currentBalance - Current balance
 * @param previousBalance - Previous balance
 * @param currencyCode - Currency code
 * @returns Formatted balance change
 */
export function formatBalanceChange(
  currentBalance: number,
  previousBalance: number,
  currencyCode: string
): {
  amount: string;
  percentage: string;
  isPositive: boolean;
} {
  const change = currentBalance - previousBalance;
  const percentageChange = previousBalance !== 0 ? change / previousBalance : 0;
  
  return {
    amount: formatCurrency(Math.abs(change), currencyCode),
    percentage: formatPercentage(Math.abs(percentageChange)),
    isPositive: change >= 0,
  };
}