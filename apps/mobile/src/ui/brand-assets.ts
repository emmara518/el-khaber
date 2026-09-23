/**
 * El-Khabir brand asset registry — the single source of truth for the
 * approved 512×512 WebP 3D UI icons.
 *
 * Runtime format: WebP. These files were normalized in Phase 0 from the
 * PNG masters archived in `apps/public/`. The masters are the archive and
 * are NOT bundled or imported here — `apps/public` is never a runtime path.
 *
 * Every entry is a static import. There is NO dynamic filesystem discovery.
 *
 * ── Bundle optimization ───────────────────────────────────────────────
 * Metro does not tree-shake a single aggregate object, so only the
 * assets the app actually renders are registered below. Folders are
 * wired selectively — only the marks a screen genuinely uses are
 * imported:
 *   - `action-navigation-icons/` — the 4 destination icons the customer
 *     tab bar uses (home / my-requests / messages / profile). The other
 *     8 stay out of the bundle.
 *   - `illustration-assets/`     — currently the Home hero illustration.
 *   - `app-icon/app-icon.webp` is intentionally NOT imported — it is an
 *     in-app emblem, not an OS icon.
 * Their files remain in `src/assets/brand/**` and can be added here (as
 * their own static imports) when a screen genuinely needs them.
 * ──────────────────────────────────────────────────────────────────────
 *
 * ── Inventory exceptions (documented, deliberately not fixed here) ────
 * - `water-heater1` — an extra competing version of `water-heater`,
 *   shipped as a distinct file. Kept as its own key because it exists;
 *   it is NOT in the official inventory. Do not wire it without a decision.
 * - `pending` — lives under `feature-icons/`, but `pending` is officially
 *   a STATUS (#22). Registered under its real folder; re-categorization
 *   belongs to a later status phase.
 * - MISSING from the source library (no entry exists, none invented):
 *   `fan`, `other-appliance`, `app-icon-concept-01` … `app-icon-concept-06`.
 * ──────────────────────────────────────────────────────────────────────
 */

import home from '../assets/brand/action-navigation-icons/home.webp';
import messages from '../assets/brand/action-navigation-icons/messages.webp';
import myRequests from '../assets/brand/action-navigation-icons/my-requests.webp';
import profile from '../assets/brand/action-navigation-icons/profile.webp';
import airConditioner from '../assets/brand/appliance-categories/air-conditioner.webp';
import coffeeMachine from '../assets/brand/appliance-categories/coffee-machine.webp';
import dishwasher from '../assets/brand/appliance-categories/dishwasher.webp';
import microwave from '../assets/brand/appliance-categories/microwave.webp';
import oven from '../assets/brand/appliance-categories/oven.webp';
import refrigerator from '../assets/brand/appliance-categories/refrigerator.webp';
import tvScreen from '../assets/brand/appliance-categories/tv-screen.webp';
import vacuumCleaner from '../assets/brand/appliance-categories/vacuum-cleaner.webp';
import washingMachine from '../assets/brand/appliance-categories/washing-machine.webp';
import waterHeater from '../assets/brand/appliance-categories/water-heater.webp';
import waterHeater1 from '../assets/brand/appliance-categories/water-heater1.webp';
import ecoFriendly from '../assets/brand/badge-tag-icons/eco-friendly.webp';
import fast from '../assets/brand/badge-tag-icons/fast.webp';
import featured from '../assets/brand/badge-tag-icons/featured.webp';
import premium from '../assets/brand/badge-tag-icons/premium.webp';
import topRated from '../assets/brand/badge-tag-icons/top-rated.webp';
import verified from '../assets/brand/badge-tag-icons/verified.webp';
import warranty from '../assets/brand/badge-tag-icons/warranty.webp';
import noConnection from '../assets/brand/empty-state-icons/no-connection.webp';
import noRequests from '../assets/brand/empty-state-icons/no-requests.webp';
import noResults from '../assets/brand/empty-state-icons/no-results.webp';
import somethingWrong from '../assets/brand/empty-state-icons/something-wrong.webp';
import bookService from '../assets/brand/feature-icons/book-service.webp';
import certifiedTechnician from '../assets/brand/feature-icons/certified-technician.webp';
import diagnostics from '../assets/brand/feature-icons/diagnostics.webp';
import emergency from '../assets/brand/feature-icons/emergency.webp';
import homeService from '../assets/brand/feature-icons/home-service.webp';
import maintenance from '../assets/brand/feature-icons/maintenance.webp';
import pending from '../assets/brand/feature-icons/pending.webp';
import repair from '../assets/brand/feature-icons/repair.webp';
import spareParts from '../assets/brand/feature-icons/spare-parts.webp';
import support from '../assets/brand/feature-icons/support.webp';
import homeServiceIllustration from '../assets/brand/illustration-assets/home-service-illustration.webp';
import accepted from '../assets/brand/status-icons/accepted.webp';
import cancelled from '../assets/brand/status-icons/cancelled.webp';
import completed from '../assets/brand/status-icons/completed.webp';
import inProgress from '../assets/brand/status-icons/in-progress.webp';
import onTheWay from '../assets/brand/status-icons/on-the-way.webp';
import scheduled from '../assets/brand/status-icons/scheduled.webp';
import booked from '../assets/brand/success-feedback/booked.webp';
import error from '../assets/brand/success-feedback/error.webp';
import info from '../assets/brand/success-feedback/info.webp';
import rateUs from '../assets/brand/success-feedback/rate-us.webp';
import success from '../assets/brand/success-feedback/success.webp';
import thankYou from '../assets/brand/success-feedback/thank-you.webp';
import warning from '../assets/brand/success-feedback/warning.webp';
import customer from '../assets/brand/user-type-icons/customer.webp';
import merchant from '../assets/brand/user-type-icons/merchant.webp';
import technician from '../assets/brand/user-type-icons/technician.webp';

import type { ImageSourcePropType } from 'react-native';

/**
 * Canonical asset name → runtime WebP module. Keys are the exact approved
 * asset names (kebab-case, matching the normalized file names).
 */
export const brandAssets = {
  // action & navigation icons (only the destinations the app actually has)
  home,
  messages,
  'my-requests': myRequests,
  profile,

  // appliance categories
  'air-conditioner': airConditioner,
  'coffee-machine': coffeeMachine,
  dishwasher,
  microwave,
  oven,
  refrigerator,
  'tv-screen': tvScreen,
  'vacuum-cleaner': vacuumCleaner,
  'washing-machine': washingMachine,
  'water-heater': waterHeater,
  'water-heater1': waterHeater1,

  // feature icons
  'book-service': bookService,
  'certified-technician': certifiedTechnician,
  diagnostics,
  emergency,
  'home-service': homeService,
  maintenance,
  pending,
  repair,
  'spare-parts': spareParts,
  support,

  // illustration assets (selectively wired)
  'home-service-illustration': homeServiceIllustration,

  // status icons
  accepted,
  cancelled,
  completed,
  'in-progress': inProgress,
  'on-the-way': onTheWay,
  scheduled,

  // user type icons
  customer,
  merchant,
  technician,

  // badge & tag icons
  'eco-friendly': ecoFriendly,
  fast,
  featured,
  premium,
  'top-rated': topRated,
  verified,
  warranty,

  // empty state icons
  'no-connection': noConnection,
  'no-requests': noRequests,
  'no-results': noResults,
  'something-wrong': somethingWrong,

  // success & feedback
  booked,
  error,
  info,
  'rate-us': rateUs,
  success,
  'thank-you': thankYou,
  warning,
} as const satisfies Record<string, ImageSourcePropType>;

/** Canonical asset name accepted by `brandAssets`. */
export type BrandAssetName = keyof typeof brandAssets;

/** Asset categories currently registered in the bundle. */
export type BrandAssetCategory =
  | 'action-navigation-icons'
  | 'appliance-categories'
  | 'feature-icons'
  | 'illustration-assets'
  | 'status-icons'
  | 'user-type-icons'
  | 'badge-tag-icons'
  | 'empty-state-icons'
  | 'success-feedback';

/**
 * Category → member names. Type-checked against `BrandAssetName`, so this
 * cannot drift from the registry above (each string must be a real key).
 * Listing only — it holds no asset modules of its own.
 */
export const brandAssetsByCategory = {
  'action-navigation-icons': ['home', 'messages', 'my-requests', 'profile'],
  'appliance-categories': [
    'air-conditioner',
    'coffee-machine',
    'dishwasher',
    'microwave',
    'oven',
    'refrigerator',
    'tv-screen',
    'vacuum-cleaner',
    'washing-machine',
    'water-heater',
    'water-heater1',
  ],
  'feature-icons': [
    'book-service',
    'certified-technician',
    'diagnostics',
    'emergency',
    'home-service',
    'maintenance',
    'pending',
    'repair',
    'spare-parts',
    'support',
  ],
  'illustration-assets': ['home-service-illustration'],
  'status-icons': ['accepted', 'cancelled', 'completed', 'in-progress', 'on-the-way', 'scheduled'],
  'user-type-icons': ['customer', 'merchant', 'technician'],
  'badge-tag-icons': ['eco-friendly', 'fast', 'featured', 'premium', 'top-rated', 'verified', 'warranty'],
  'empty-state-icons': ['no-connection', 'no-requests', 'no-results', 'something-wrong'],
  'success-feedback': ['booked', 'error', 'info', 'rate-us', 'success', 'thank-you', 'warning'],
} as const satisfies Record<BrandAssetCategory, readonly BrandAssetName[]>;
