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
  ProductMutationError,
  validateProductDraft,
  type MerchantProduct,
  type MerchantProductDraft,
  type MerchantProductStatus,
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
  createProduct(input: { role: 'merchant'; draft: MerchantProductDraft }): Promise<MerchantProduct>;
  updateProduct(input: { role: 'merchant'; productId: string; draft: MerchantProductDraft }): Promise<MerchantProduct>;
  setProductStatus(input: { role: 'merchant'; productId: string; status: MerchantProductStatus }): Promise<MerchantProduct>;
}

export class MockMerchantProductsDataSource implements MerchantProductsDataSource {
  private readonly rows = new Map<string, MerchantProduct>();
  private createCount = 0;

  constructor(private readonly mode: 'success' | 'failing' | 'empty' = 'success') {
    if (mode !== 'empty') {
      for (const row of SEED) this.rows.set(row.id, withLabels({ ...row }));
    }
  }

  async getProducts(_input: { role: 'merchant' }): Promise<ReadonlyArray<MerchantProduct>> {
    if (this.mode === 'failing') {
      throw new Error('تعذر تحميل المنتجات');
    }
    return JSON.parse(JSON.stringify([...this.rows.values()])) as ReadonlyArray<MerchantProduct>;
  }

  async createProduct(input: {
    role: 'merchant';
    draft: MerchantProductDraft;
  }): Promise<MerchantProduct> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (this.mode === 'failing') throw new ProductMutationError();
    const errors = validateProductDraft(input.draft);
    if (Object.keys(errors).length > 0) {
      throw new ProductMutationError('بيانات المنتج غير مكتملة');
    }
    this.createCount += 1;
    const created: MerchantProduct = {
      id: `mp-new-${this.createCount}`,
      nameAr: input.draft.nameAr,
      descriptionAr: input.draft.descriptionAr,
      categoryAr: input.draft.categoryAr,
      priceSar: input.draft.priceSar,
      hasImage: input.draft.imageSelected,
      status: 'active',
      statusLabelAr: PRODUCT_STATUS_LABELS.active,
    };
    this.rows.set(created.id, created);
    return JSON.parse(JSON.stringify(created)) as MerchantProduct;
  }

  async updateProduct(input: {
    role: 'merchant';
    productId: string;
    draft: MerchantProductDraft;
  }): Promise<MerchantProduct> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (this.mode === 'failing') throw new ProductMutationError();
    const current = this.rows.get(input.productId);
    if (!current) throw new ProductMutationError('المنتج غير موجود');
    const errors = validateProductDraft(input.draft);
    if (Object.keys(errors).length > 0) {
      throw new ProductMutationError('بيانات المنتج غير مكتملة');
    }
    const updated: MerchantProduct = {
      ...current,
      nameAr: input.draft.nameAr,
      descriptionAr: input.draft.descriptionAr,
      categoryAr: input.draft.categoryAr,
      priceSar: input.draft.priceSar,
      hasImage: input.draft.imageSelected,
    };
    this.rows.set(input.productId, updated);
    return JSON.parse(JSON.stringify(updated)) as MerchantProduct;
  }

  async setProductStatus(input: {
    role: 'merchant';
    productId: string;
    status: MerchantProductStatus;
  }): Promise<MerchantProduct> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.mode === 'failing') throw new ProductMutationError();
    const current = this.rows.get(input.productId);
    if (!current) throw new ProductMutationError('المنتج غير موجود');
    if (current.status === input.status) {
      throw new ProductMutationError('حالة المنتج الحالية مطابقة للإجراء المطلوب');
    }
    const updated: MerchantProduct = {
      ...current,
      status: input.status,
      statusLabelAr: PRODUCT_STATUS_LABELS[input.status],
    };
    this.rows.set(input.productId, updated);
    return JSON.parse(JSON.stringify(updated)) as MerchantProduct;
  }
}

/**
 * Session-scoped shared instance: catalog/detail/form screens must
 * observe the SAME in-memory session so mutations stay consistent
 * across navigation (M-D §17). The shipped screens use the real API
 * adapter instead; this mock remains the deterministic fixture for the
 * spec suite only.
 */
export const sharedMerchantProductsSource = new MockMerchantProductsDataSource();
