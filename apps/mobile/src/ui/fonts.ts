/**
 * Font loading for the Customer app.
 *
 * Registers the bundled OFL-1.1 families under the exact keys used by
 * `./typography`'s `fontFamily` map. Called once from the root layout.
 *
 * The hook is resilient: it only blocks first paint while a load is still
 * in flight. If a font fails, `error` is surfaced and the app renders with
 * the platform fallback rather than getting stuck on a blank screen.
 *
 * See `./typography` for the Aref Graffiti licensing note.
 */

import { useFonts } from 'expo-font';

import AlexandriaBold from '../assets/fonts/Alexandria/Alexandria-Bold.ttf';
import AlexandriaExtraBold from '../assets/fonts/Alexandria/Alexandria-ExtraBold.ttf';
import AlexandriaMedium from '../assets/fonts/Alexandria/Alexandria-Medium.ttf';
import AlexandriaRegular from '../assets/fonts/Alexandria/Alexandria-Regular.ttf';
import AlexandriaSemiBold from '../assets/fonts/Alexandria/Alexandria-SemiBold.ttf';
import ArefRuqaaBold from '../assets/fonts/ArefRuqaa/ArefRuqaa-Bold.ttf';
import ArefRuqaaRegular from '../assets/fonts/ArefRuqaa/ArefRuqaa-Regular.ttf';

export const appFonts = {
  'Alexandria-Regular': AlexandriaRegular,
  'Alexandria-Medium': AlexandriaMedium,
  'Alexandria-SemiBold': AlexandriaSemiBold,
  'Alexandria-Bold': AlexandriaBold,
  'Alexandria-ExtraBold': AlexandriaExtraBold,
  'ArefRuqaa-Regular': ArefRuqaaRegular,
  'ArefRuqaa-Bold': ArefRuqaaBold,
} as const;

/** Load the app fonts. Returns `{ loaded, error }`. */
export function useAppFonts(): { loaded: boolean; error: Error | null } {
  const [loaded, error] = useFonts(appFonts);
  return { loaded, error: error ?? null };
}
