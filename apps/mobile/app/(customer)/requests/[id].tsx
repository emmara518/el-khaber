import { useLocalSearchParams } from 'expo-router';

import OrderTrackingScreen from '../../../src/features/customer/orders/order-tracking-screen';

/**
 * Route entry: Order Tracking (Batch E).
 * Typed request id; unknown ids render a safe missing state with
 * an exit to the requests list. Chat opens as a dialog over this
 * screen; completion + rating render inline for completed orders.
 */
export default function OrderTrackingRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = typeof params.id === 'string' ? params.id : '';
  return <OrderTrackingScreen requestId={requestId} />;
}
