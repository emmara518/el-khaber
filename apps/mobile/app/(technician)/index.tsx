import TechnicianHomeScreen from '../../src/features/technician/home/technician-home-screen';

/**
 * Route entry: Technician Home (T-A). Presentation lives in the
 * feature folder behind `useTechnicianHomeViewModel` backed by the real
 * API adapter.
 * Other technician tabs remain explicit placeholders until their
 * assigned batches.
 */
export default function TechnicianHomeRoute() {
  return <TechnicianHomeScreen />;
}
