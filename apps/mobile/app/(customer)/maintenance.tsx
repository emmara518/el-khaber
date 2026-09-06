import MaintenanceEntryScreen from '../../src/features/customer/maintenance/maintenance-entry-screen';

/**
 * Route entry: Maintenance (Fault Guide entry). The full diagnostic
 * drill-down ships in Batch B; this route hosts the entry experience
 * behind the maintenance ViewModel.
 */
export default function MaintenanceRoute() {
  return <MaintenanceEntryScreen />;
}
