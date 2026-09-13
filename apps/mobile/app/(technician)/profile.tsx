import { ApiTechnicianProfileDataSource } from '../../src/features/technician/profile/api-technician-profile-data-source';
import TechnicianProfileScreen from '../../src/features/technician/profile/technician-profile-screen';

/**
 * Route entry: Technician Profile (T-B).
 * Approved → view + edit; pending → status + read-only summary;
 * rejected/action_required → status + update-data entry into the
 * prefilled onboarding flow. Other tabs stay placeholders.
 */
export default function TechnicianProfileRoute() {
  return <TechnicianProfileScreen source={new ApiTechnicianProfileDataSource()} />;
}
