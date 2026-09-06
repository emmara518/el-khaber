import TechnicianHomeScreen from '../../src/features/technician/home/technician-home-screen';

/**
 * Route entry: Technician Home (T-A). Presentation lives in the
 * feature folder behind `useTechnicianHomeViewModel` (mock data
 * source today, real API adapter later without touching this file).
 * Other technician tabs remain explicit placeholders until their
 * assigned batches.
 */
export default function TechnicianHomeRoute() {
  return <TechnicianHomeScreen />;
}
