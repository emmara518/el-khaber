import TechnicianProfileScreen from '../../../src/features/customer/discovery/technician-profile-screen';

/**
 * Route entry: Technician Profile (Batch C).
 * Dynamic id is typed (`useLocalSearchParams<{ id }>`) and unknown
 * ids render a safe missing-technician state with a back exit.
 * Context params (`appliance`, `symptomId`) survive for the
 * Batch-D service-request handoff.
 */
export default function TechnicianProfileRoute() {
  return <TechnicianProfileScreen />;
}
