/**
 * Discovery match reasons — explains WHY a technician is in the result
 * list, using only facts the server returned for that technician.
 *
 * Never infers a match from a filter alone: a reason is emitted only when
 * the technician's own data proves it (appliances/services/areas/state).
 * Pure + unit-tested.
 */

import { serviceAreaMatches } from '../../../lib/service-areas';

import type { Technician } from './technician-types';
import type { ApplianceSlug } from '../home/data/customer-home-types';

export interface TechnicianMatchContext {
  readonly appliance: ApplianceSlug | null;
  readonly applianceLabel: string | null;
  readonly serviceLabel: string | null;
  readonly area: string | null;
  readonly availableOnly: boolean;
  /**
   * Only pass a title when the request really carried a fault id (the
   * server filtered by that fault). Synthetic/non-UUID contexts pass null.
   */
  readonly faultSymptomTitle: string | null;
}

const MAX_REASONS = 3;

export function getTechnicianMatchReasons(
  technician: Technician,
  context: TechnicianMatchContext,
): ReadonlyArray<string> {
  const reasons: string[] = [];

  if (
    context.faultSymptomTitle !== null &&
    context.faultSymptomTitle.trim().length > 0 &&
    context.appliance !== null &&
    technician.appliances.includes(context.appliance)
  ) {
    reasons.push(`من نتائج عرض «${context.faultSymptomTitle.trim()}»`);
  }

  if (
    context.appliance !== null &&
    context.applianceLabel !== null &&
    context.applianceLabel.trim().length > 0 &&
    technician.appliances.includes(context.appliance)
  ) {
    reasons.push(`يخدم ${context.applianceLabel.trim()}`);
  }

  if (
    context.serviceLabel !== null &&
    context.serviceLabel.trim().length > 0 &&
    technician.servicesAr.includes(context.serviceLabel)
  ) {
    reasons.push(`يقدم ${context.serviceLabel.trim()}`);
  }

  if (
    context.area !== null &&
    context.area.trim().length > 0 &&
    technician.areasAr.some((label) => serviceAreaMatches(label, context.area ?? ''))
  ) {
    reasons.push(`يغطي ${context.area.trim()}`);
  }

  if (context.availableOnly && technician.available) {
    reasons.push('متاح الآن');
  }

  return [...new Set(reasons)].slice(0, MAX_REASONS);
}
