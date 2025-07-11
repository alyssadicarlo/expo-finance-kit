# expo-finance-kit

Native Expo module for Apple FinanceKit - Access financial data from Apple Card and other accounts on iOS 17.4+.

A comprehensive, type-safe library providing modular access to Apple's FinanceKit API with React hooks, formatters, analytics, and more.

## Features

- 🔐 **Authorization Management** - Handle FinanceKit permissions with ease
- 💳 **Account Access** - Fetch and manage financial accounts
- 📊 **Transaction History** - Query and analyze transaction data
- 💰 **Balance Tracking** - Monitor account balances in real-time
- 📈 **Analytics & Insights** - Generate spending insights and detect trends
- ⚛️ **React Hooks** - Ready-to-use hooks for React Native apps
- 🎨 **Formatters** - Currency, date, and number formatting utilities
- 🛡️ **Type Safety** - Full TypeScript support with strict typing
- 🚀 **Performance** - Built-in caching and optimization

## Installation

```bash
npm install expo-finance-kit
```

## Configuration

### iOS Setup

1. **Request FinanceKit Entitlement from Apple** - You must request access to the FinanceKit entitlement from Apple before you can use this API. Visit the [Apple Developer Portal](https://developer.apple.com) to request access.

2. Add the FinanceKit entitlement to your app's entitlements file (after Apple approves your request):

```xml
<key>com.apple.developer.financekit</key>
<true/>
```

3. Add the privacy description to your `Info.plist`:

```xml
<key>NSFinancialDataDescription</key>
<string>This app needs access to your financial data to display transaction history and account information.</string>
```

4. FinanceKit requires iOS 17.4 or later.

## Quick Start

### Basic Usage

```typescript
import { 
  isFinanceKitAvailable,
  requestAuthorization,
  getAccounts,
  getTransactions,
  formatCurrency 
} from 'expo-finance-kit';

// Check if FinanceKit is available
if (!isFinanceKitAvailable()) {
  console.log('FinanceKit not available on this device');
  return;
}

// Request authorization
const { granted } = await requestAuthorization();

if (granted) {
  // Fetch accounts
  const accounts = await getAccounts();
  console.log(`Found ${accounts.length} accounts`);
  
  // Get recent transactions
  const transactions = await getTransactions({
    accountId: accounts[0].id,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    limit: 50
  });
  
  // Format currency for display
  transactions.forEach(transaction => {
    console.log(`${transaction.merchantName}: ${formatCurrency(transaction.amount, transaction.currencyCode)}`);
  });
}
```

### Using React Hooks

```typescript
import React from 'react';
import { View, Text, Button } from 'react-native';
import { 
  useAuthorizationStatus,
  useAccounts,
  useTransactions,
  formatCurrency,
  formatRelativeDate 
} from 'expo-finance-kit';

function MyFinanceApp() {
  const { isAuthorized, requestAuthorization } = useAuthorizationStatus();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, refetch } = useTransactions({ limit: 20 });

  if (!isAuthorized) {
    return (
      <View>
        <Text>Please authorize access to your financial data</Text>
        <Button title="Authorize" onPress={requestAuthorization} />
      </View>
    );
  }

  return (
    <View>
      <Text>Accounts ({accounts.length})</Text>
      {accounts.map(account => (
        <Text key={account.id}>{account.displayName} - {account.institutionName}</Text>
      ))}
      
      <Text>Recent Transactions</Text>
      {transactions.map(transaction => (
        <View key={transaction.id}>
          <Text>{transaction.merchantName || transaction.transactionDescription}</Text>
          <Text>{formatCurrency(transaction.amount, transaction.currencyCode)}</Text>
          <Text>{formatRelativeDate(transaction.transactionDate)}</Text>
        </View>
      ))}
      
      <Button title="Refresh" onPress={refetch} />
    </View>
  );
}
```

### Advanced Analytics

```typescript
import { 
  generateSpendingInsights,
  calculateTransactionStats,
  findUnusualTransactions,
  calculateSavingsRate 
} from 'expo-finance-kit';

// Generate spending insights for the last 30 days
const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);

const insights = generateSpendingInsights(transactions, startDate, endDate);
console.log(`Total spent: ${formatCurrency(insights.totalSpent, 'USD')}`);
console.log(`Total income: ${formatCurrency(insights.totalIncome, 'USD')}`);

// Calculate statistics
const stats = calculateTransactionStats(transactions);
console.log(`Average transaction: ${formatCurrency(stats.averageTransaction, 'USD')}`);
console.log(`Savings rate: ${calculateSavingsRate(stats.totalIncome, stats.totalExpenses)}%`);

// Find unusual transactions
const unusual = findUnusualTransactions(transactions);
console.log(`Found ${unusual.length} unusual transactions`);

// Category breakdown
insights.categoriesBreakdown.forEach(category => {
  console.log(`${category.category}: ${category.percentage.toFixed(1)}% (${formatCurrency(category.amount, 'USD')})`);
});
```

## API Reference

### Core Functions

#### Authorization

- `requestAuthorization()` - Request access to financial data
- `getAuthorizationStatus()` - Get current authorization status
- `isFinanceKitAvailable()` - Check if FinanceKit is available
- `ensureAuthorized()` - Helper to ensure authorization before data access

#### Accounts

- `getAccounts()` - Fetch all accounts
- `getAccountById(id)` - Get a specific account
- `getAccountsByInstitution()` - Group accounts by institution
- `getPrimaryAccount()` - Get the primary (first asset) account

#### Transactions

- `getTransactions(options)` - Fetch transactions with filtering
- `getRecentTransactions(limit)` - Get recent transactions
- `getTransactionsByAccount(accountId, options)` - Get account-specific transactions
- `getIncomeTransactions()` - Get only income (credit) transactions
- `getExpenseTransactions()` - Get only expense (debit) transactions

#### Balances

- `getBalances()` - Fetch all account balances
- `getBalanceByAccount(accountId)` - Get balance for specific account
- `getTotalBalance()` - Calculate total balance across all accounts
- `getBalanceSummary()` - Get comprehensive balance summary

### React Hooks

- `useAuthorizationStatus()` - Manage authorization state
- `useAccounts(options?)` - Fetch and monitor accounts
- `useTransactions(options?)` - Fetch and monitor transactions
- `useAccountBalance(accountId?)` - Track account balance
- `useTotalBalance()` - Monitor total balance
- `useTransactionStream(accountId?, interval?)` - Real-time transaction updates

### Utilities

#### Formatters

- `formatCurrency(amount, currencyCode)` - Format currency values
- `formatDate(date, format)` - Format dates
- `formatRelativeDate(date)` - Format relative dates (e.g., "2 days ago")
- `formatAccountName(account)` - Format account display name
- `formatPercentage(value)` - Format percentages

#### Analytics

- `generateSpendingInsights(transactions, startDate, endDate)` - Generate comprehensive insights
- `calculateTransactionStats(transactions)` - Calculate transaction statistics
- `findUnusualTransactions(transactions)` - Detect unusual spending
- `calculateSavingsRate(income, expenses)` - Calculate savings percentage
- `predictFutureBalance(transactions, currentBalance, days)` - Predict future balance

### Types

```typescript
interface Account {
  id: string;
  institutionName: string;
  displayName: string;
  accountDescription?: string;
  currencyCode: string;
  accountType: 'asset' | 'liability';
}

interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currencyCode: string;
  transactionDate: number;
  merchantName?: string;
  transactionDescription: string;
  merchantCategoryCode?: number;
  status: TransactionStatus;
  transactionType: TransactionType;
  creditDebitIndicator: 'credit' | 'debit';
}

interface AccountBalance {
  id: string;
  accountId: string;
  amount: number;
  currencyCode: string;
}

interface SpendingInsights {
  periodStart: number;
  periodEnd: number;
  totalSpent: number;
  totalIncome: number;
  netCashFlow: number;
  categoriesBreakdown: CategoryBreakdown[];
  merchantsBreakdown: MerchantBreakdown[];
}
```

## Platform Support

- ✅ iOS 17.4+
- ❌ Android (returns "unavailable" for all methods)
- ❌ Web (returns "unavailable" for all methods)

## Examples

Check out the [example app](./example) for a complete implementation showcasing all features including:

- Authorization flow
- Account listing and selection
- Transaction history with grouping
- Balance display
- Spending statistics and insights
- Unusual transaction detection
- Pull-to-refresh functionality

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting PRs.

## License

MIT

## Acknowledgments

This module provides a comprehensive wrapper around Apple's FinanceKit API, making it easy to integrate financial data into your Expo/React Native applications.