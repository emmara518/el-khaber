/**
 * Batch C tests: discovery filters, context handoff, profile lookup,
 * service-request handoff contract.
 */

import { describe, expect, it } from 'vitest';

import { MockFaultGuideDataSource } from '../fault-guide/mock-fault-guide-data-source';

import { MockTechnicianDataSource } from './mock-technician-data-source';
import {
  activeFilterCount,
  applyTechnicianFilters,
  buildServiceRequestHandoff,
  EMPTY_TECHNICIAN_FILTERS,
  findTechnician,
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

describe('appliance filtering', () => {
  it('keeps only technicians supporting the appliance', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, appliance: 'washing_machine' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.appliances.includes('washing_machine'))).toBe(true);
  });
});

describe('specialty filtering', () => {
  it('matches the selected specialty', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, specialty: 'تبريد وتكييف' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.specialtiesAr.includes('تبريد وتكييف'))).toBe(true);
  });
});

describe('rating + availability + area + query', () => {
  it('applies the rating threshold', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, minRating: 4.8 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.rating >= 4.8)).toBe(true);
    expect(result.length).toBeLessThan(techs.length);
  });

  it('restricts to available technicians when asked', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, availableOnly: true });
    expect(result.every((t) => t.available)).toBe(true);
    expect(result.length).toBeLessThan(techs.length);
  });

  it('matches service areas', async () => {
    const techs = await loadTechnicians();
    const result = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, area: 'جدة – الروضة' });
    expect(result.map((t) => t.id)).toEqual(['tech-6']);
  });

  it('searches names, specialties, and services', async () => {
    const techs = await loadTechnicians();
    expect(applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, query: 'سامي' }).map((t) => t.id)).toEqual(['tech-2']);
    const byService = applyTechnicianFilters(techs, { ...EMPTY_TECHNICIAN_FILTERS, query: 'تعبئة الفريون' });
    expect(byService.map((t) => t.id)).toEqual(['tech-4']);
  });

  it('combines facets and can yield empty results', async () => {
    const techs = await loadTechnicians();
    const combined = applyTechnicianFilters(techs, {
      ...EMPTY_TECHNICIAN_FILTERS,
      appliance: 'washing_machine',
      area: 'جدة – الروضة',
    });
    expect(combined).toHaveLength(0);
  });

  it('counts active filters for the badge and clear action', () => {
    expect(activeFilterCount(EMPTY_TECHNICIAN_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...EMPTY_TECHNICIAN_FILTERS, query: 'x', minRating: 4.5, availableOnly: true }),
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
    expect(findTechnician(techs, 'tech-2')?.nameAr).toBe('سامي محيور');
    expect(findTechnician(techs, 'nope')).toBeNull();
  });
});

describe('service request handoff', () => {
  it('builds the typed Batch-D handoff with context', () => {
    expect(
      buildServiceRequestHandoff({ technicianId: 'tech-2', applianceSlug: 'air_conditioner', symptomId: 'ac-no-cooling' }),
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
