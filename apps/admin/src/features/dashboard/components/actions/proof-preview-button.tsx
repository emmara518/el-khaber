import { spacing } from '@khabir/ui-tokens';
import { useState } from 'react';

import { GhostBtn, HintText } from '@/components/ui';
import { AdminApi, AdminApiError } from '@/lib/admin-api';


/**
 * AUD-004: proof preview. Fetches a short-lived presigned GET URL and
 * opens it in a new tab; the URL is never stored, logged locally, or
 * exposed server-side beyond the audit entry (admin.payment.proof_view).
 */
export function ProofPreviewButton({ submissionId }: { submissionId: string }) {
  const [busy, setBusy] = useState(false);
  const [errorAr, setErrorAr] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
      <GhostBtn
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setErrorAr(null);
          AdminApi.get<{ downloadUrl?: string }>(
            `/admin/payments/submissions/${submissionId}/proof-url`,
          )
            .then((data) => {
              const url = data.downloadUrl ?? '';
              if (url.length === 0) {
                setErrorAr('تحتوى الاستجابة على رابط غير صالح');
                return;
              }
              window.open(url, '_blank', 'noopener,noreferrer');
            })
            .catch((err: unknown) => {
              setErrorAr(
                err instanceof AdminApiError && err.status === 404
                  ? 'لا يوجد إثبات مرفق لهذا الطلب'
                  : err instanceof AdminApiError
                    ? err.messageAr
                    : 'تعذر تحميل رابط المعاينة',
              );
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      >
        {busy ? 'جارٍ التحضير…' : 'معاينة الإثبات (رابط مؤقت)'}
      </GhostBtn>
      {errorAr !== null ? <HintText>{errorAr}</HintText> : null}
    </div>
  );
}
