import { AuthorizationStatus } from './ExpoFinanceKit.types';
import ExpoFinanceKit from './ExpoFinanceKitModule';

/**
 * Request authorization and return the final status
 * This handles the async nature of the authorization flow
 */
export async function requestAuthorizationWithStatus(): Promise<{
  granted: boolean;
  status: AuthorizationStatus;
}> {
  try {
    // Request authorization
    const granted = await ExpoFinanceKit.requestAuthorization();
    
    // Get the updated status after authorization
    const status = await ExpoFinanceKit.getAuthorizationStatus();
    
    return {
      granted,
      status
    };
  } catch (error) {
    console.error('Error requesting FinanceKit authorization:', error);
    return {
      granted: false,
      status: 'denied'
    };
  }
}

/**
 * Helper to ensure we have authorization before accessing financial data
 */
export async function ensureAuthorized(): Promise<boolean> {
  const status = await ExpoFinanceKit.getAuthorizationStatus() as AuthorizationStatus;
  
  if (status === 'authorized') {
    return true;
  }
  
  if (status === 'notDetermined') {
    const { granted } = await requestAuthorizationWithStatus();
    return granted;
  }
  
  return false;
}