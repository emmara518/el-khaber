/**
 * Batch A — Fault Guide text search.
 *
 * Covers: documented Arabic normalization (alef forms, tashkeel, tatweel),
 * title/summary matching, no-results, adapter summary mapping, and the
 * machine transition used by cross-appliance search selection.
 *
 * Text search only: no structured error-code support is claimed or tested.
 */

import { describe, expect, it } from 'vitest';

import { mapFaultListItem } from './api-fault-guide-data-source';
import { INITIAL_FAULT_GUIDE_STATE, faultGuideReducer } from './fault-guide-machine';
import { normalizeArabicForSearch, matchesArabicQuery, searchFaultSymptoms } from './fault-search';

import type { FaultSymptom } from './fault-guide-types';
import type { FaultSummaryDto } from '@khabir/shared-types';

const SYMPTOMS: ReadonlyArray<FaultSymptom> = [
  {
    id: 'wm-spin',
    applianceSlug: 'washing_machine',
    titleAr: 'الغسالة لا تعصر والملابس مبللة',
    summaryAr: 'توقف الغسالة عند خطوة العصر',
    frequencyAr: '',
  },
  {
    id: 'rf-cooling',
    applianceSlug: 'refrigerator',
    titleAr: 'ضعف التبريد في الثلاجة',
    summaryAr: 'تراكم الثلج في الفريزر',
    frequencyAr: '',
  },
  {
    id: 'ac-drip',
    applianceSlug: 'air_conditioner',
    titleAr: 'التكييف ينقط مياه',
    summaryAr: 'تساقط قطرات المياه من الوحدة الداخلية',
    frequencyAr: '',
  },
  {
    id: 'wm-leak',
    applianceSlug: 'washing_machine',
    titleAr: 'تسريب مياه من الغسالة',
    frequencyAr: '',
  },
];

describe('Arabic normalization (documented scope)', () => {
  it('removes tashkeel and shadda', () => {
    expect(normalizeArabicForSearch('الغسّالة')).toBe('الغسالة');
    expect(normalizeArabicForSearch('تَسْرِيب')).toBe('تسريب');
  });

  it('removes tatweel/kashida', () => {
    expect(normalizeArabicForSearch('غـــسالة')).toBe('غسالة');
  });

  it('unifies alef variants', () => {
    expect(normalizeArabicForSearch('أحمد إحمد آحمد ٱحمد')).toBe('احمد احمد احمد احمد');
  });

  it('collapses whitespace and lowercases Latin text', () => {
    expect(normalizeArabicForSearch('  ABC   Def  ')).toBe('abc def');
  });

  it('does not normalize ta marbuta or alef maqsura (documented non-goal)', () => {
    expect(normalizeArabicForSearch('غسالة')).toBe('غسالة');
    expect(normalizeArabicForSearch('غساله')).toBe('غساله');
    expect(normalizeArabicForSearch('مصطفى')).toBe('مصطفى');
  });
});

describe('query matching', () => {
  it('matches alef variants in the query', () => {
    expect(matchesArabicQuery('أحمد محمود', 'احمد')).toBe(true);
  });

  it('matches multiple tokens regardless of order', () => {
    expect(matchesArabicQuery('الغسالة لا تعصر والملابس مبللة', 'تعصر الغسالة')).toBe(true);
  });

  it('returns false for an empty or whitespace-only query', () => {
    expect(matchesArabicQuery('أي نص', '')).toBe(false);
    expect(matchesArabicQuery('أي نص', '   ')).toBe(false);
  });
});

describe('search across all appliances', () => {
  it('finds a fault by its title', () => {
    expect(searchFaultSymptoms(SYMPTOMS, 'تسريب').map((s) => s.id)).toEqual(['wm-leak']);
  });

  it('finds a fault by its published summary', () => {
    expect(searchFaultSymptoms(SYMPTOMS, 'العصر').map((s) => s.id)).toEqual(['wm-spin']);
    expect(searchFaultSymptoms(SYMPTOMS, 'الفريزر').map((s) => s.id)).toEqual(['rf-cooling']);
  });

  it('searches across appliances (not just the first one)', () => {
    expect(searchFaultSymptoms(SYMPTOMS, 'التكييف').map((s) => s.id)).toEqual(['ac-drip']);
  });

  it('preserves guide order for multiple matches', () => {
    expect(searchFaultSymptoms(SYMPTOMS, 'الغسالة').map((s) => s.id)).toEqual([
      'wm-spin',
      'wm-leak',
    ]);
  });

  it('returns an empty list for no matches or an empty query', () => {
    expect(searchFaultSymptoms(SYMPTOMS, 'سخان')).toEqual([]);
    expect(searchFaultSymptoms(SYMPTOMS, '')).toEqual([]);
  });
});

describe('adapter summary mapping', () => {
  const dto: FaultSummaryDto = {
    id: 'fault-1',
    applianceCategoryId: '123e4567-e89b-42d3-a456-426614174000',
    nameAr: 'تسريب مياه من الغسالة',
    slug: 'washing-leak',
    severityLevel: null,
    summaryAr: 'أسباب تسريب المياه من أسفل الغسالة',
    sortOrder: 1,
  };

  it('carries the published summary verbatim for search', () => {
    expect(mapFaultListItem(dto, 'washing_machine')).toEqual({
      id: 'fault-1',
      applianceSlug: 'washing_machine',
      titleAr: 'تسريب مياه من الغسالة',
      summaryAr: 'أسباب تسريب المياه من أسفل الغسالة',
      frequencyAr: '',
    });
  });

  it('omits a blank summary instead of inventing copy', () => {
    const mapped = mapFaultListItem({ ...dto, summaryAr: '   ' }, 'refrigerator');
    expect(mapped.summaryAr).toBeUndefined();
    expect('summaryAr' in mapped).toBe(false);
  });
});

describe('cross-appliance selection state (Batch A)', () => {
  it('starts the existing resolve flow from an appliance-step search result', () => {
    const state = faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, {
      type: 'SELECT_SEARCH_RESULT',
      slug: 'washing_machine',
      symptomId: 'wm-spin',
    });
    expect(state).toEqual({
      step: 'LOADING',
      appliance: 'washing_machine',
      symptomId: 'wm-spin',
    });
  });

  it('backs out through the existing symptom/appliance steps', () => {
    let state = faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, {
      type: 'SELECT_SEARCH_RESULT',
      slug: 'refrigerator',
      symptomId: 'rf-cooling',
    });
    state = faultGuideReducer(state, { type: 'RESOLVE', found: true });
    expect(state.step).toBe('RESULT');
    state = faultGuideReducer(state, { type: 'BACK' });
    expect(state).toEqual({
      step: 'SYMPTOM',
      appliance: 'refrigerator',
      symptomId: 'rf-cooling',
    });
    state = faultGuideReducer(state, { type: 'BACK' });
    expect(state).toEqual({ step: 'APPLIANCE', appliance: null, symptomId: null });
  });

  it('ignores the search event outside the appliance step', () => {
    const inSymptoms = faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, {
      type: 'SELECT_APPLIANCE',
      slug: 'washing_machine',
    });
    expect(
      faultGuideReducer(inSymptoms, {
        type: 'SELECT_SEARCH_RESULT',
        slug: 'refrigerator',
        symptomId: 'rf-cooling',
      }),
    ).toEqual(inSymptoms);
  });
});
