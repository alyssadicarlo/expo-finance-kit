import { ConfigPlugin, withInfoPlist as withInfoPlistBase } from '@expo/config-plugins';

export const withInfoPlist: ConfigPlugin<{ usageDescription: string }> = (
  config,
  { usageDescription }
) => {
  return withInfoPlistBase(config, (config) => {
    // Add financial data usage description
    config.modResults.NSFinancialDataUsageDescription = usageDescription;
    
    return config;
  });
};