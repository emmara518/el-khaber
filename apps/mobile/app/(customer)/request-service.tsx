/**
 * Service Request route (Batch D) — consumes the unchanged Batch-C
 * handoff contract (`?technicianId=&appliance=&symptomId=`) and
 * hosts the 7-step request form. Exiting abandons the draft without
 * creating anything.
 */

import { useLocalSearchParams } from 'expo-router';

import ServiceRequestScreen from '../../src/features/customer/service-request/service-request-screen';
import { isApplianceSlug } from '../../src/features/customer/service-request/service-request-types';

export default function RequestServiceRoute() {
  const params = useLocalSearchParams<{ technicianId?: string; appliance?: string; symptomId?: string }>();
  const technicianId = typeof params.technicianId === 'string' ? params.technicianId : '';
  const appliance = typeof params.appliance === 'string' && isApplianceSlug(params.appliance)
    ? params.appliance
    : undefined;
  const symptomId =
    typeof params.symptomId === 'string' && params.symptomId.length > 0 ? params.symptomId : undefined;

  return (
    <ServiceRequestScreen
      handoff={{
        technicianId,
        ...(appliance !== undefined ? { appliance } : {}),
        ...(symptomId !== undefined ? { symptomId } : {}),
      }}
    />
  );
}
