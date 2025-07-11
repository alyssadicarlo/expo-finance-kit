import { ConfigPlugin, withInfoPlist } from '@expo/config-plugins';

export const withBackgroundModes: ConfigPlugin<{ backgroundModes: string[] }> = (
  config,
  { backgroundModes }
) => {
  return withInfoPlist(config, (config) => {
    // Add background modes
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    const existingModes = config.modResults.UIBackgroundModes as string[];
    
    for (const mode of backgroundModes) {
      if (!existingModes.includes(mode)) {
        existingModes.push(mode);
      }
    }
    
    return config;
  });
};