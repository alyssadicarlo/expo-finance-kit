import { ConfigPlugin, withInfoPlist as withInfoPlistBase } from '@expo/config-plugins';

export const withInfoPlist: ConfigPlugin<{ usageDescription: string }> = (
  config,
  { usageDescription }
) => {
  return withInfoPlistBase(config, (config) => {
    // Add financial data usage description
    config.modResults.NSFinancialDataUsageDescription = usageDescription;
    
    // Add background task identifiers for transaction syncing
    if (!config.modResults.BGTaskSchedulerPermittedIdentifiers) {
      config.modResults.BGTaskSchedulerPermittedIdentifiers = [];
    }
    const identifiers = config.modResults.BGTaskSchedulerPermittedIdentifiers as string[];
    const backgroundTaskId = 'com.expo.financekit.sync';
    if (!identifiers.includes(backgroundTaskId)) {
      identifiers.push(backgroundTaskId);
    }
    
    return config;
  });
};