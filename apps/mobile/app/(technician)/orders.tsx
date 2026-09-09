import TechnicianRequestsScreen from '../../src/features/technician/requests/technician-requests-screen';

/**
 * Route entry: Technician Requests list (T-C). Presentation lives
 * in the feature folder behind `useTechnicianRequestsViewModel`
 * (mock session state today, real API adapter later).
 */
export default function TechnicianOrdersRoute() {
  return <TechnicianRequestsScreen />;
}
