/**
 * View-model hook for the Service Request flow.
 *
 * Owns: handoff INIT, the draft machine, form-data loading, and the
 * submission lifecycle (idle → submitting → success | error).
 * Accepts an optional data-source override so the error path is
 * verifiable without touching shipped UI.
 */

import { useCallback, useEffect, useReducer, useState } from 'react';

import { toUserError, toUserMessage } from '../../../lib/api-error';

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
import { uploadRequestPhotos } from './upload-request-photos';

import type { RequestAttachment, ServiceRequestHandoff } from './service-request-types';

export type ServiceRequestSubmitStatus =
  | 'idle'
  | 'submitting'
  | 'uploading'
  | 'success'
  | 'partial'
  | 'error';

export interface ServiceRequestUploadProgress {
  readonly done: number;
  readonly total: number;
}

export interface ServiceRequestViewModel {
  machine: typeof INITIAL_SERVICE_REQUEST_STATE;
  dispatch: (event: ServiceRequestEvent) => void;
  formStatus: 'loading' | 'loaded' | 'error';
  formError: Error | null;
  formData: ServiceRequestFormData | null;
  reloadForm: () => void;
  locationStatus: 'idle' | 'saving' | 'error';
  locationError: string | null;
  addLocation: (input: { labelAr: string; addressAr: string }) => void;
  submitStatus: ServiceRequestSubmitStatus;
  submission: ServiceRequestSubmission | null;
  submitError: string | null;
  /** Photo uploads (Track B2): progress + still-failed photos for retry. */
  uploadProgress: ServiceRequestUploadProgress | null;
  failedPhotos: ReadonlyArray<RequestAttachment>;
  submit: () => void;
  retrySubmit: () => void;
  retryUploads: () => void;
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
  const [locationStatus, setLocationStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<ServiceRequestSubmitStatus>('idle');
  const [submission, setSubmission] = useState<ServiceRequestSubmission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<ServiceRequestUploadProgress | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<ReadonlyArray<RequestAttachment>>([]);

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
        setFormError(toUserError(err, 'تعذّر إرسال الطلب. حاول مرة أخرى.'));
        setFormStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  /**
   * Uploads photos sequentially AFTER the request was created (Track B2).
   * A failed photo never loses the created request: it is collected for a
   * later `retryUploads`, and the flow reports honest counters.
   */
  const uploadPhotos = useCallback(
    async (
      requestId: string,
      photos: ReadonlyArray<RequestAttachment>,
    ): Promise<ReadonlyArray<RequestAttachment>> => {
      const outcome = await uploadRequestPhotos({
        requestId,
        photos,
        uploader: source,
        onProgress: setUploadProgress,
      });
      return outcome.failed;
    },
    [source],
  );

  const submit = useCallback(() => {
    setSubmitStatus('submitting');
    setSubmitError(null);
    setFailedPhotos([]);
    setUploadProgress(null);
    void (async () => {
      try {
        const result = await source.submitRequest(machine.draft);
        setSubmission(result);
        const photos = machine.draft.photos;
        if (photos.length === 0) {
          setSubmitStatus('success');
          return;
        }
        setSubmitStatus('uploading');
        const failed = await uploadPhotos(result.requestId, photos);
        setFailedPhotos(failed);
        setSubmitStatus(failed.length === 0 ? 'success' : 'partial');
      } catch (err) {
        setSubmitError(toUserMessage(err, 'فشل إرسال الطلب. حاول مرة أخرى'));
        setSubmitStatus('error');
      }
    })();
    // The submit button lives on the settled review step, so the
    // captured draft is the submitted one.

  }, [source, machine.draft, uploadPhotos]);

  const retryUploads = useCallback(() => {
    if (submission === null || failedPhotos.length === 0) return;
    setSubmitStatus('uploading');
    void (async () => {
      const stillFailed = await uploadPhotos(submission.requestId, failedPhotos);
      setFailedPhotos(stillFailed);
      setSubmitStatus(stillFailed.length === 0 ? 'success' : 'partial');
    })();
  }, [submission, failedPhotos, uploadPhotos]);

  const reloadForm = useCallback(() => setAttempt((n) => n + 1), []);

  /**
   * Creates an owned location, selects it, and merges it into the loaded
   * form data. The server returns the created location, so we insert it
   * locally instead of refetching: a refresh failure must never replace the
   * in-progress form with an error screen (Phase C / C3).
   */
  const addLocation = useCallback(
    (input: { labelAr: string; addressAr: string }) => {
      setLocationStatus('saving');
      setLocationError(null);
      void (async () => {
        try {
          const created = await source.createLocation(input);
          setFormData((current) =>
            current === null ? current : { ...current, locations: [...current.locations, created] },
          );
          dispatch({ type: 'SET_LOCATION', locationId: created.id });
          setLocationStatus('idle');
        } catch (err) {
          setLocationError(toUserMessage(err, 'تعذر حفظ الموقع. حاول مجددًا'));
          setLocationStatus('error');
        }
      })();
    },
    [source],
  );
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
    locationStatus,
    locationError,
    addLocation,
    submitStatus,
    submission,
    submitError,
    uploadProgress,
    failedPhotos,
    submit,
    retrySubmit,
    retryUploads,
  };
}
