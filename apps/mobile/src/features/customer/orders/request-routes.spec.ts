import { describe, expect, it } from 'vitest';

import { requestTrackingRoute } from './request-routes';

describe('request tracking route', () => {
  it('builds the typed tracking route for a request id', () => {
    expect(requestTrackingRoute('req-123')).toEqual({
      pathname: '/(customer)/requests/[id]',
      params: { id: 'req-123' },
    });
  });
});
