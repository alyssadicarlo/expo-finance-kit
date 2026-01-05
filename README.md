# expo-finance-kit

Native Expo module for Apple FinanceKit - Access financial data from Apple Card and other accounts on iOS 17.4+.

A comprehensive, type-safe library providing modular access to Apple's FinanceKit API with React hooks, formatters, analytics, and more.

## Features

- 🔐 **Authorization Management** - Handle FinanceKit permissions with ease
- 💳 **Account Access** - Fetch and manage financial accounts
- 📊 **Transaction History** - Query and analyze transaction data
- 💰 **Balance Tracking** - Monitor account balances in real-time
- 📈 **Analytics & Insights** - Generate spending insights and detect trends
- 🔄 **Real-time Monitoring** - Live transaction change streams with FinanceKit AsyncSequence
- 📱 **Background Delivery** - Receive transaction updates even when app is suspended
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
    const prefix = transaction.creditDebitIndicator === 'credit' ? '+' : '-';
    console.log(`${transaction.merchantName}: ${prefix}${formatCurrency(Math.abs(transaction.amount), transaction.currencyCode)}`);
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
          <Text>
            {transaction.creditDebitIndicator === 'credit' ? '+' : '-'}
            {formatCurrency(Math.abs(transaction.amount), transaction.currencyCode)}
          </Text>
          <Text>{formatRelativeDate(transaction.transactionDate)}</Text>
        </View>
      ))}
      
      <Button title="Refresh" onPress={refetch} />
    </View>
  );
}
```

### Real-time Transaction Monitoring

Monitor transactions in real-time using FinanceKit's change streams. This provides batched updates when transactions are inserted, updated, or deleted.

#### Using the Hook

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { useTransactionMonitoring } from 'expo-finance-kit';

function TransactionMonitor() {
  const { isMonitoring, changeCount, error } = useTransactionMonitoring(
    ['account-id-1', 'account-id-2'], // Optional: specific accounts, or undefined for all
    {
      autoStart: true, // Automatically start monitoring on mount
      onChanges: (payload) => {
        console.log('New transactions:', payload.inserted);
        console.log('Updated transactions:', payload.updated);
        console.log('Deleted transaction IDs:', payload.deleted);
        
        // Write to WatermelonDB or your database
        // database.write(() => {
        //   payload.inserted?.forEach(txn => upsertTransaction(txn));
        //   payload.updated?.forEach(txn => updateTransaction(txn));
        //   payload.deleted?.forEach(id => deleteTransaction(id));
        // });
      }
    }
  );

  return (
    <View>
      <Text>Monitoring: {isMonitoring ? 'Active' : 'Inactive'}</Text>
      <Text>Changes received: {changeCount}</Text>
      {error && <Text>Error: {error.message}</Text>}
    </View>
  );
}
```

#### Using the Module Directly

```typescript
import { 
  startMonitoringTransactions,
  stopMonitoringTransactions,
  addTransactionChangeListener 
} from 'expo-finance-kit';

// Start monitoring specific accounts
await startMonitoringTransactions(['account-id-1', 'account-id-2']);

// Or monitor all accounts
await startMonitoringTransactions();

// Add listener for changes
const unsubscribe = addTransactionChangeListener((payload) => {
  const { accountId, inserted, updated, deleted, timestamp } = payload;
  
  if (inserted && inserted.length > 0) {
    console.log(`${inserted.length} new transactions for account ${accountId}`);
    // Handle new transactions
  }
  
  if (updated && updated.length > 0) {
    console.log(`${updated.length} transactions updated for account ${accountId}`);
    // Handle updated transactions
  }
  
  if (deleted && deleted.length > 0) {
    console.log(`${deleted.length} transactions deleted for account ${accountId}`);
    // Handle deleted transactions
  }
});

// Stop monitoring when done
await stopMonitoringTransactions();
unsubscribe();
```

#### Integration with WatermelonDB

```typescript
import { addTransactionChangeListener, startMonitoringTransactions } from 'expo-finance-kit';
import { database } from './database'; // Your WatermelonDB instance
import { Transaction as DBTransaction } from './models/Transaction';

// Start monitoring
await startMonitoringTransactions();

// Handle changes
addTransactionChangeListener(async (payload) => {
  await database.write(async () => {
    // Insert new transactions
    if (payload.inserted) {
      for (const txn of payload.inserted) {
        await database.collections
          .get<DBTransaction>('transactions')
          .create((transaction) => {
            transaction._raw.id = txn.id;
            transaction.accountId = txn.accountId;
            transaction.amount = txn.amount;
            transaction.currencyCode = txn.currencyCode;
            transaction.transactionDate = txn.transactionDate;
            transaction.merchantName = txn.merchantName;
            transaction.description = txn.transactionDescription;
            transaction.status = txn.status;
            // ... other fields
          });
      }
    }
    
    // Update existing transactions
    if (payload.updated) {
      for (const txn of payload.updated) {
        const existing = await database.collections
          .get<DBTransaction>('transactions')
          .find(txn.id);
        
        await existing.update((transaction) => {
          transaction.amount = txn.amount;
          transaction.status = txn.status;
          // ... update other fields
        });
      }
    }
    
    // Delete removed transactions
    if (payload.deleted) {
      for (const id of payload.deleted) {
        const existing = await database.collections
          .get<DBTransaction>('transactions')
          .find(id);
        await existing.markAsDeleted();
      }
    }
  });
  
  // Your UI will automatically update if using withObservables() or .observe()
});
```

### Background Delivery Setup

To enable background delivery of transaction updates, configure the Expo plugin in your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-finance-kit",
        {
          "appGroupIdentifier": "group.com.yourapp.financekit",
          "enableBackgroundDelivery": true
        }
      ]
    ]
  }
}
```

Or in JavaScript:

```javascript
module.exports = {
  expo: {
    plugins: [
      [
        'expo-finance-kit',
        {
          appGroupIdentifier: 'group.com.yourapp.financekit',
          enableBackgroundDelivery: true,
          backgroundModes: ['remote-notification', 'processing']
        }
      ]
    ]
  }
};
```

**Important Notes:**

1. **App Group Identifier**: Must match the identifier used in your Xcode project's App Groups capability
2. **Background Extension**: The plugin automatically creates a background delivery extension. You'll need to manually add it to your Xcode project (see plugin console output for instructions)
3. **Background Task Limitations**: iOS controls when background tasks run. Events are stored during background and processed when the app becomes active
4. **Real-time vs Background**: 
   - **App Active**: Events are delivered in real-time via the async sequence
   - **App Backgrounded**: Changes are stored in the app group and processed when the app becomes active

#### Setting App Group Identifier (Optional)

If you want to set the app group identifier programmatically:

```typescript
import { setAppGroupIdentifier } from 'expo-finance-kit';

// Set early in your app initialization
await setAppGroupIdentifier('group.com.yourapp.financekit');
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

#### Transaction Monitoring

- `startMonitoringTransactions(accountIds?)` - Start monitoring transactions for specified accounts (or all if none provided)
- `stopMonitoringTransactions()` - Stop monitoring transactions
- `addTransactionChangeListener(callback)` - Add listener for transaction change events
- `removeAllTransactionChangeListeners()` - Remove all change listeners
- `isMonitoringTransactions()` - Check if monitoring is currently active
- `clearHistoryToken(accountId)` - Clear history token for an account (resets monitoring state)
- `setAppGroupIdentifier(identifier)` - Set app group identifier for background delivery
- `processPendingChanges()` - Manually process pending changes from background sync

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
- `useTransactionStream(accountId?, interval?)` - Real-time transaction updates (polling-based, deprecated)
- `useTransactionMonitoring(accountIds?, options?)` - Real-time transaction monitoring using FinanceKit change streams

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

interface TransactionsChangedPayload {
  accountId: string;
  timestamp: number;
  inserted?: Transaction[];      // New transactions
  updated?: Transaction[];       // Updated transactions
  deleted?: string[];           // Deleted transaction IDs
  hasHistoryToken?: boolean;    // Whether a history token was received
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

- ✅ iOS 17.4+ (US: Apple Card/Cash/Savings)
- ✅ iOS 18.4+ (UK: Open Banking)
- ❌ Android (returns "unavailable" for all methods)
- ❌ Web (returns "unavailable" for all methods)

## Transaction Monitoring Details

### How It Works

Transaction monitoring uses FinanceKit's `transactionHistory(since:isMonitoring:)` API, which provides an `AsyncSequence` of transaction changes. The implementation:

1. **Subscribes to Change Streams**: For each account, creates a long-running async sequence that emits batched changes
2. **Batched Updates**: Receives changes in batches containing:
   - `inserted`: New transactions that were added
   - `updated`: Existing transactions that were modified
   - `deleted`: Transaction IDs that were removed
3. **History Token Management**: FinanceKit manages history tokens internally to ensure no changes are missed
4. **Event Emission**: Changes are emitted to JavaScript via `NativeEventEmitter`

### Background Delivery

The module supports background delivery through:

1. **Background Delivery Extension**: A FinanceKit extension that receives notifications when data changes
2. **Background Tasks**: iOS background tasks that periodically sync transaction data
3. **App Group Storage**: Changes are stored in the app group shared container during background
4. **Automatic Processing**: When the app becomes active, stored changes are automatically processed and emitted

**Important Limitations:**

- Background tasks are controlled by iOS and may run infrequently (typically a few times per day)
- Events are not delivered in real-time when the app is suspended
- Changes are stored during background and processed when the app becomes active
- For best results, ensure your app group identifier is correctly configured

### Best Practices

1. **Start Monitoring Early**: Start monitoring when your app launches or when authorization is granted
2. **Handle All Change Types**: Always check for `inserted`, `updated`, and `deleted` in your change handlers
3. **Database Integration**: Use transactions when writing to your database to ensure consistency
4. **Error Handling**: Implement proper error handling for monitoring failures
5. **Cleanup**: Always stop monitoring and remove listeners when components unmount
6. **App Group Setup**: Ensure your app group identifier matches between your config and Xcode project

### Troubleshooting

**Monitoring not starting:**
- Ensure FinanceKit authorization is granted
- Check that the app is running on iOS 17.4+ (US) or iOS 18.4+ (UK)
- Verify you have accounts available

**No events received:**
- Check that monitoring is active using `isMonitoringTransactions()`
- Ensure you've added a listener with `addTransactionChangeListener()`
- Verify the app is authorized and has access to accounts

**Background delivery not working:**
- Ensure `enableBackgroundDelivery: true` in your Expo config
- Verify app group identifier is correctly set in both config and Xcode
- Check that the background delivery extension is properly configured in Xcode
- Note that background tasks are controlled by iOS and may not run immediately

## Examples

Check out the [example app](./example) for a complete implementation showcasing all features including:

- Authorization flow
- Account listing and selection
- Transaction history with grouping
- Real-time transaction monitoring
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