import TechnicianSearchScreen from '../../src/features/customer/discovery/technician-search-screen';

/**
 * Route entry: Technician Search (Batch C).
 *
 * Upgraded from the Batch-B deferred placeholder into the real
 * discovery experience. Contract preserved: `?symptomId=` carries
 * the Fault Guide context (resolved through the existing Fault
 * Guide data boundary, appliance pre-filtered but editable).
 * General search works with no params.
 */
export default function FindTechnicianRoute() {
  return <TechnicianSearchScreen />;
}
