/**
 * View-model for the subscription surface (WP-6).
 *
 * Loads plans + current subscription + enabled payment methods + own
 * submissions, and owns the existing MVP manual-payment lifecycle: submit a
 * pending payment (server review), then re-read server truth. No optimistic
 * state persists, and a duplicate submission is guarded client-side.
 */

import { useCallback, useEffect, useState } from 'react';

import { toUserError, toUserMessage } from '../../lib/api-error';
import {
  pickProfilePhotoFromLibrary,
  profilePhotoSizeErrorAr,
  takeProfilePhotoWithCamera,
  type PickedPhoto,
} from '../../lib/profile-photo';

import {
  ApiPaymentsDataSource,
  type PaymentMethodConfig,
  type PaymentsDataSource,
  type PaymentSubmission,
  type ProofUploadGrant,
} from './api-payments-data-source';
import {
  ApiSubscriptionsDataSource,
  type SubscriptionsDataSource,
} from './api-subscriptions-data-source';
import {
  canCancelRenewal,
  canSelectPlan,
  canSubmitPayment,
  subscribeNextAction,
  type CurrentSubscription,
  type PaymentMethod,
  type PaymentSubmitStatus,
  type SubscriptionPlan,
  type SubscriptionRole,
} from './subscription-types';

export type SubscriptionLoadStatus = 'loading' | 'loaded' | 'error';

export type ProofStatus =
  | 'idle'
  | 'picking'
  | 'ready'
  | 'uploading'
  | 'confirming'
  | 'done'
  | 'error';

export interface SubscriptionViewState {
  readonly plans: ReadonlyArray<SubscriptionPlan>;
  readonly current: CurrentSubscription | null;
  readonly methods: ReadonlyArray<PaymentMethodConfig>;
  readonly submissions: ReadonlyArray<PaymentSubmission>;
  readonly status: SubscriptionLoadStatus;
  readonly error: Error | null;
  readonly cancelling: boolean;
  readonly cancelError: string | null;
  readonly submitStatus: PaymentSubmitStatus;
  readonly submitError: string | null;
  readonly reload: () => void;
  readonly cancelRenewal: () => void;
  readonly submitPayment: (input: {
    planId: string;
    method: PaymentMethod;
    transferReference: string;
  }) => void;
  readonly resetSubmit: () => void;
  /** WP-Proof: proof-attach flow for one pending submission. */
  readonly proofSubmissionId: string | null;
  readonly pendingProofPhoto: PickedPhoto | null;
  readonly proofStatus: ProofStatus;
  readonly proofError: string | null;
  readonly openProofFor: (submissionId: string) => void;
  readonly pickProofLibrary: () => void;
  readonly takeProofCamera: () => void;
  readonly confirmProofUpload: () => void;
  readonly retryProof: () => void;
  readonly dismissProof: () => void;
  readonly closeProof: () => void;
}

export function useSubscriptionViewModel(
  role: SubscriptionRole = 'customer',
  source?: SubscriptionsDataSource,
  paymentsSource?: PaymentsDataSource,
): SubscriptionViewState {
  const [subs] = useState<SubscriptionsDataSource>(
    () => source ?? new ApiSubscriptionsDataSource(),
  );
  const [payments] = useState<PaymentsDataSource>(
    () => paymentsSource ?? new ApiPaymentsDataSource(),
  );
  const [attempt, setAttempt] = useState(0);
  const [plans, setPlans] = useState<ReadonlyArray<SubscriptionPlan>>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [methods, setMethods] = useState<ReadonlyArray<PaymentMethodConfig>>([]);
  const [submissions, setSubmissions] = useState<ReadonlyArray<PaymentSubmission>>([]);
  const [status, setStatus] = useState<SubscriptionLoadStatus>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<PaymentSubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [proofSubmissionId, setProofSubmissionId] = useState<string | null>(null);
  const [pendingProofPhoto, setPendingProofPhoto] = useState<PickedPhoto | null>(null);
  const [proofGrant, setProofGrant] = useState<ProofUploadGrant | null>(null);
  const [proofStatus, setProofStatus] = useState<ProofStatus>('idle');
  const [proofError, setProofError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    Promise.all([
      subs.getPlans({ role }),
      subs.getCurrent({ role }),
      // Payment config/history are supporting reads — a failure there must
      // not blank the whole surface (honest empty sections instead).
      payments.getConfig({ role }).catch(() => [] as ReadonlyArray<PaymentMethodConfig>),
      payments.getSubmissions({ role }).catch(() => [] as ReadonlyArray<PaymentSubmission>),
    ])
      .then(([planRows, currentRow, methodRows, submissionRows]) => {
        if (cancelled) return;
        setPlans(planRows);
        setCurrent(currentRow);
        setMethods(methodRows);
        setSubmissions(submissionRows);
        setStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(toUserError(err, 'تعذّر تحميل بيانات الاشتراك. حاول مرة أخرى.'));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [subs, payments, role, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const cancelRenewal = useCallback(() => {
    if (current === null || !canCancelRenewal(current)) return;
    setCancelling(true);
    setCancelError(null);
    void (async () => {
      try {
        const updated = await subs.cancelRenewal({ role, subscriptionId: current.id });
        setCurrent(updated ?? current);
      } catch (err) {
        setCancelError(toUserMessage(err, 'تعذر إلغاء التجديد. حاول مجددًا'));
      } finally {
        setCancelling(false);
      }
    })();
  }, [subs, role, current]);

  const submitPayment = useCallback(
    (input: { planId: string; method: PaymentMethod; transferReference: string }) => {
      // Duplicate-submission guard: ignore while a submission is in flight
      // or already succeeded (the user can reset to resubmit deliberately).
      if (!canSubmitPayment(submitStatus)) return;
      setSubmitStatus('submitting');
      setSubmitError(null);
      void (async () => {
        try {
          await payments.submitPayment({
            role,
            planId: input.planId,
            method: input.method,
            transferReference: input.transferReference.trim(),
          });
          // Re-read SERVER truth (never optimistically assume activation).
          const [nextCurrent, nextSubmissions] = await Promise.all([
            subs.getCurrent({ role }).catch(() => current),
            payments.getSubmissions({ role }).catch(() => submissions),
          ]);
          setCurrent(nextCurrent);
          setSubmissions(nextSubmissions);
          setSubmitStatus('success');
        } catch (err) {
          setSubmitError(toUserMessage(err, 'تعذر إرسال طلب الدفع. حاول مجددًا'));
          setSubmitStatus('error');
        }
      })();
    },
    [payments, subs, role, submitStatus, current, submissions],
  );

  const resetSubmit = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
  }, []);

  const openProofFor = useCallback((submissionId: string) => {
    setProofSubmissionId(submissionId);
    setPendingProofPhoto(null);
    setProofGrant(null);
    setProofStatus('idle');
    setProofError(null);
  }, []);

  const closeProof = useCallback(() => {
    setProofSubmissionId(null);
    setPendingProofPhoto(null);
    setProofGrant(null);
    setProofStatus('idle');
    setProofError(null);
  }, []);

  const settlePickedProof = useCallback(
    (photo: PickedPhoto | null, deniedMessage: string | null) => {
      if (photo === null && deniedMessage === null) {
        setProofStatus('idle');
        return;
      }
      if (deniedMessage !== null) {
        setProofError(deniedMessage);
        setProofStatus('error');
        return;
      }
      const sizeError = profilePhotoSizeErrorAr(photo?.sizeBytes ?? null);
      if (sizeError !== null) {
        setProofError(sizeError);
        setProofStatus('error');
        return;
      }
      setPendingProofPhoto(photo);
      setProofStatus('ready');
    },
    [],
  );

  const pickProofLibrary = useCallback(() => {
    setProofStatus('picking');
    setProofError(null);
    void (async () => {
      const result = await pickProfilePhotoFromLibrary();
      if (result.outcome === 'cancelled') {
        setProofStatus('idle');
      } else if (result.outcome === 'denied') {
        settlePickedProof(null, result.messageAr);
      } else {
        settlePickedProof(result.photo, null);
      }
    })();
  }, [settlePickedProof]);

  const takeProofCamera = useCallback(() => {
    setProofStatus('picking');
    setProofError(null);
    void (async () => {
      const result = await takeProfilePhotoWithCamera();
      if (result.outcome === 'cancelled') {
        setProofStatus('idle');
      } else if (result.outcome === 'denied') {
        settlePickedProof(null, result.messageAr);
      } else {
        settlePickedProof(result.photo, null);
      }
    })();
  }, [settlePickedProof]);

  const runProofUpload = useCallback(
    async (submissionId: string, photo: PickedPhoto, grant: ProofUploadGrant | null) => {
      // Reuse an existing grant on retry (PUT is idempotent to the same
      // key; re-requesting would orphan the previous key server-side).
      const activeGrant =
        grant ?? (await payments.requestProofUploadUrl({ submissionId, mimeType: photo.mimeType }));
      if (grant === null) {
        setProofGrant(activeGrant);
      }
      setProofStatus('uploading');
      await payments.putProofBytes({ grant: activeGrant, photo });
      setProofStatus('confirming');
      await payments.confirmProof({ submissionId, storageKey: activeGrant.storageKey });
      const nextSubmissions = await payments.getSubmissions({ role }).catch(() => submissions);
      setSubmissions(nextSubmissions);
      setProofStatus('done');
    },
    [payments, role, submissions],
  );

  const confirmProofUpload = useCallback(() => {
    if (proofSubmissionId === null || pendingProofPhoto === null) return;
    if (proofStatus === 'uploading' || proofStatus === 'confirming') return;
    setProofError(null);
    const submissionId = proofSubmissionId;
    const photo = pendingProofPhoto;
    const grant = proofGrant;
    void (async () => {
      try {
        await runProofUpload(submissionId, photo, grant);
      } catch (err) {
        setProofError(toUserMessage(err, 'تعذر إرفاق الإثبات. حاول مجددًا.'));
        setProofStatus('error');
      }
    })();
  }, [proofSubmissionId, pendingProofPhoto, proofGrant, proofStatus, runProofUpload]);

  const retryProof = useCallback(() => {
    setProofStatus('idle');
    setProofError(null);
    confirmProofUpload();
  }, [confirmProofUpload]);

  const dismissProof = useCallback(() => {
    setProofStatus('idle');
    setProofError(null);
  }, []);

  return {
    plans,
    current,
    methods,
    submissions,
    status,
    error,
    cancelling,
    cancelError,
    submitStatus,
    submitError,
    reload,
    cancelRenewal,
    submitPayment,
    resetSubmit,
    proofSubmissionId,
    pendingProofPhoto,
    proofStatus,
    proofError,
    openProofFor,
    pickProofLibrary,
    takeProofCamera,
    confirmProofUpload,
    retryProof,
    dismissProof,
    closeProof,
  };
}

export { canSelectPlan, subscribeNextAction };
