import { ConfigPlugin, withEntitlementsPlist } from '@expo/config-plugins';

export const withEntitlements: ConfigPlugin<{
  appGroupIdentifier: string;
  enableBackgroundDelivery: boolean;
}> = (config, { appGroupIdentifier, enableBackgroundDelivery }) => {
  return withEntitlementsPlist(config, (config) => {
    // Add FinanceKit entitlement
    config.modResults['com.apple.developer.financekit'] = true;
    
    // Add app groups if background delivery is enabled
    if (enableBackgroundDelivery) {
      if (!config.modResults['com.apple.security.application-groups']) {
        config.modResults['com.apple.security.application-groups'] = [];
      }
      
      const groups = config.modResults['com.apple.security.application-groups'] as string[];
      if (!groups.includes(appGroupIdentifier)) {
        groups.push(appGroupIdentifier);
      }
    }
    
    return config;
  });
};