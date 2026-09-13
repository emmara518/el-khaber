/**
 * View-model hook for the Service Request flow.
 *
 * Owns: handoff INIT, the draft machine, form-data loading, and the
 * submission lifecycle (idle → submitting → success | error).
 * Accepts an optional data-source override so the error path is
 * verifiable without touching shipped UI.
 */

import { useCallback, useEffect, useReducer, useState } from 'react';

import {
  ApiServiceRequestDataSource,
  type ServiceRequestDataSource,
  type ServiceRequestFormData,
  type ServiceRequestSubmission,
} from './api-service-request-data-source';
import {
  INITIAL_SERVICE_REQUEST_STATE,
  serviceRequestReducer,
  type ServiceRequestEvent,
} from './service-request-machine';

import type { ServiceRequestHandoff } from './service-request-types';

export type ServiceRequestSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface ServiceRequestViewModel {
  machine: typeof INITIAL_SERVICE_REQUEST_STATE;
  dispatch: (event: ServiceRequestEvent) => void;
  formStatus: 'loading' | 'loaded' | 'error';
  formError: Error | null;
  formData: ServiceRequestFormData | null;
  reloadForm: () => void;
  submitStatus: ServiceRequestSubmitStatus;
  submission: ServiceRequestSubmission | null;
  submitError: string | null;
  submit: () => void;
  retrySubmit: () => void;
}

export function useServiceRequestViewModel(
  handoff: ServiceRequestHandoff,
  source: ServiceRequestDataSource = new ApiServiceRequestDataSource(),
): ServiceRequestViewModel {
  const [machine, dispatch] = useReducer(serviceRequestReducer, INITIAL_SERVICE_REQUEST_STATE);
  const [attempt, setAttempt] = useState(0);
  const [formStatus, setFormStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [formError, setFormError] = useState<Error | null>(null);
  const [formData, setFormData] = useState<ServiceRequestFormData | null>(null);
  const [submitStatus, setSubmitStatus] = useState<ServiceRequestSubmitStatus>('idle');
  const [submission, setSubmission] = useState<ServiceRequestSubmission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handoffKey = `${handoff.technicianId}|${handoff.appliance ?? ''}|${handoff.symptomId ?? ''}`;

  useEffect(() => {
    dispatch({
      type: 'INIT',
      handoff: {
        technicianId: handoff.technicianId,
        ...(handoff.appliance !== undefined ? { appliance: handoff.appliance } : {}),
        ...(handoff.symptomId !== undefined ? { symptomId: handoff.symptomId } : {}),
      },
    });
    // Re-init only when the handoff identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffKey]);

  useEffect(() => {
    let cancelled = false;
    setFormStatus('loading');
    setFormError(null);
    source
      .getFormData({ role: 'customer' })
      .then((data) => {
        if (cancelled) return;
        setFormData(data);
        setFormStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFormError(err instanceof Error ? err : new Error(String(err)));
        setFormStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const submit = useCallback(() => {
    setSubmitStatus('submitting');
    setSubmitError(null);
    void (async () => {
      try {
        const result = await source.submitRequest(machine.draft);
        setSubmission(result);
        setSubmitStatus('success');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'فشل إرسال الطلب. حاول مجددًا');
        setSubmitStatus('error');
      }
    })();
    // The submit button lives on the settled review step, so the
    // captured draft is the submitted one.
     
  }, [source, machine.draft]);

  const reloadForm = useCallback(() => setAttempt((n) => n + 1), []);
  const retrySubmit = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
  }, []);

  return {
    machine,
    dispatch,
    formStatus,
    formError,
    formData,
    reloadForm,
    submitStatus,
    submission,
    submitError,
    submit,
    retrySubmit,
  };
}
