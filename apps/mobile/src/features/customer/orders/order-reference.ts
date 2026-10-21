/**
 * Customer-facing order reference.
 *
 * The service-request UUID is the internal identity used by routing and
 * the API, and is never shown to the customer. The API contract exposes
 * no separate human order number, so the value below is a deterministic,
 * presentation-only shortening of the existing id. It changes neither
 * persistence nor business identity: the full UUID keeps driving
 * `/(customer)/requests/[id]` and every API call.
 */

export function formatOrderReference(requestId: string): string {
  const compact = requestId.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
  return compact.length === 0 ? 'KH' : `KH-${compact.slice(0, 6)}`;
}

export function orderReferenceLabel(requestId: string): string {
  return `رقم الطلب: ${formatOrderReference(requestId)}`;
}
