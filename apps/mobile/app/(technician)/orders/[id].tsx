import { useLocalSearchParams } from 'expo-router';

import TechnicianRequestDetailScreen from '../../../src/features/technician/requests/technician-request-detail-screen';

/**
 * Route entry: Technician Request Details (T-C).
 * Typed request id; unknown ids render a safe missing state with
 * an exit to the list. Accept/reject follow the documented policy
 * (pending→accepted, pending|accepted→cancelled).
 */
export default function TechnicianOrderDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = typeof params.id === 'string' ? params.id : '';
  return <TechnicianRequestDetailScreen requestId={requestId} />;
}
