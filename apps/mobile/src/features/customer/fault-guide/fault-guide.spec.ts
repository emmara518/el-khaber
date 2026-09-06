/**
 * Batch B tests: fault guide machine, scoping, retrieval, safety.
 *
 * - appliance / symptom filtering, result retrieval, no-match,
 *   restart, full state transitions, error path, selected state,
 * - safety audit: fixture copy must never contain destructive or
 *   live-electrical instructions and must always escalate risky
 *   cases to a technician.
 */

import { describe, expect, it } from 'vitest';

import {
  INITIAL_FAULT_GUIDE_STATE,
  faultGuideReducer,
} from './fault-guide-machine';
import {
  detailForSymptom,
  symptomsForAppliance,
} from './fault-guide-types';
import { MockFaultGuideDataSource } from './mock-fault-guide-data-source';
import { useFaultGuideViewModel } from './use-fault-guide-view-model';

async function loadFixture() {
  return new MockFaultGuideDataSource().getGuide({ role: 'customer' });
}

describe('appliance catalogue (locked)', () => {
  it('exposes exactly غسالات/ثلاجات/تكييفات', async () => {
    const guide = await loadFixture();
    expect(guide.appliances.map((a) => a.slug).sort()).toEqual(
      ['air_conditioner', 'refrigerator', 'washing_machine'].sort(),
    );
  });

  it('exposes the view-model hook', () => {
    expect(typeof useFaultGuideViewModel).toBe('function');
  });
});

describe('symptom scoping', () => {
  it('returns symptoms for the selected appliance only', async () => {
    const guide = await loadFixture();
    for (const appliance of guide.appliances) {
      const scoped = symptomsForAppliance(guide.symptoms, appliance.slug);
      expect(scoped.length).toBeGreaterThan(0);
      expect(scoped.every((s) => s.applianceSlug === appliance.slug)).toBe(true);
    }
  });
});

describe('result retrieval + no-match', () => {
  it('resolves a detail for every non-"other" symptom', async () => {
    const guide = await loadFixture();
    const detailed = guide.symptoms.filter((s) => !s.id.endsWith('-other'));
    expect(detailed.length).toBe(9);
    for (const symptom of detailed) {
      const detail = detailForSymptom(guide.details, symptom.id);
      expect(detail).not.toBeNull();
      expect(detail?.possibleCausesAr.length).toBeGreaterThan(0);
      expect(detail?.safeStepsAr.length).toBeGreaterThan(0);
      expect(detail?.actionAr.length).toBeGreaterThan(0);
    }
  });

  it('returns null for the "other" symptoms (NO_MATCH path)', async () => {
    const guide = await loadFixture();
    const others = guide.symptoms.filter((s) => s.id.endsWith('-other'));
    expect(others).toHaveLength(3);
    for (const symptom of others) {
      expect(detailForSymptom(guide.details, symptom.id)).toBeNull();
    }
  });

  it('returns null for unknown ids', async () => {
    const guide = await loadFixture();
    expect(detailForSymptom(guide.details, 'does-not-exist')).toBeNull();
  });
});

describe('state machine transitions', () => {
  it('walks APPLIANCE → SYMPTOM → LOADING → RESULT', () => {
    let state = INITIAL_FAULT_GUIDE_STATE;
    expect(state.step).toBe('APPLIANCE');
    state = faultGuideReducer(state, { type: 'SELECT_APPLIANCE', slug: 'refrigerator' });
    expect(state).toEqual({ step: 'SYMPTOM', appliance: 'refrigerator', symptomId: null });
    state = faultGuideReducer(state, { type: 'SELECT_SYMPTOM', symptomId: 'rf-noise' });
    expect(state.step).toBe('LOADING');
    expect(state.symptomId).toBe('rf-noise');
    state = faultGuideReducer(state, { type: 'RESOLVE', found: true });
    expect(state.step).toBe('RESULT');
  });

  it('resolves to NO_MATCH when no detail exists', () => {
    let state = faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, {
      type: 'SELECT_APPLIANCE',
      slug: 'washing_machine',
    });
    state = faultGuideReducer(state, { type: 'SELECT_SYMPTOM', symptomId: 'wm-other' });
    state = faultGuideReducer(state, { type: 'RESOLVE', found: false });
    expect(state.step).toBe('NO_MATCH');
  });

  it('enters ERROR on failure and retries into LOADING', () => {
    let state = faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, {
      type: 'SELECT_APPLIANCE',
      slug: 'air_conditioner',
    });
    state = faultGuideReducer(state, { type: 'SELECT_SYMPTOM', symptomId: 'ac-smell' });
    state = faultGuideReducer(state, { type: 'FAIL' });
    expect(state.step).toBe('ERROR');
    // Symptom context is preserved for the retry.
    expect(state.symptomId).toBe('ac-smell');
    state = faultGuideReducer(state, { type: 'RETRY' });
    expect(state.step).toBe('LOADING');
  });

  it('backs out without dead ends and restarts cleanly', () => {
    let state = faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, {
      type: 'SELECT_APPLIANCE',
      slug: 'refrigerator',
    });
    state = faultGuideReducer(state, { type: 'SELECT_SYMPTOM', symptomId: 'rf-noise' });
    state = faultGuideReducer(state, { type: 'RESOLVE', found: true });
    // RESULT → SYMPTOM keeps the appliance (selected state preserved).
    state = faultGuideReducer(state, { type: 'BACK' });
    expect(state).toEqual({ step: 'SYMPTOM', appliance: 'refrigerator', symptomId: 'rf-noise' });
    // SYMPTOM → APPLIANCE clears the selection.
    state = faultGuideReducer(state, { type: 'BACK' });
    expect(state).toEqual(INITIAL_FAULT_GUIDE_STATE);
    // RESTART from anywhere returns to initial.
    const deep = faultGuideReducer(
      faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, { type: 'SELECT_APPLIANCE', slug: 'air_conditioner' }),
      { type: 'SELECT_SYMPTOM', symptomId: 'ac-smell' },
    );
    expect(faultGuideReducer(deep, { type: 'RESTART' })).toEqual(INITIAL_FAULT_GUIDE_STATE);
  });

  it('ignores out-of-order events', () => {
    expect(faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, { type: 'BACK' })).toEqual(
      INITIAL_FAULT_GUIDE_STATE,
    );
    expect(
      faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, { type: 'SELECT_SYMPTOM', symptomId: 'x' }),
    ).toEqual(INITIAL_FAULT_GUIDE_STATE);
    expect(faultGuideReducer(INITIAL_FAULT_GUIDE_STATE, { type: 'RETRY' })).toEqual(
      INITIAL_FAULT_GUIDE_STATE,
    );
  });
});

describe('safety copy audit', () => {
  // Imperative dangerous instructions. Prohibitions ("لا تحاول…",
  // "دون فك…") are the safe pattern and are asserted separately.
  const BANNED = [
    'افتح اللوحة',
    'لوحة الكهرباء',
    'تيار حي',
    'تجاوز مفتاح',
    'فك الضاغط',
    'اشحن الفريون',
    'أعد توصيل الأسلاك',
    'المس الأسلاك',
  ];

  it('contains no destructive or live-electrical instructions', async () => {
    const guide = await loadFixture();
    const corpus = guide.details
      .flatMap((d) => [...d.possibleCausesAr, ...d.safeStepsAr, d.actionAr, d.warningAr ?? ''])
      .join('\n');
    for (const phrase of BANNED) {
      expect(corpus).not.toContain(phrase);
    }
  });

  it('uses uncertain language for causes', async () => {
    const guide = await loadFixture();
    for (const detail of guide.details) {
      for (const cause of detail.possibleCausesAr) {
        expect(cause).toMatch(/قد يكون|من الأسباب المحتملة/);
      }
    }
  });

  it('every result escalates to a technician in its action', async () => {
    const guide = await loadFixture();
    for (const detail of guide.details) {
      expect(detail.actionAr).toContain('فني');
    }
  });

  it('risky symptoms carry an explicit warning', async () => {
    const guide = await loadFixture();
    for (const id of ['wm-leak', 'ac-no-cooling', 'ac-smell']) {
      expect(detailForSymptom(guide.details, id)?.warningAr).not.toBeNull();
    }
  });
});
