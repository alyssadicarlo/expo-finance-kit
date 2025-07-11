import { 
  ConfigPlugin, 
  withXcodeProject, 
  withDangerousMod
} from '@expo/config-plugins';
import plist from '@expo/plist';
import * as fs from 'fs';
import * as path from 'path';

// FinanceKit background delivery extension type
const FINANCE_KIT_EXTENSION_IDENTIFIER = 'com.apple.financekit.background-delivery';

interface Props {
  appGroupIdentifier: string;
  extensionName?: string;
  extensionBundleIdentifier?: string;
}

/**
 * Creates the extension target Info.plist content
 */
function getExtensionInfoPlist(extensionName: string) {
  return plist.build({
    CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
    CFBundleDisplayName: extensionName,
    CFBundleExecutable: '$(EXECUTABLE_NAME)',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
    CFBundleShortVersionString: '$(MARKETING_VERSION)',
    CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
    NSExtension: {
      NSExtensionPointIdentifier: FINANCE_KIT_EXTENSION_IDENTIFIER,
      NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).BackgroundDeliveryExtension',
    },
    NSFinancialDataUsageDescription: 'This extension receives notifications when financial data changes to keep your app up to date.',
  });
}

/**
 * Creates the extension entitlements content
 */
function getExtensionEntitlements(appGroupIdentifier: string) {
  return plist.build({
    'com.apple.security.application-groups': [appGroupIdentifier],
    'com.apple.developer.financekit': true,
  });
}

/**
 * Generates the Swift source code for the extension
 */
function generateSwiftContent(appGroupIdentifier: string, bundleIdentifier?: string): string {
  return `import FinanceKit
import BackgroundTasks
import os.log

@available(iOS 17.4, *)
class BackgroundDeliveryExtension: NSObject {
    
    private let logger: Logger
    
    override init() {
        // Use dynamic bundle identifier for logger
        let bundleId = Bundle.main.bundleIdentifier ?? "${bundleIdentifier || 'com.expo.financekit'}"
        self.logger = Logger(subsystem: bundleId, category: "BackgroundDelivery")
        super.init()
        logger.info("BackgroundDeliveryExtension initialized")
    }
}

@available(iOS 17.4, *)
extension BackgroundDeliveryExtension: FinanceStoreDataExtension {
    
    func financeStoreDidChange() async {
        logger.info("Received finance store change notification")
        
        // Store sync timestamp
        if let appGroupURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "${appGroupIdentifier}"
        ) {
            let syncData = ["timestamp": Date().timeIntervalSince1970]
            let fileURL = appGroupURL.appendingPathComponent("last_sync.json")
            
            if let jsonData = try? JSONSerialization.data(withJSONObject: syncData) {
                try? jsonData.write(to: fileURL)
            }
        }
        
        // Notify main app
        let mainBundleId = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".finance-background", with: "") ?? "${bundleIdentifier || 'com.expo.financekit'}"
        let notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()
        let notificationName = "\\(mainBundleId).dataChanged" as CFString
        
        CFNotificationCenterPostNotification(
            notificationCenter,
            CFNotificationName(notificationName),
            nil,
            nil,
            true
        )
        
        logger.info("Posted notification to main app")
    }
}`;
}

/**
 * Main plugin for FinanceKit extension
 * Uses withDangerousMod to create extension files, which is necessary
 * because we need to create new files outside the normal mod system
 */
export const withBackgroundDeliveryExtension: ConfigPlugin<Props> = (config, props) => {
  const {
    appGroupIdentifier,
    extensionName = 'FinanceKitBackgroundExtension',
    extensionBundleIdentifier,
  } = props;

  // Use dangerous mod to create extension files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      
      const extensionPath = path.join(platformProjectRoot, extensionName);

      // Create extension directory
      if (!fs.existsSync(extensionPath)) {
        fs.mkdirSync(extensionPath, { recursive: true });
      }

      // Write Swift file
      const swiftPath = path.join(extensionPath, 'BackgroundDeliveryExtension.swift');
      const swiftContent = generateSwiftContent(appGroupIdentifier, config.ios?.bundleIdentifier);
      fs.writeFileSync(swiftPath, swiftContent);

      // Write Info.plist
      const infoPlistPath = path.join(extensionPath, 'Info.plist');
      const infoPlistContent = getExtensionInfoPlist(extensionName);
      fs.writeFileSync(infoPlistPath, infoPlistContent);

      // Write entitlements
      const entitlementsPath = path.join(extensionPath, `${extensionName}.entitlements`);
      const entitlementsContent = getExtensionEntitlements(appGroupIdentifier);
      fs.writeFileSync(entitlementsPath, entitlementsContent);

      console.log(`✅ Created FinanceKit extension files at: ${extensionPath}`);

      return config;
    },
  ]);

  // Use withXcodeProject to log instructions
  // Note: Actually adding the target to Xcode requires manual steps
  config = withXcodeProject(config, (config) => {
    console.warn(`
⚠️  FinanceKit Extension Manual Setup Required:
   
   Extension files have been created at: ios/${extensionName}/
   
   To complete the setup in Xcode:
   1. Open your .xcworkspace file
   2. File > New > Target > App Extension
   3. Select a basic App Extension template
   4. Name it: ${extensionName}
   5. Replace the generated files with the ones created by this plugin
   6. In the extension target's Build Settings:
      - Set iOS Deployment Target to 17.4
      - Add the same App Group as your main app
   7. In Signing & Capabilities:
      - Add App Groups capability
      - Add FinanceKit capability
   
   The extension bundle ID should be: ${extensionBundleIdentifier || `${config.ios?.bundleIdentifier}.finance-background`}
`);
    
    return config;
  });

  return config;
};