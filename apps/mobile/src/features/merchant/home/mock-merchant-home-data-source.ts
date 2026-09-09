/**
 * Mock `MerchantHomeDataSource` (M-A).
 *
 * Deterministic appliance-merchant fixture (مكتبة الخبير للأجهزة).
 * Catalog counts are internally consistent; subscription is the
 * documented عادي plan with no prices. Replaced by a real API
 * adapter without touching the presenter.
 */

import {
  type MerchantHomeDataSource,
  type MerchantHomeViewModel,
} from './merchant-home-types';

const HOME_FIXTURE: MerchantHomeViewModel = {
  profile: {
    businessNameAr: 'مكتبة الخبير للأجهزة',
    initialsAr: 'م',
    cityAr: 'الرياض',
    verification: 'verified',
    verificationNoteAr: 'تم التحقق من بيانات المتجر من قبل فريق الخبير.',
  },
  catalog: {
    totalProducts: 14,
    activeProducts: 11,
    inactiveProducts: 3,
  },
  subscription: {
    planNameAr: 'الباقة العادية',
    statusAr: 'نشطة',
  },
  role: 'merchant',
};

export class MockMerchantHomeDataSource implements MerchantHomeDataSource {
  async getHome(_input: { role: 'merchant' }): Promise<MerchantHomeViewModel> {
    return JSON.parse(JSON.stringify(HOME_FIXTURE)) as MerchantHomeViewModel;
  }
}
