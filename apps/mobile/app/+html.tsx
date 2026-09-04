import { ScrollViewStyleReset } from 'expo-router/html';

import type { PropsWithChildren } from 'react';

/**
 * Web document shell for local visual verification only.
 *
 * This file does not create a separate Web UI. It only sets the HTML
 * document language/direction for the existing React Native app when
 * it is rendered through Expo Web. Native iOS/Android behavior is
 * unchanged.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
