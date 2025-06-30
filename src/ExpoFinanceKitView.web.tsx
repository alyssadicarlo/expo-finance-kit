import * as React from 'react';

import { ExpoFinanceKitViewProps } from './ExpoFinanceKit.types';

export default function ExpoFinanceKitView(props: ExpoFinanceKitViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
