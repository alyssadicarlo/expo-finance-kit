# expo-finance-kit

Native Expo module for Apple FinanceKit - Access financial data from Apple Card and other accounts on iOS 17.4+.

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

## Usage

```typescript
import ExpoFinanceKit, { isFinanceKitModuleAvailable } from 'expo-finance-kit';

// Check if the native module is loaded (important for new architecture)
if (!isFinanceKitModuleAvailable()) {
  console.log('FinanceKit module not yet loaded');
  return;
}

// Check if FinanceKit is available on this device
if (ExpoFinanceKit.isAvailable) {
  // Request authorization
  const granted = await ExpoFinanceKit.requestAuthorization();
  
  if (granted) {
    // Get accounts
    const accounts = await ExpoFinanceKit.getAccounts();
    
    // Get transactions for an account
    const transactions = await ExpoFinanceKit.getTransactions(
      accounts[0].id,
      Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      Date.now()
    );
    
    // Get account balance
    const balance = await ExpoFinanceKit.getBalance(accounts[0].id);
  }
}
```

## API Reference

### Constants

- `isAvailable: boolean` - Whether FinanceKit is available on the current device

### Methods

#### `requestAuthorization(): Promise<boolean>`
Request authorization to access financial data. Returns true if granted.

#### `getAuthorizationStatus(): Promise<AuthorizationStatus>`
Get the current authorization status. Returns one of:
- `'notDetermined'`
- `'denied'`
- `'authorized'`
- `'unavailable'`

#### `getAccounts(): Promise<Account[]>`
Get all available financial accounts.

#### `getTransactions(accountId?: string, startDate?: number, endDate?: number): Promise<Transaction[]>`
Get transactions for the specified account and date range.

#### `getBalance(accountId: string): Promise<Balance>`
Get the current balance for a specific account.

### Types

```typescript
interface Account {
  id: string;
  displayName: string;
  institutionName: string;
  type: 'asset' | 'liability' | 'unknown';
  currency: string;
}

interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  date: number; // timestamp in milliseconds
  description: string;
  category?: TransactionCategory;
  status: 'authorized' | 'booked' | 'pending' | 'rejected' | 'unknown';
  type: 'credit' | 'debit' | 'unknown';
}

interface Balance {
  accountId: string;
  available: number;
  current: number;
  currency: string;
  asOfDate: number; // timestamp in milliseconds
}
```

## Platform Support

- ✅ iOS 17.4+
- ❌ Android (returns "unavailable" for all methods)
- ❌ Web (returns "unavailable" for all methods)

## License

MIT