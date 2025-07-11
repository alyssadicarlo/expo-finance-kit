/**
 * Analytics utilities for Expo Finance Kit
 * Provides insights and analysis of financial data
 */

import { 
  Transaction, 
  SpendingInsights,
  CategoryBreakdown,
  MerchantBreakdown,
  DailyBalance,
  CreditDebitIndicator,
} from '../ExpoFinanceKit.types';
import { formatMerchantCategory } from './formatters';

/**
 * Generates spending insights for a set of transactions
 * @param transactions - Transactions to analyze
 * @param startDate - Start date for the period
 * @param endDate - End date for the period
 * @returns Spending insights
 */
export function generateSpendingInsights(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): SpendingInsights {
  const totalSpent = transactions
    .filter(t => t.creditDebitIndicator === CreditDebitIndicator.Debit)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalIncome = transactions
    .filter(t => t.creditDebitIndicator === CreditDebitIndicator.Credit)
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netCashFlow = totalIncome - totalSpent;
  
  const categoriesBreakdown = generateCategoryBreakdown(transactions);
  const merchantsBreakdown = generateMerchantBreakdown(transactions);
  const dailyBalances = generateDailyBalances(transactions, startDate, endDate);
  
  return {
    periodStart: startDate.getTime(),
    periodEnd: endDate.getTime(),
    totalSpent,
    totalIncome,
    netCashFlow,
    categoriesBreakdown,
    merchantsBreakdown,
    dailyBalances,
  };
}

/**
 * Generates category breakdown from transactions
 * @param transactions - Transactions to analyze
 * @returns Array of category breakdowns
 */
function generateCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
  const categoryMap = new Map<string, {
    amount: number;
    count: number;
  }>();
  
  // Only analyze debit transactions
  const debitTransactions = transactions.filter(
    t => t.creditDebitIndicator === CreditDebitIndicator.Debit
  );
  
  const totalSpent = debitTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  debitTransactions.forEach(transaction => {
    const category = formatMerchantCategory(transaction.merchantCategoryCode);
    const existing = categoryMap.get(category) || { amount: 0, count: 0 };
    
    categoryMap.set(category, {
      amount: existing.amount + transaction.amount,
      count: existing.count + 1,
    });
  });
  
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalSpent > 0 ? (data.amount / totalSpent) : 0,
      transactionCount: data.count,
      averageTransaction: data.amount / data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Generates merchant breakdown from transactions
 * @param transactions - Transactions to analyze
 * @returns Array of merchant breakdowns
 */
function generateMerchantBreakdown(transactions: Transaction[]): MerchantBreakdown[] {
  const merchantMap = new Map<string, {
    amount: number;
    count: number;
    lastDate: number;
  }>();
  
  // Only analyze debit transactions
  const debitTransactions = transactions.filter(
    t => t.creditDebitIndicator === CreditDebitIndicator.Debit
  );
  
  const totalSpent = debitTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  debitTransactions.forEach(transaction => {
    const merchantName = transaction.merchantName || 'Unknown Merchant';
    const existing = merchantMap.get(merchantName) || { 
      amount: 0, 
      count: 0, 
      lastDate: 0 
    };
    
    merchantMap.set(merchantName, {
      amount: existing.amount + transaction.amount,
      count: existing.count + 1,
      lastDate: Math.max(existing.lastDate, transaction.transactionDate),
    });
  });
  
  return Array.from(merchantMap.entries())
    .map(([merchantName, data]) => ({
      merchantName,
      amount: data.amount,
      percentage: totalSpent > 0 ? (data.amount / totalSpent) : 0,
      transactionCount: data.count,
      lastTransactionDate: data.lastDate,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20); // Top 20 merchants
}

/**
 * Generates daily balance data
 * @param transactions - Transactions to analyze
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of daily balances
 */
function generateDailyBalances(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): DailyBalance[] {
  const dailyData = new Map<string, {
    credits: number;
    debits: number;
  }>();
  
  // Initialize all days in the range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData.set(dateKey, { credits: 0, debits: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Aggregate transactions by day
  transactions.forEach(transaction => {
    const dateKey = new Date(transaction.transactionDate).toISOString().split('T')[0];
    const existing = dailyData.get(dateKey);
    
    if (existing) {
      if (transaction.creditDebitIndicator === CreditDebitIndicator.Credit) {
        existing.credits += transaction.amount;
      } else {
        existing.debits += transaction.amount;
      }
    }
  });
  
  // Calculate running balance
  let runningBalance = 0;
  const balances: DailyBalance[] = [];
  
  Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dateKey, data]) => {
      runningBalance += data.credits - data.debits;
      
      balances.push({
        date: new Date(dateKey).getTime(),
        balance: runningBalance,
        credits: data.credits,
        debits: data.debits,
      });
    });
    
  return balances;
}

/**
 * Calculates spending trends
 * @param transactions - Transactions to analyze
 * @param periodDays - Number of days per period
 * @returns Spending trend data
 */
export function calculateSpendingTrends(
  transactions: Transaction[],
  periodDays: number = 30
): Array<{
  period: string;
  spending: number;
  income: number;
  transactionCount: number;
}> {
  const periods = new Map<string, {
    spending: number;
    income: number;
    count: number;
  }>();
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.transactionDate);
    const periodIndex = Math.floor(
      (Date.now() - date.getTime()) / (periodDays * 24 * 60 * 60 * 1000)
    );
    
    const periodKey = `Period ${periodIndex + 1}`;
    const existing = periods.get(periodKey) || { spending: 0, income: 0, count: 0 };
    
    if (transaction.creditDebitIndicator === CreditDebitIndicator.Credit) {
      existing.income += transaction.amount;
    } else {
      existing.spending += transaction.amount;
    }
    existing.count++;
    
    periods.set(periodKey, existing);
  });
  
  return Array.from(periods.entries())
    .map(([period, data]) => ({
      period,
      spending: data.spending,
      income: data.income,
      transactionCount: data.count,
    }))
    .reverse(); // Most recent first
}

/**
 * Finds unusual transactions
 * @param transactions - Transactions to analyze
 * @param stdDevMultiplier - Number of standard deviations for outlier detection
 * @returns Array of unusual transactions
 */
export function findUnusualTransactions(
  transactions: Transaction[],
  stdDevMultiplier: number = 2
): Transaction[] {
  if (transactions.length < 3) return [];
  
  // Calculate mean and standard deviation
  const amounts = transactions.map(t => t.amount);
  const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  
  const variance = amounts.reduce((sum, amount) => {
    const diff = amount - mean;
    return sum + (diff * diff);
  }, 0) / amounts.length;
  
  const stdDev = Math.sqrt(variance);
  const threshold = mean + (stdDev * stdDevMultiplier);
  
  return transactions.filter(t => t.amount > threshold);
}

/**
 * Calculates savings rate
 * @param income - Total income
 * @param expenses - Total expenses
 * @returns Savings rate as a percentage
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const savings = income - expenses;
  return (savings / income) * 100;
}

/**
 * Predicts future balance based on historical data
 * @param transactions - Historical transactions
 * @param currentBalance - Current balance
 * @param daysToPredict - Number of days to predict
 * @returns Predicted balance
 */
export function predictFutureBalance(
  transactions: Transaction[],
  currentBalance: number,
  daysToPredict: number
): number {
  if (transactions.length === 0) return currentBalance;
  
  // Calculate average daily change
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.transactionDate - b.transactionDate
  );
  
  const firstDate = new Date(sortedTransactions[0].transactionDate);
  const lastDate = new Date(sortedTransactions[sortedTransactions.length - 1].transactionDate);
  const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
  
  const totalChange = transactions.reduce((sum, t) => {
    if (t.creditDebitIndicator === CreditDebitIndicator.Credit) {
      return sum + t.amount;
    } else {
      return sum - t.amount;
    }
  }, 0);
  
  const avgDailyChange = totalChange / daysDiff;
  
  return currentBalance + (avgDailyChange * daysToPredict);
}