import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoFinanceKitViewProps } from './ExpoFinanceKit.types';

const NativeView: React.ComponentType<ExpoFinanceKitViewProps> =
  requireNativeView('ExpoFinanceKit');

export default function ExpoFinanceKitView(props: ExpoFinanceKitViewProps) {
  return <NativeView {...props} />;
}
