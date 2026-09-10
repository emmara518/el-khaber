/**
 * M-B tests: merchant onboarding machine, validation, submission,
 * profile persistence, verification states.
 */

import { describe, expect, it } from 'vitest';

import {
  draftFromMerchantProfile,
  merchantVerificationStatusCopy,
  validateMerchantDraft,
  validateMerchantPhone,
} from '../profile/merchant-profile-types';
import {
  MockMerchantProfileDataSource,
  MerchantProfileSaveError,
} from '../profile/mock-merchant-profile-data-source';
import { useMerchantProfileViewModel } from '../profile/use-merchant-profile-view-model';

import {
  INITIAL_MERCHANT_ONBOARDING_STATE,
  MERCHANT_ONBOARDING_STEPS,
  merchantOnboardingReducer,
  validateMerchantOnboardingStep,
  type MerchantOnboardingState,
} from './merchant-onboarding-machine';
import { useMerchantOnboardingViewModel } from './use-merchant-onboarding-view-model';

import type { MerchantProfileDraft } from '../profile/merchant-profile-types';

function validDraft(): MerchantProfileDraft {
  return {
    businessNameAr: 'مكتبة الخبير للأجهزة',
    phoneAr: '0512345678',
    bioAr: 'متجر أجهزة منزلية',
    cityAr: 'الرياض',
  };
}

describe('merchant onboarding draft + progression', () => {
  it('walks all four steps with validation gates', () => {
    let state: MerchantOnboardingState = { ...INITIAL_MERCHANT_ONBOARDING_STATE, draft: validDraft() };
    expect(state.step).toBe('identity');
    for (const expected of MERCHANT_ONBOARDING_STEPS.slice(1)) {
      state = merchantOnboardingReducer(state, { type: 'NEXT' });
      expect(state.step).toBe(expected);
    }
    expect(merchantOnboardingReducer(state, { type: 'NEXT' }).step).toBe('review');
  });

  it('blocks NEXT with Arabic messages when required fields are missing', () => {
    const blocked = merchantOnboardingReducer(INITIAL_MERCHANT_ONBOARDING_STATE, { type: 'NEXT' });
    expect(blocked.step).toBe('identity');
    expect(blocked.stepError).toContain('اسم المتجر');

    const noCity = {
      ...INITIAL_MERCHANT_ONBOARDING_STATE,
      draft: { ...INITIAL_MERCHANT_ONBOARDING_STATE.draft, businessNameAr: 'متجر' },
    };
    const blockedCity = merchantOnboardingReducer(noCity, { type: 'NEXT' });
    expect(blockedCity.stepError).toContain('مدينة');

    const badPhone = {
      ...INITIAL_MERCHANT_ONBOARDING_STATE,
      step: 'contact' as const,
      draft: { ...validDraft(), phoneAr: '123' },
    };
    const blockedPhone = merchantOnboardingReducer(badPhone, { type: 'NEXT' });
    expect(blockedPhone.stepError).toContain('الهاتف');
  });

  it('preserves the draft across BACK', () => {
    let state: MerchantOnboardingState = { ...INITIAL_MERCHANT_ONBOARDING_STATE, draft: validDraft() };
    state = merchantOnboardingReducer(state, { type: 'NEXT' });
    state = merchantOnboardingReducer(state, { type: 'SET_TEXT', field: 'bioAr', text: 'نص محفوظ' });
    state = merchantOnboardingReducer(state, { type: 'BACK' });
    expect(state.step).toBe('identity');
    state = merchantOnboardingReducer(state, { type: 'GOTO', step: 'business' });
    expect(state.draft.bioAr).toBe('نص محفوظ');
  });

  it('validates each step independently (bio optional)', () => {
    const empty = INITIAL_MERCHANT_ONBOARDING_STATE.draft;
    expect(Object.keys(validateMerchantOnboardingStep(empty, 'identity')).length).toBe(2);
    expect(validateMerchantOnboardingStep(empty, 'business')).toEqual({});
    expect(Object.keys(validateMerchantOnboardingStep(empty, 'contact')).length).toBe(1);
    expect(Object.keys(validateMerchantOnboardingStep(validDraft(), 'review'))).toHaveLength(0);
  });

  it('validates phone like the shared contract', () => {
    expect(validateMerchantPhone('')).not.toBeNull();
    expect(validateMerchantPhone('123')).not.toBeNull();
    expect(validateMerchantPhone('0512345678')).toBeNull();
  });

  it('exposes the onboarding view-model hook', () => {
    expect(typeof useMerchantOnboardingViewModel).toBe('function');
  });
});

describe('mock submission (pending, never approved)', () => {
  it('submits a valid draft into pending review', async () => {
    const source = new MockMerchantProfileDataSource();
    const result = await source.submitVerificationProfile({ role: 'merchant', profile: validDraft() });
    expect(result.verification).toBe('pending');
    expect(result.verificationNoteAr).toContain('مراجعة');
  });

  it('rejects invalid drafts and failing mode without faking success', async () => {
    const source = new MockMerchantProfileDataSource();
    await expect(
      source.submitVerificationProfile({ role: 'merchant', profile: INITIAL_MERCHANT_ONBOARDING_STATE.draft }),
    ).rejects.toBeInstanceOf(MerchantProfileSaveError);
    await expect(
      new MockMerchantProfileDataSource({ kind: 'approved' }, 'failing').submitVerificationProfile({
        role: 'merchant',
        profile: validDraft(),
      }),
    ).rejects.toBeInstanceOf(MerchantProfileSaveError);
  });
});

describe('verification states', () => {
  it('covers pending/approved/rejected/action_required copy', () => {
    expect(merchantVerificationStatusCopy('approved').titleAr).toBe('تم التحقق');
    expect(merchantVerificationStatusCopy('pending').titleAr).toBe('قيد المراجعة');
    expect(merchantVerificationStatusCopy('rejected').titleAr).toBe('تعذر اعتماد البيانات');
    expect(merchantVerificationStatusCopy('action_required').titleAr).toBe('يحتاج إلى تحديث البيانات');
  });

  it('seeds every status + incomplete profile deterministically', async () => {
    for (const kind of ['pending', 'approved', 'rejected', 'action_required', 'incomplete'] as const) {
      const profile = await new MockMerchantProfileDataSource({ kind }).getProfile({ role: 'merchant' });
      if (kind === 'incomplete') {
        expect(profile.bioAr).toBe('');
        expect(profile.verification).toBe('action_required');
      } else {
        expect(profile.verification).toBe(kind);
      }
    }
  });

  it('uses generic messages (no invented rejection taxonomy / legal claims)', () => {
    const corpus = Object.values(merchantVerificationStatusCopy('rejected')).join(' ');
    for (const banned of ['سجل تجاري', 'رقم ضريبي', 'بنكي', 'مرخّص', 'حكومي']) {
      expect(corpus).not.toContain(banned);
    }
  });
});

describe('merchant profile persistence', () => {
  it('saves valid edits and derives initials', async () => {
    const source = new MockMerchantProfileDataSource();
    const updated = await source.saveProfile({
      role: 'merchant',
      profile: { ...validDraft(), businessNameAr: 'متجر الأجهزة الحديثة' },
    });
    expect(updated.businessNameAr).toBe('متجر الأجهزة الحديثة');
    expect(updated.initialsAr).toBe('م');
  });

  it('rejects invalid edits and failing mode', async () => {
    const source = new MockMerchantProfileDataSource();
    await expect(
      source.saveProfile({ role: 'merchant', profile: INITIAL_MERCHANT_ONBOARDING_STATE.draft }),
    ).rejects.toBeInstanceOf(MerchantProfileSaveError);
    await expect(
      new MockMerchantProfileDataSource({ kind: 'approved' }, 'failing').saveProfile({
        role: 'merchant',
        profile: validDraft(),
      }),
    ).rejects.toBeInstanceOf(MerchantProfileSaveError);
  });

  it('converts a profile back to an editable draft', async () => {
    const profile = await new MockMerchantProfileDataSource().getProfile({ role: 'merchant' });
    const draft = draftFromMerchantProfile(profile);
    expect(draft.businessNameAr).toBe(profile.businessNameAr);
    expect(Object.keys(validateMerchantDraft(draft))).toHaveLength(0);
  });

  it('exposes the profile view-model hook', () => {
    expect(typeof useMerchantProfileViewModel).toBe('function');
  });
});
