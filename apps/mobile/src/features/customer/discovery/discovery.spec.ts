/**
 * Batch C tests: discovery contracts (WP-Discovery) — server query
 * building, context handoff, profile lookup, service-request handoff.
 *
 * The server is the source of truth for filtering: these tests pin the
 * exact query sent to GET /technicians (never client re-filtering).
 */

import { describe, expect, it } from 'vitest';

import { SERVICE_AREA_LABELS, SERVICE_AREA_OPTIONS, serviceAreaMatches } from '../../../lib/service-areas';
import { MockFaultGuideDataSource } from '../fault-guide/mock-fault-guide-data-source';

import { availabilityForDto } from './api-technician-data-source';
import { getTechnicianMatchReasons } from './discovery-match';
import { MockTechnicianDataSource } from './mock-technician-data-source';
import {
  activeFilterCount,
  applyTechnicianFilters,
  buildServiceRequestHandoff,
  buildTechnicianListQuery,
  EMPTY_TECHNICIAN_FILTERS,
  findTechnician,
  isUuid,
  removeTechnicianFilter,
  resolveDiscoveryEmptyKind,
  resolveSearchContext,
} from './technician-types';
import { useTechniciansViewModel } from './use-technicians-view-model';

async function loadTechnicians() {
  return new MockTechnicianDataSource().getTechnicians({ role: 'customer' });
}

describe('technician mock variety', () => {
  it('covers specialties, ratings, verification, areas, appliances', async () => {
    const techs = await loadTechnicians();
    expect(techs.length).toBeGreaterThanOrEqual(6);
    expect(new Set(techs.flatMap((t) => t.specialtiesAr)).size).toBeGreaterThanOrEqual(3);
    expect(techs.some((t) => !t.verified)).toBe(true);
    expect(techs.some((t) => !t.available)).toBe(true);
    for (const slug of ['washing_machine', 'refrigerator', 'air_conditioner'] as const) {
      expect(techs.filter((t) => t.appliances.includes(slug)).length).toBeGreaterThanOrEqual(2);
    }
    for (const t of techs) {
      expect(t.nameAr.length).toBeGreaterThan(0);
      expect(t.rating).toBeGreaterThanOrEqual(1);
      expect(t.rating).toBeLessThanOrEqual(5);
      expect(t.areasAr.length).toBeGreaterThan(0);
    }
  });

  it('exposes the view-model hook', () => {
    expect(typeof useTechniciansViewModel).toBe('function');
  });
});

describe('public availability label (WP-4)', () => {
  it('maps the server availabilityStatus to the approved labels', () => {
    expect(availabilityForDto('available')).toEqual({ available: true, labelAr: 'متاح' });
    expect(availabilityForDto('unavailable')).toEqual({ available: false, labelAr: 'غير متاح' });
    // `busy` is reserved — safe display only.
    expect(availabilityForDto('busy')).toEqual({ available: false, labelAr: 'مشغول حاليًا' });
  });
});

describe('server query building (WP-Discovery)', () => {
  const FAULT_ID = '123e4567-e89b-42d3-a456-426614174000';
  const CATEGORY_ID = '123e4567-e89b-42d3-a456-426614174001';
  const SERVICE_ID = '123e4567-e89b-42d3-a456-426614174002';

  it('sends every supported criterion and nothing else', () => {
    expect(
      buildTechnicianListQuery({
        query: 'سامي',
        applianceCategoryId: CATEGORY_ID,
        serviceId: SERVICE_ID,
        faultId: FAULT_ID,
        minRating: 4.5,
        area: 'مدينة نصر',
        availableOnly: true,
      }),
    ).toEqual({
      q: 'سامي',
      applianceCategoryId: CATEGORY_ID,
      serviceId: SERVICE_ID,
      faultId: FAULT_ID,
      ratingMin: 4.5,
      area: 'مدينة نصر',
      availability: 'available',
    });
  });

  it('omits empty/unknown values instead of sending empty strings', () => {
    expect(
      buildTechnicianListQuery({
        query: '   ',
        applianceCategoryId: null,
        serviceId: null,
        faultId: null,
        minRating: null,
        area: '  ',
        availableOnly: false,
      }),
    ).toEqual({});
  });

  it('refuses non-UUID fault ids (fixture slugs never reach the API)', () => {
    expect(
      buildTechnicianListQuery({
        query: '',
        applianceCategoryId: null,
        serviceId: null,
        faultId: 'wm-leak',
        minRating: null,
        area: null,
        availableOnly: false,
      }),
    ).not.toHaveProperty('faultId');
    expect(isUuid(FAULT_ID)).toBe(true);
    expect(isUuid('wm-leak')).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('legacy client filter (mock/spec parity only)', () => {
  it('keeps only technicians supporting the appliance', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, {
      ...EMPTY_TECHNICIAN_FILTERS,
      appliance: 'washing_machine',
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.appliances.includes('washing_machine'))).toBe(true);
  });

  it('matches the selected specialty', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, {
      ...EMPTY_TECHNICIAN_FILTERS,
      specialty: 'تبريد وتكييف',
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.specialtiesAr.includes('تبريد وتكييف'))).toBe(true);
  });

  it('applies the rating threshold', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, minRating: 4.8 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.rating >= 4.8)).toBe(true);
    expect(result.length).toBeLessThan(techs.length);
  });

  it('requests availability from the server contract instead of filtering the loaded page', async () => {
    const all = await loadTechnicians();
    const available = await new MockTechnicianDataSource().getTechnicians({
      role: 'customer',
      availability: 'available',
    });
    expect(available.length).toBeGreaterThan(0);
    expect(available.length).toBeLessThan(all.length);
    expect(available.every((t) => t.available)).toBe(true);
    const unfiltered = applyTechnicianFilters(all, {
      ...EMPTY_TECHNICIAN_FILTERS,
      availableOnly: true,
    });
    expect(unfiltered).toHaveLength(all.length);
  });

  it('matches service areas', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, {
      ...EMPTY_TECHNICIAN_FILTERS,
      area: 'الإسكندرية – سموحة',
    });
    expect(result.map((t) => t.id)).toEqual(['tech-6']);
  });

  it('searches names, specialties, and services', async () => {
    const techs = await loadTechnicians();
    expect(
      applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, query: 'سامي' }).map(
        (t) => t.id,
      ),
    ).toEqual(['tech-2']);
    const byService = applyTechnicianFilters(techs, {
      ...EMPTY_TECHNICIAN_FILTERS,
      query: 'تعبئة الفريون',
    });
    expect(byService.map((t) => t.id)).toEqual(['tech-4']);
  });

  it('combines facets and can yield empty results', async () => {
    const techs = await loadTechnicians();
    const combined = applyTechnicianFilters(techs, {
      ...EMPTY_TECHNICIAN_FILTERS,
      appliance: 'washing_machine',
      area: 'الإسكندرية – سموحة',
    });
    expect(combined).toHaveLength(0);
  });

  it('counts active filters for the badge and clear action', () => {
    expect(activeFilterCount(EMPTY_TECHNICIAN_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        ...EMPTY_TECHNICIAN_FILTERS,
        query: 'x',
        minRating: 4.5,
        availableOnly: true,
      }),
    ).toBe(3);
  });
});

describe('contextual symptom handoff', () => {
  it('resolves symptom context through the fault guide contract', async () => {
    const guide = await new MockFaultGuideDataSource().getGuide({ role: 'customer' });
    const context = resolveSearchContext(guide, 'wm-leak');
    expect(context).toEqual({
      symptomId: 'wm-leak',
      applianceSlug: 'washing_machine',
      applianceTitleAr: 'غسالات',
      symptomTitleAr: 'تسرب مياه أسفل الغسالة',
      // Fixture ids are synthetic slugs — never a fault UUID.
      faultId: null,
    });
  });

  it('falls back to general search without inventing context', async () => {
    const guide = await new MockFaultGuideDataSource().getGuide({ role: 'customer' });
    expect(resolveSearchContext(guide, null)).toBeNull();
    expect(resolveSearchContext(guide, '')).toBeNull();
    expect(resolveSearchContext(guide, 'unknown-id')).toBeNull();
  });
});

describe('technician selection + profile data', () => {
  it('finds technicians by id and misses cleanly', async () => {
    const techs = await loadTechnicians();
    expect(findTechnician(techs, 'tech-2')?.nameAr).toBe('سامي محمود');
    expect(findTechnician(techs, 'nope')).toBeNull();
  });
});

describe('service request handoff', () => {
  it('builds the typed Batch-D handoff with context', () => {
    expect(
      buildServiceRequestHandoff({
        technicianId: 'tech-2',
        applianceSlug: 'air_conditioner',
        symptomId: 'ac-no-cooling',
      }),
    ).toEqual({
      pathname: '/(customer)/request-service',
      params: { technicianId: 'tech-2', appliance: 'air_conditioner', symptomId: 'ac-no-cooling' },
    });
  });

  it('omits empty context without faking a request', () => {
    expect(buildServiceRequestHandoff({ technicianId: 'tech-4' })).toEqual({
      pathname: '/(customer)/request-service',
      params: { technicianId: 'tech-4' },
    });
  });
});

describe('empty-state classification (Batch A)', () => {
  it('treats an unfiltered empty list as a truly empty catalogue', () => {
    expect(resolveDiscoveryEmptyKind(false)).toBe('catalog');
  });

  it('treats an empty list with any active filter as "no matches"', () => {
    expect(resolveDiscoveryEmptyKind(true)).toBe('filtered');
  });
});

describe('per-filter removal (Batch A)', () => {
  const allFilters = {
    ...EMPTY_TECHNICIAN_FILTERS,
    query: 'غسالة',
    appliance: 'washing_machine' as const,
    specialty: 'إصلاح الغسالات',
    serviceId: 'service-1',
    area: 'مدينة نصر',
    minRating: 4.8,
    availableOnly: true,
  };

  it('removing the appliance also clears the appliance-scoped service', () => {
    const next = removeTechnicianFilter(allFilters, 'appliance');
    expect(next.appliance).toBeNull();
    expect(next.specialty).toBeNull();
    expect(next.serviceId).toBeNull();
    expect(next.query).toBe(allFilters.query);
    expect(next.area).toBe(allFilters.area);
  });

  it('removing the service keeps every other filter intact', () => {
    const next = removeTechnicianFilter(allFilters, 'serviceId');
    expect(next.specialty).toBeNull();
    expect(next.serviceId).toBeNull();
    expect(next.appliance).toBe('washing_machine');
    expect(next.minRating).toBe(4.8);
  });

  it.each([
    ['query', 'query', ''],
    ['area', 'area', null],
    ['minRating', 'minRating', null],
    ['availableOnly', 'availableOnly', false],
  ] as const)('removing %s clears only that filter', (_name, key, expected) => {
    const next = removeTechnicianFilter(allFilters, key);
    expect(next[key]).toEqual(expected);
    expect(next.appliance).toBe('washing_machine');
    expect(next.serviceId).toBe('service-1');
  });

  it('never mutates the input object', () => {
    const snapshot = { ...allFilters };
    removeTechnicianFilter(allFilters, 'appliance');
    expect(allFilters).toEqual(snapshot);
  });
});

describe('service-area vocabulary (Batch A)', () => {
  it('every filter value matches at least one technician-selectable label', () => {
    for (const option of SERVICE_AREA_OPTIONS) {
      expect(
        SERVICE_AREA_LABELS.some((label) => serviceAreaMatches(label, option.value)),
        `filter "${option.value}" matches no canonical area`,
      ).toBe(true);
    }
  });

  it('every technician-selectable label is reachable from the customer filter', () => {
    for (const label of SERVICE_AREA_LABELS) {
      expect(
        SERVICE_AREA_OPTIONS.some((option) => serviceAreaMatches(label, option.value)),
        `area "${label}" is unreachable from the customer filter`,
      ).toBe(true);
    }
  });

  it('has no duplicate filter values or labels', () => {
    expect(new Set(SERVICE_AREA_OPTIONS.map((o) => o.value)).size).toBe(
      SERVICE_AREA_OPTIONS.length,
    );
    expect(new Set(SERVICE_AREA_OPTIONS.map((o) => o.labelAr)).size).toBe(
      SERVICE_AREA_OPTIONS.length,
    );
  });
});

describe('technician match reasons (Batch A)', () => {
  async function loadFirst() {
    const techs = await loadTechnicians();
    const tech = techs.find((t) => t.id === 'tech-1');
    if (tech === undefined) throw new Error('fixture tech-1 missing');
    return tech;
  }

  it('explains only matches proven by the returned technician data', async () => {
    const tech = await loadFirst();
    const reasons = getTechnicianMatchReasons(tech, {
      appliance: 'washing_machine',
      applianceLabel: 'غسالات',
      serviceLabel: 'إصلاح الغسالات',
      area: 'مدينة نصر',
      availableOnly: true,
      faultSymptomTitle: null,
    });
    expect(reasons).toContain('يخدم غسالات');
    expect(reasons).toContain('يقدم إصلاح الغسالات');
    expect(reasons).toContain('يغطي مدينة نصر');
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it('adds the fault context first only when a fault title is supplied', async () => {
    const tech = await loadFirst();
    const reasons = getTechnicianMatchReasons(tech, {
      appliance: 'washing_machine',
      applianceLabel: 'غسالات',
      serviceLabel: null,
      area: null,
      availableOnly: false,
      faultSymptomTitle: 'تسرب مياه أسفل الغسالة',
    });
    expect(reasons[0]).toBe('من نتائج عرض «تسرب مياه أسفل الغسالة»');
  });

  it('never invents a reason from an active filter the technician does not satisfy', async () => {
    const tech = await loadFirst();
    const reasons = getTechnicianMatchReasons(tech, {
      appliance: 'refrigerator',
      applianceLabel: 'ثلاجات',
      serviceLabel: 'صيانة المكيفات',
      area: 'حلوان',
      availableOnly: false,
      faultSymptomTitle: 'ضعف التبريد',
    });
    expect(reasons).toEqual([]);
  });

  it('reports availability only when the technician is actually available', async () => {
    const tech = await loadFirst();
    expect(
      getTechnicianMatchReasons(tech, {
        appliance: null,
        applianceLabel: null,
        serviceLabel: null,
        area: null,
        availableOnly: true,
        faultSymptomTitle: null,
      }),
    ).toEqual(['متاح الآن']);
  });
});
