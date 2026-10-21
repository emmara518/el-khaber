/**
 * Customer active-tab resolution (ISSUE-002 / ISSUE-015).
 *
 * The tab bar may only present a tab as active when the current route
 * actually belongs to that tab. Routes that are not themselves a tab
 * (technician profile, the 7-step service request, subscription) resolve
 * to `null` so no unrelated tab is misleadingly highlighted.
 *
 * Kept free of Expo Router imports so it stays unit-testable.
 */

export type CustomerTabId = 'home' | 'requests' | 'maintenance' | 'messages' | 'profile';

export function tabIdForPathname(pathname: string): CustomerTabId | null {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname === '/requests' || pathname.startsWith('/requests/')) return 'requests';
  if (pathname === '/maintenance' || pathname.startsWith('/maintenance/')) return 'maintenance';
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return 'messages';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
  // Not a tab route (e.g. /technician/[id], /request-service, /subscription):
  // no tab is active.
  return null;
}

/**
 * Full-screen customer flows that must render as an isolated journey
 * with NO global bottom tab bar:
 * - `/request-service` — the 7-step request wizard (own Back/Next nav),
 * - `/requests/[id]` — order tracking detail (its own exit action).
 *
 * The tab-bar-less treatment is keyed off the route, not off view state,
 * so it stays correct across back/forward navigation and deep links.
 */
export function isCustomerFlowRoute(pathname: string): boolean {
  if (pathname === '/request-service') return true;
  if (pathname.startsWith('/requests/')) return true;
  return false;
}
