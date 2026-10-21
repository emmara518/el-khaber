/**
 * Customer request routes — typed builders so navigation to the
 * tracking screen is defined once and stays testable.
 */

export interface RequestTrackingRoute {
  pathname: '/(customer)/requests/[id]';
  params: { id: string };
}

/** Tracking route for a request id (TASK-011). */
export function requestTrackingRoute(id: string): RequestTrackingRoute {
  return { pathname: '/(customer)/requests/[id]', params: { id } };
}
