import { useLocalSearchParams } from 'expo-router';

import TechnicianActiveServiceScreen from '../../src/features/technician/requests/technician-active-service-screen';

/**
 * Route entry: Technician Active Service (T-D).
 * Typed request id via `?id=`; shares the shared request session
 * source so list/detail/active transitions stay consistent. Terminal
 * states render without any mutation actions.
 */
export default function ActiveServiceRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = typeof params.id === 'string' ? params.id : '';
  return <TechnicianActiveServiceScreen requestId={requestId} />;
}
