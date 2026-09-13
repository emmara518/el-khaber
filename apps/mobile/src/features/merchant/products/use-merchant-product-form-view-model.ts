/**
 * View-model hook for the merchant product form (create + edit).
 *
 * Owns the draft + mutation lifecycle (idle → submitting →
 * success | error) behind the `MerchantProductDataSource` boundary
 * (Task 10J) — the real API adapter is the default, with an override
 * for deterministic QA. No duplicate submit; failure preserves values.
 */

import { useCallback, useState } from 'react';

import { ApiMerchantProductsDataSource } from './api-merchant-products-data-source';
import { ProductMutationError } from './merchant-product-types';

import type {
  MerchantProduct,
  MerchantProductDataSource,
  MerchantProductDraft,
} from './merchant-product-types';

export type ProductFormStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface MerchantProductFormViewModel {
  status: ProductFormStatus;
  formError: string | null;
  saved: MerchantProduct | null;
  save: (draft: MerchantProductDraft) => void;
  retry: (draft: MerchantProductDraft) => void;
  reset: () => void;
}

export function useMerchantProductFormViewModel(
  mode: 'create' | 'edit',
  productId: string,
  source?: MerchantProductDataSource,
): MerchantProductFormViewModel {
  // Stabilize the default source: a fresh `new Api…()` per render would
  // retrigger consumers endlessly.
  const [stableSource] = useState(() => source ?? new ApiMerchantProductsDataSource());
  const [status, setStatus] = useState<ProductFormStatus>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<MerchantProduct | null>(null);

  const persist = useCallback(
    (draft: MerchantProductDraft) => {
      if (status === 'submitting' || status === 'success') return;
      setStatus('submitting');
      setFormError(null);
      void (async () => {
        try {
          const result =
            mode === 'create'
              ? await stableSource.createProduct({ role: 'merchant', draft })
              : await stableSource.updateProduct({ role: 'merchant', productId, draft });
          setSaved(result);
          setStatus('success');
        } catch (err) {
          setFormError(
            err instanceof ProductMutationError || err instanceof Error
              ? err.message
              : 'تعذر تحديث المنتج. حاول مجددًا',
          );
          setStatus('error');
        }
      })();
    },
     
    [stableSource, status, mode, productId],
  );

  const retry = useCallback(
    (draft: MerchantProductDraft) => {
      setStatus('idle');
      setFormError(null);
      persist(draft);
    },
    [persist],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setFormError(null);
    setSaved(null);
  }, []);

  return { status, formError, saved, save: persist, retry, reset };
}
