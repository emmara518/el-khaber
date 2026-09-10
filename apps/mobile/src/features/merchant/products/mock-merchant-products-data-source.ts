/**
 * Mock `MerchantProductsDataSource` (M-C).
 *
 * Deterministic appliance fixtures covering: all documented
 * categories, active + suspended states, with/without image, long
 * Arabic name/description, and a nullable price (displayed only
 * when present — docs/06 §21 price nullable). Seeds for empty and
 * failing modes power the QA states. No stock/SKU/financial data.
 */

import {
  PRODUCT_STATUS_LABELS,
  type MerchantProduct,
} from './merchant-product-types';

interface SeedRow extends Omit<MerchantProduct, 'statusLabelAr'> {
  status: MerchantProduct['status'];
}

const SEED: ReadonlyArray<SeedRow> = [
  {
    id: 'mp-001',
    nameAr: 'غسالة أوتوماتيك سامسونج ١٢ كجم',
    descriptionAr: 'غسالة أوتوماتيك بسعة كبيرة وتقنية البخار، مناسبة للأسر الكبيرة مع ضمان المتجر.',
    categoryAr: 'غسالات',
    priceSar: 2450,
    hasImage: true,
    status: 'active',
  },
  {
    id: 'mp-002',
    nameAr: 'ثلاجة إل جي بابين',
    descriptionAr: 'ثلاجة بابين بتقنية التبريد الخطي وموفرة للطاقة، تشمل التركيب داخل الرياض.',
    categoryAr: 'ثلاجات',
    priceSar: 3890,
    hasImage: false,
    status: 'active',
  },
  {
    id: 'mp-003',
    nameAr: 'مكيف سبليت جي ١.٥ طن',
    descriptionAr: 'مكيف سبليت مبرد سريع مع فلتر تنقية الهواء وضمان تركيب مجاني.',
    categoryAr: 'تكييفات',
    priceSar: null,
    hasImage: false,
    status: 'active',
  },
  {
    id: 'mp-004',
    nameAr: 'طقم خراطيم وفلتر مياه للغسالات الأوتوماتيكية الأصلية المتوافقة مع جميع الماركات الشائعة',
    descriptionAr: 'طقم كامل من الخراطيم المرنة عالية الجودة مع فلتر مياه داخلي يحمي الغسالة من الرواسب ويزيد من عمر المكائن، متوافق مع جميع الماركات الشائعة في السوق المحلي ويأتي بضمان استبدال لمدة ستة أشهر.',
    categoryAr: 'لوازم وقطع غيار',
    priceSar: 89,
    hasImage: false,
    status: 'active',
  },
  {
    id: 'mp-005',
    nameAr: 'مكيف شباك زانوسي',
    descriptionAr: 'مكيف شباك اقتصادي مناسب للمكاتب والغرف الصغيرة.',
    categoryAr: 'تكييفات',
    priceSar: 1290,
    hasImage: false,
    status: 'suspended',
  },
  {
    id: 'mp-006',
    nameAr: 'فلتر فريزر ثلاجات',
    descriptionAr: 'قطعة غيار أصلية لثلاجات الفريزر.',
    categoryAr: 'لوازم وقطع غيار',
    priceSar: null,
    hasImage: false,
    status: 'suspended',
  },
];

function withLabels(row: SeedRow): MerchantProduct {
  return { ...row, statusLabelAr: PRODUCT_STATUS_LABELS[row.status] } as MerchantProduct;
}

export interface MerchantProductsDataSource {
  getProducts(input: { role: 'merchant' }): Promise<ReadonlyArray<MerchantProduct>>;
}

export class MockMerchantProductsDataSource implements MerchantProductsDataSource {
  constructor(private readonly mode: 'success' | 'failing' | 'empty' = 'success') {}

  async getProducts(_input: { role: 'merchant' }): Promise<ReadonlyArray<MerchantProduct>> {
    if (this.mode === 'failing') {
      throw new Error('تعذر تحميل المنتجات');
    }
    if (this.mode === 'empty') return [];
    return JSON.parse(JSON.stringify(SEED.map(withLabels))) as ReadonlyArray<MerchantProduct>;
  }
}
