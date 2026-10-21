import { describe, expect, it } from 'vitest';

import { TechnicianServiceError } from './api-technician-services-data-source';
import { MockTechnicianServicesDataSource } from './mock-technician-services-data-source';
import { availableCatalogServices, applianceLabelMap } from './technician-services-types';
import { useTechnicianServicesViewModel } from './use-technician-services-view-model';

describe('technician services — pure helpers', () => {
  it('lists only catalog services not yet attached', () => {
    const catalog = [
      { id: 'a', nameAr: 'أ', slug: 'a', applianceCategoryId: 'c', applianceNameAr: 'تكييفات', descriptionAr: null },
      { id: 'b', nameAr: 'ب', slug: 'b', applianceCategoryId: 'c', applianceNameAr: 'تكييفات', descriptionAr: null },
    ];
    const attached = [
      { serviceId: 'a', nameAr: 'أ', slug: 'a', applianceCategoryId: 'c', applianceNameAr: 'تكييفات', priceFrom: null, isActive: true },
    ];
    expect(availableCatalogServices(catalog, attached).map((s) => s.id)).toEqual(['b']);
  });

  it('maps category ids to Arabic labels', () => {
    expect(applianceLabelMap([{ id: 'c', nameAr: 'ثاجات' }]).c).toBe('ثاجات');
  });
});

describe('technician services — data source', () => {
  it('attaches a catalog service and reflects it on later reads', async () => {
    const source = new MockTechnicianServicesDataSource({ attached: [] });
    await source.addService({ role: 'technician', serviceId: 'svc-filter' });
    const attached = await source.getAttached({ role: 'technician' });
    expect(attached.map((s) => s.serviceId)).toContain('svc-filter');
  });

  it('rejects a duplicate with CONFLICT without mutating', async () => {
    const source = new MockTechnicianServicesDataSource({ attached: ['svc-ac'] });
    await expect(source.addService({ role: 'technician', serviceId: 'svc-ac' })).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    const attached = await source.getAttached({ role: 'technician' });
    expect(attached.filter((s) => s.serviceId === 'svc-ac')).toHaveLength(1);
  });

  it('removes an attached service and misses cleanly', async () => {
    const source = new MockTechnicianServicesDataSource({ attached: ['svc-ac', 'svc-wm'] });
    await source.removeService({ role: 'technician', serviceId: 'svc-ac' });
    expect((await source.getAttached({ role: 'technician' })).map((s) => s.serviceId)).toEqual(['svc-wm']);
    await expect(source.removeService({ role: 'technician', serviceId: 'svc-ac' })).rejects.toBeInstanceOf(
      TechnicianServiceError,
    );
  });

  it('fails deterministically without faking success', async () => {
    const source = new MockTechnicianServicesDataSource({ attached: [], failing: true });
    await expect(source.addService({ role: 'technician', serviceId: 'svc-ac' })).rejects.toMatchObject({
      code: 'FAILED',
    });
  });

  it('exposes the view-model hook', () => {
    expect(typeof useTechnicianServicesViewModel).toBe('function');
  });
});
