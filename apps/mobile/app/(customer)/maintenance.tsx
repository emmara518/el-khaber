import FaultGuideScreen from '../../src/features/customer/fault-guide/fault-guide-screen';

/**
 * Route entry: Maintenance = Fault Guide (Batch B).
 * Full flow (appliance → symptom → result) lives in the feature
 * folder behind `useFaultGuideViewModel` + `faultGuideReducer`.
 */
export default function MaintenanceRoute() {
  return <FaultGuideScreen />;
}
