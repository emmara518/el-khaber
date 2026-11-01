import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('../../../lib/api-client', () => ({
  getApi: () => ({ request: requestMock }),
}));

import { ApiOrderDataSource } from './api-order-data-source';

beforeEach(() => {
  requestMock.mockReset();
  requestMock.mockResolvedValue({ data: {} });
});

describe('order cancellation API contract', () => {
  it('posts to the documented customer cancel endpoint', async () => {
    await new ApiOrderDataSource().cancelOrder({
      role: 'customer',
      requestId: '11111111-1111-1111-1111-111111111111',
    });

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      'POST',
      '/service-requests/11111111-1111-1111-1111-111111111111/cancel',
    );
  });
});
