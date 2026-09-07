/**
 * T-B tests: onboarding machine, validation, submission, profile
 * persistence, verification states.
 */

import { describe, expect, it } from 'vitest';

import {
  MockTechnicianProfileDataSource,
  ProfileSaveError,
} from '../profile/mock-technician-profile-data-source';
import {
  draftFromProfile,
  toggleStringList,
  validateProfileDraft,
  validateTechnicianPhone,
  verificationStatusCopy,
  type TechnicianProfileDraft,
} from '../profile/technician-profile-types';
import { useTechnicianProfileViewModel } from '../profile/use-technician-profile-view-model';

import {
  INITIAL_ONBOARDING_STATE,
  ONBOARDING_STEPS,
  onboardingReducer,
  validateOnboardingStep,
  type OnboardingState,
} from './technician-onboarding-machine';
import { useTechnicianOnboardingViewModel } from './use-technician-onboarding-view-model';

function validDraft(): TechnicianProfileDraft {
  return {
    displayNameAr: 'سامي محيور',
    phoneAr: '0512345678',
    bioAr: 'فني تكييف',
    experienceYears: 12,
    specialtiesAr: ['تبريد وتكييف'],
    appliances: ['air_conditioner' as const],
    servicesAr: ['صيانة المكيفات'],
    areasAr: ['العليا'],
  };
}

describe('onboarding draft + progression', () => {
  it('walks all six steps with validation gates', () => {
    let state: OnboardingState = {
      ...INITIAL_ONBOARDING_STATE,
      draft: { ...validDraft(), displayNameAr: '', phoneAr: '' },
    };
    // Blocked on info without name/phone.
    const blocked = onboardingReducer(state, { type: 'NEXT' });
    expect(blocked.step).toBe('info');
    expect(blocked.stepError).not.toBeNull();
    state = { ...state, draft: validDraft() };
    for (const expected of ONBOARDING_STEPS.slice(1)) {
      state = onboardingReducer(state, { type: 'NEXT' });
      expect(state.step).toBe(expected);
    }
    expect(onboardingReducer(state, { type: 'NEXT' }).step).toBe('review');
  });

  it('preserves the draft across BACK', () => {
    let state: OnboardingState = { ...INITIAL_ONBOARDING_STATE, draft: validDraft() };
    state = onboardingReducer(state, { type: 'NEXT' });
    state = onboardingReducer(state, { type: 'TOGGLE_AREA', value: 'الشفا' });
    state = onboardingReducer(state, { type: 'BACK' });
    expect(state.step).toBe('info');
    expect(state.draft.displayNameAr).toBe('سامي محيور');
    state = onboardingReducer(state, { type: 'GOTO', step: 'areas' });
    // Forward jump validates intermediate steps (all valid here).
    expect(state.step).toBe('areas');
    expect(state.draft.areasAr).toContain('الشفا');
  });

  it('validates each step independently', () => {
    const empty = INITIAL_ONBOARDING_STATE.draft;
    expect(Object.keys(validateOnboardingStep(empty, 'info')).length).toBeGreaterThan(0);
    expect(validateOnboardingStep(empty, 'appliances')).toEqual({ appliances: expect.any(String) });
    expect(validateOnboardingStep(empty, 'services')).toEqual({ servicesAr: expect.any(String) });
    expect(validateOnboardingStep(empty, 'areas')).toEqual({ areasAr: expect.any(String) });
    expect(Object.keys(validateOnboardingStep(validDraft(), 'review'))).toHaveLength(0);
  });

  it('toggles multi-selects without duplication', () => {
    expect(toggleStringList(['a'], 'a')).toEqual([]);
    expect(toggleStringList(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('validates phone like the shared contract', () => {
    expect(validateTechnicianPhone('')).not.toBeNull();
    expect(validateTechnicianPhone('123')).not.toBeNull();
    expect(validateTechnicianPhone('0512345678')).toBeNull();
    expect(validateTechnicianPhone('+966512345678')).toBeNull();
  });

  it('exposes the onboarding view-model hook', () => {
    expect(typeof useTechnicianOnboardingViewModel).toBe('function');
  });
});

describe('mock submission (pending, never approved)', () => {
  it('submits a valid draft into pending review', async () => {
    const source = new MockTechnicianProfileDataSource();
    const result = await source.submitVerificationProfile({ role: 'technician', profile: validDraft() });
    expect(result.verification).toBe('pending');
    expect(result.verificationNoteAr).toContain('مراجعة');
  });

  it('rejects invalid drafts and failing mode without faking success', async () => {
    const source = new MockTechnicianProfileDataSource();
    await expect(
      source.submitVerificationProfile({ role: 'technician', profile: INITIAL_ONBOARDING_STATE.draft }),
    ).rejects.toBeInstanceOf(ProfileSaveError);
    await expect(
      new MockTechnicianProfileDataSource({ kind: 'approved' }, 'failing').submitVerificationProfile({
        role: 'technician',
        profile: validDraft(),
      }),
    ).rejects.toBeInstanceOf(ProfileSaveError);
  });
});

describe('verification states', () => {
  it('covers pending/approved/rejected/action_required copy', () => {
    expect(verificationStatusCopy('approved').titleAr).toBe('تم التحقق');
    expect(verificationStatusCopy('pending').titleAr).toBe('قيد المراجعة');
    expect(verificationStatusCopy('rejected').titleAr).toBe('تعذر اعتماد البيانات');
    expect(verificationStatusCopy('action_required').titleAr).toBe('يحتاج إلى تحديث البيانات');
  });

  it('seeds every status deterministically', async () => {
    for (const kind of ['pending', 'approved', 'rejected', 'action_required'] as const) {
      const profile = await new MockTechnicianProfileDataSource({ kind }).getProfile({ role: 'technician' });
      expect(profile.verification).toBe(kind);
    }
  });

  it('seeds empty services/areas for empty-state QA', async () => {
    const noServices = await new MockTechnicianProfileDataSource({ kind: 'empty_services' }).getProfile({
      role: 'technician',
    });
    expect(noServices.servicesAr).toHaveLength(0);
    const noAreas = await new MockTechnicianProfileDataSource({ kind: 'empty_areas' }).getProfile({
      role: 'technician',
    });
    expect(noAreas.areasAr).toHaveLength(0);
  });

  it('uses generic messages (no invented rejection taxonomy)', async () => {
    const rejected = await new MockTechnicianProfileDataSource({ kind: 'rejected' }).getProfile({
      role: 'technician',
    });
    expect(rejected.verificationNoteAr.length).toBeGreaterThan(0);
    expect(verificationStatusCopy('rejected').bodyAr.length).toBeGreaterThan(0);
  });
});

describe('profile edit persistence', () => {
  it('saves valid edits and derives initials', async () => {
    const source = new MockTechnicianProfileDataSource();
    const updated = await source.saveProfile({
      role: 'technician',
      profile: { ...validDraft(), displayNameAr: 'خالد المطيري' },
    });
    expect(updated.displayNameAr).toBe('خالد المطيري');
    expect(updated.initialsAr).toBe('خ');
    // Server-owned metrics survive the edit.
    expect(updated.rating).toBe(4.9);
    expect(updated.reviewCount).toBe(213);
  });

  it('rejects invalid edits and failing mode', async () => {
    const source = new MockTechnicianProfileDataSource();
    await expect(
      source.saveProfile({ role: 'technician', profile: INITIAL_ONBOARDING_STATE.draft }),
    ).rejects.toBeInstanceOf(ProfileSaveError);
    await expect(
      new MockTechnicianProfileDataSource({ kind: 'approved' }, 'failing').saveProfile({
        role: 'technician',
        profile: validDraft(),
      }),
    ).rejects.toBeInstanceOf(ProfileSaveError);
  });

  it('converts a profile back to an editable draft', async () => {
    const profile = await new MockTechnicianProfileDataSource().getProfile({ role: 'technician' });
    const draft = draftFromProfile(profile);
    expect(draft.displayNameAr).toBe(profile.displayNameAr);
    expect(draft.appliances).toEqual(profile.appliances);
    expect(Object.keys(validateProfileDraft(draft))).toHaveLength(0);
  });

  it('exposes the profile view-model hook', () => {
    expect(typeof useTechnicianProfileViewModel).toBe('function');
  });
});
