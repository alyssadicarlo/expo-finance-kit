import { ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';
import { withInfoPlist } from './withInfoPlist';
import { withEntitlements } from './withEntitlements';
import { withAppGroups } from './withAppGroups';
import { withBackgroundModes } from './withBackgroundModes';
import { withBackgroundDeliveryExtension } from './withBackgroundDeliveryExtension';

export interface ExpoFinanceKitPluginOptions {
  /**
   * The usage description for financial data access
   * @default "This app needs access to your financial data to display account balances and transactions."
   */
  usageDescription?: string;
  
  /**
   * The app group identifier for sharing data with extensions
   * @default "group.{bundleIdentifier}"
   */
  appGroupIdentifier?: string;
  
  /**
   * Whether to enable the background delivery extension
   * @default true
   */
  enableBackgroundDelivery?: boolean;
  
  /**
   * Custom background modes to add
   * @default ["remote-notification", "processing"]
   */
  backgroundModes?: string[];
}

const withExpoFinanceKit: ConfigPlugin<ExpoFinanceKitPluginOptions> = (
  config,
  options = {}
) => {
  const {
    usageDescription = "This app needs access to your financial data to display account balances and transactions.",
    appGroupIdentifier = options.appGroupIdentifier || `group.${config.ios?.bundleIdentifier || 'com.expo.financekit'}`,
    enableBackgroundDelivery = true,
    backgroundModes = ["remote-notification", "processing"],
  } = options;

  // Add Info.plist entries
  config = withInfoPlist(config, { usageDescription });
  
  // Add entitlements
  config = withEntitlements(config, { 
    appGroupIdentifier,
    enableBackgroundDelivery 
  });
  
  // Configure app groups
  if (enableBackgroundDelivery) {
    config = withAppGroups(config, { appGroupIdentifier });
  }
  
  // Add background modes
  if (enableBackgroundDelivery && backgroundModes.length > 0) {
    config = withBackgroundModes(config, { backgroundModes });
  }
  
  // Add background extension
  if (enableBackgroundDelivery) {
    config = withBackgroundDeliveryExtension(config, { appGroupIdentifier });
  }
  
  return config;
};

export default createRunOncePlugin(withExpoFinanceKit, 'expo-finance-kit');