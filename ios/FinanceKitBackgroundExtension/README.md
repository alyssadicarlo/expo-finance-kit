# FinanceKit Background Delivery Extension

This extension enables your app to receive notifications when financial data changes in FinanceStore, allowing it to update data outside of your app's lifecycle.

## Setup Instructions

### 1. Add Extension to Xcode Project

1. Open your iOS project in Xcode
2. Go to File > New > Target
3. Choose "App Extension" and select a generic extension template (will be customized)
4. Name it "FinanceKitBackgroundExtension"
5. Set the bundle identifier to: `$(PRODUCT_BUNDLE_IDENTIFIER).background-extension`

### 2. Configure Extension Files

1. Delete the default files created by Xcode
2. Add the following files from this directory:
   - `BackgroundDeliveryExtension.swift`
   - `Info.plist`
   - `FinanceKitBackgroundExtension.entitlements`

### 3. Configure Build Settings

In the extension target's build settings:
- Set "iOS Deployment Target" to 17.4 or higher
- Enable "Swift Language Version" to 5.0 or higher

### 4. Configure Capabilities

For both the main app and extension targets:

1. Enable "App Groups" capability
2. Add group: `group.com.expo.financekit`
3. Enable "FinanceKit" capability (requires entitlement)

### 5. Update Main App Configuration

1. Add the entitlements file to your main app target
2. Ensure Info.plist includes:
   ```xml
   <key>NSFinancialDataUsageDescription</key>
   <string>This app needs access to your financial data...</string>
   ```

### 6. Configure App Group Identifier

If using a different app group identifier:
1. Update in `BackgroundDeliveryExtension.swift` (line 78)
2. Update in `ExpoFinanceKitModule.swift` (line 44)
3. Update in both entitlements files

## Testing

1. Build and run your app
2. Grant FinanceKit permissions when prompted
3. The extension will automatically receive notifications when financial data changes
4. Check console logs for "Background data changed" messages

## Integration with JavaScript

Use the background sync functionality:

```javascript
import { useBackgroundSync, setupAutoRefresh } from 'expo-finance-kit';

// In a React component
function MyComponent() {
  const { lastSyncInfo, isBackgroundSyncAvailable } = useBackgroundSync({
    onDataChanged: async () => {
      // Refresh your data here
      console.log('Financial data changed!');
    }
  });

  return (
    <View>
      <Text>Background sync available: {isBackgroundSyncAvailable}</Text>
      <Text>Last sync: {JSON.stringify(lastSyncInfo)}</Text>
    </View>
  );
}

// Or set up auto-refresh
const unsubscribe = setupAutoRefresh(async () => {
  // This will be called whenever background data changes
  await refreshFinancialData();
});
```

## Requirements

- iOS 17.4+
- FinanceKit entitlement from Apple
- Active Apple Developer account (organization level)

## Troubleshooting

1. **Extension not receiving notifications**: Ensure both app and extension have the same App Group configured
2. **Permission errors**: Verify NSFinancialDataUsageDescription is in Info.plist
3. **Build errors**: Check that iOS deployment target is 17.4+