import TechnicianServicesScreen from '../../src/features/technician/services/technician-services-screen';

/**
 * Route entry: Technician Services (T-F). Attach/detach catalog
 * services through the real /technician/services endpoints. Presentation
 * lives in the feature folder behind `useTechnicianServicesViewModel`.
 */
export default function TechnicianServicesRoute() {
  return <TechnicianServicesScreen />;
}
