/**
 * Validation utilities for Expo Finance Kit
 * Ensures data integrity and type safety
 */

import { 
  Account,
  AccountQueryOptions,
  Transaction,
  TransactionQueryOptions,
  AccountBalance,
  BalanceQueryOptions,
  FinanceKitErrorCode,
  TransactionStatus,
  AccountType,
  CreditDebitIndicator,
  TransactionType,
  AuthorizationStatus,
} from '../ExpoFinanceKit.types';
import { createFinanceKitError } from './errors';

/**
 * Validates account query options
 * @param options - Options to validate
 * @throws {FinanceKitError} If validation fails
 */
export function validateAccountQueryOptions(options: AccountQueryOptions): void {
  if (options.accountTypes) {
    options.accountTypes.forEach(type => {
      if (!Object.values(AccountType).includes(type)) {
        throw createFinanceKitError(
          FinanceKitErrorCode.Unknown,
          `Invalid account type: ${type}`
        );
      }
    });
  }

  if (options.currencyCodes) {
    options.currencyCodes.forEach(code => {
      if (typeof code !== 'string' || code.length !== 3) {
        throw createFinanceKitError(
          FinanceKitErrorCode.Unknown,
          `Invalid currency code: ${code}. Must be a 3-letter ISO code.`
        );
      }
    });
  }
}

/**
 * Validates transaction query options
 * @param options - Options to validate
 * @throws {FinanceKitError} If validation fails
 */
export function validateTransactionQueryOptions(options: TransactionQueryOptions): void {
  if (options.startDate && options.endDate) {
    const start = options.startDate instanceof Date ? options.startDate : new Date(options.startDate);
    const end = options.endDate instanceof Date ? options.endDate : new Date(options.endDate);
    
    if (start > end) {
      throw createFinanceKitError(
        FinanceKitErrorCode.InvalidDateRange,
        'Start date must be before end date'
      );
    }
  }

  if (options.minAmount !== undefined && options.maxAmount !== undefined) {
    if (options.minAmount > options.maxAmount) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        'Minimum amount must be less than maximum amount'
      );
    }
  }

  if (options.limit !== undefined) {
    if (options.limit <= 0 || !Number.isInteger(options.limit)) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        'Limit must be a positive integer'
      );
    }
  }

  if (options.offset !== undefined) {
    if (options.offset < 0 || !Number.isInteger(options.offset)) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        'Offset must be a non-negative integer'
      );
    }
  }

  if (options.transactionTypes) {
    options.transactionTypes.forEach(type => {
      if (!Object.values(TransactionType).includes(type)) {
        throw createFinanceKitError(
          FinanceKitErrorCode.Unknown,
          `Invalid transaction type: ${type}`
        );
      }
    });
  }

  if (options.statuses) {
    options.statuses.forEach(status => {
      if (!Object.values(TransactionStatus).includes(status)) {
        throw createFinanceKitError(
          FinanceKitErrorCode.Unknown,
          `Invalid transaction status: ${status}`
        );
      }
    });
  }

  if (options.creditDebitIndicator) {
    if (!Object.values(CreditDebitIndicator).includes(options.creditDebitIndicator)) {
      throw createFinanceKitError(
        FinanceKitErrorCode.Unknown,
        `Invalid credit/debit indicator: ${options.creditDebitIndicator}`
      );
    }
  }
}

/**
 * Validates balance query options
 * @param options - Options to validate
 * @throws {FinanceKitError} If validation fails
 */
export function validateBalanceQueryOptions(options: BalanceQueryOptions): void {
  if (options.accountIds) {
    options.accountIds.forEach(id => {
      if (typeof id !== 'string' || id.trim().length === 0) {
        throw createFinanceKitError(
          FinanceKitErrorCode.InvalidAccountId,
          'Account ID must be a non-empty string'
        );
      }
    });
  }
}

/**
 * Transforms raw account data from native module
 * @param rawAccount - Raw account data
 * @returns Transformed account object
 */
export function transformAccount(rawAccount: any): Account {
  return {
    id: rawAccount.id,
    institutionName: rawAccount.institutionName,
    displayName: rawAccount.displayName,
    accountDescription: rawAccount.accountDescription,
    currencyCode: rawAccount.currencyCode,
    accountType: rawAccount.accountType as AccountType,
    balance: rawAccount.balance,
  };
}

/**
 * Transforms raw transaction data from native module
 * @param rawTransaction - Raw transaction data
 * @returns Transformed transaction object
 */
export function transformTransaction(rawTransaction: any): Transaction {
  // Map transaction status from native format
  let status: TransactionStatus;
  switch (rawTransaction.status) {
    case 'authorized':
      status = TransactionStatus.Authorized;
      break;
    case 'booked':
      status = TransactionStatus.Booked;
      break;
    case 'pending':
      status = TransactionStatus.Pending;
      break;
    case 'rejected':
      status = TransactionStatus.Rejected;
      break;
    default:
      status = TransactionStatus.Pending;
  }

  // Map transaction type from native format
  let transactionType: TransactionType;
  switch (rawTransaction.transactionType) {
    case 'adjustment':
      transactionType = TransactionType.Adjustment;
      break;
    case 'atm':
      transactionType = TransactionType.ATM;
      break;
    case 'billPayment':
      transactionType = TransactionType.BillPayment;
      break;
    case 'check':
      transactionType = TransactionType.Check;
      break;
    case 'deposit':
      transactionType = TransactionType.Deposit;
      break;
    case 'directDebit':
      transactionType = TransactionType.DirectDebit;
      break;
    case 'directDeposit':
      transactionType = TransactionType.DirectDeposit;
      break;
    case 'dividend':
      transactionType = TransactionType.Dividend;
      break;
    case 'fee':
      transactionType = TransactionType.Fee;
      break;
    case 'interest':
      transactionType = TransactionType.Interest;
      break;
    case 'loan':
      transactionType = TransactionType.Loan;
      break;
    case 'pointOfSale':
      transactionType = TransactionType.PointOfSale;
      break;
    case 'refund':
      transactionType = TransactionType.Refund;
      break;
    case 'standingOrder':
      transactionType = TransactionType.StandingOrder;
      break;
    case 'transfer':
      transactionType = TransactionType.Transfer;
      break;
    case 'withdrawal':
      transactionType = TransactionType.Withdrawal;
      break;
    default:
      transactionType = TransactionType.Unknown;
  }

  return {
    id: rawTransaction.id,
    accountId: rawTransaction.accountId,
    amount: rawTransaction.amount, // Keep original amount sign
    currencyCode: rawTransaction.currencyCode,
    transactionDate: rawTransaction.transactionDate,
    merchantName: rawTransaction.merchantName,
    transactionDescription: rawTransaction.transactionDescription,
    merchantCategoryCode: rawTransaction.merchantCategoryCode ? 
      parseInt(rawTransaction.merchantCategoryCode) : undefined,
    status,
    transactionType,
    creditDebitIndicator: rawTransaction.creditDebitIndicator as CreditDebitIndicator,
  };
}

/**
 * Normalizes transaction amount based on account type and credit/debit indicator
 * @param amount - The raw transaction amount
 * @param accountType - The type of account (asset or liability)
 * @param creditDebitIndicator - Whether the transaction is a credit or debit
 * @returns Normalized amount (positive for increases in value, negative for decreases)
 */
export function normalizeTransactionAmount(
  amount: number,
  accountType: AccountType,
  creditDebitIndicator: CreditDebitIndicator
): number {
  // For asset accounts:
  // - Credits (deposits) are positive (increase asset value)
  // - Debits (withdrawals) are negative (decrease asset value)
  // 
  // For liability accounts (e.g., credit cards):
  // - Credits (payments) are negative (decrease debt)
  // - Debits (charges) are positive (increase debt)
  
  // Use absolute value first, as Apple FinanceKit may already encode the sign
  const absoluteAmount = Math.abs(amount);

  if (accountType === AccountType.Asset) {
    return creditDebitIndicator === CreditDebitIndicator.Credit ? absoluteAmount : -absoluteAmount;
  } else {
    // Liability account
    return creditDebitIndicator === CreditDebitIndicator.Debit ? absoluteAmount : -absoluteAmount;
  }
}

/**
 * Transforms raw balance data from native module
 * @param rawBalance - Raw balance data
 * @returns Transformed balance object
 */
export function transformBalance(rawBalance: any): AccountBalance {
  return {
    id: rawBalance.id,
    accountId: rawBalance.accountId,
    amount: rawBalance.amount,
    currencyCode: rawBalance.currencyCode,
  };
}

/**
 * Validates a currency code
 * @param code - Currency code to validate
 * @returns Boolean indicating validity
 */
export function isValidCurrencyCode(code: string): boolean {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code);
}

/**
 * Validates an account ID (UUID format)
 * @param id - ID to validate
 * @returns Boolean indicating validity
 */
export function isValidAccountId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
}

/**
 * Sanitizes transaction description
 * @param description - Description to sanitize
 * @returns Sanitized description
 */
export function sanitizeTransactionDescription(description: string): string {
  if (!description || typeof description !== 'string') {
    return '';
  }
  
  // Remove excessive whitespace and trim
  return description.replace(/\s+/g, ' ').trim();
}

/**
 * Formats amount for display
 * @param amount - Amount to format
 * @param currencyCode - Currency code
 * @returns Formatted amount string
 */
export function formatAmount(amount: number, currencyCode: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

/**
 * Type guard for checking if a value is a valid AuthorizationStatus
 */
export const isAuthorizationStatus = (value: any): value is AuthorizationStatus => {
  return ['notDetermined', 'denied', 'authorized', 'unavailable'].includes(value);
};

/**
 * Type guard for checking if a value is a valid Transaction
 */
export const isTransaction = (value: any): value is Transaction => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.accountId === 'string' &&
    typeof value.amount === 'number' &&
    typeof value.currencyCode === 'string' &&
    typeof value.transactionDate === 'number'
  );
};

/**
 * Type guard for checking if a value is a valid Account
 */
export const isAccount = (value: any): value is Account => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.institutionName === 'string' &&
    typeof value.displayName === 'string' &&
    typeof value.currencyCode === 'string' &&
    Object.values(AccountType).includes(value.accountType)
  );
};