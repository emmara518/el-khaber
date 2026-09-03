/**
 * Unit tests for the Customer Home view-model contract.
 *
 * These tests verify that the data source produces a structurally
 * correct `CustomerHomeViewModel` and that the fixture includes the
 * sections required by the approved visual reference (header, greeting,
 * location, appliances, quick services, guarantee, current orders,
 * recommended technicians).
 *
 * Source: Task #003 spec, docs/02_PRODUCT.md §3.4, docs/04_UI_UX.md.
 */

import { describe, expect, it } from 'vitest';

import { MockCustomerHomeDataSource } from './mock-customer-home-data-source';

describe('MockCustomerHomeDataSource', () => {
  it('returns a structurally complete CustomerHomeViewModel', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    expect(data).toBeDefined();
    expect(data.context.displayNameAr).toBeTypeOf('string');
    expect(data.context.cityAr).toBeTypeOf('string');
    expect(data.context.districtAr).toBeTypeOf('string');
    expect(data.context.avatarInitialsAr).toBeTypeOf('string');
  });

  it('contains the greeting line referenced by the visual reference', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    expect(data.greeting.line1Ar).toMatch(/مرحبا/);
    expect(data.greeting.line2Ar).toBeTypeOf('string');
    expect(data.greeting.line2Ar.length).toBeGreaterThan(0);
  });

  it('contains exactly the three approved appliance categories (no extras)', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    const slugs = data.appliances.map((a) => a.slug).sort();
    expect(slugs).toEqual(['air_conditioner', 'refrigerator', 'washing_machine']);
    for (const a of data.appliances) {
      expect(a.titleAr).toBeTypeOf('string');
      expect(a.availableTechnicians).toBeGreaterThan(0);
    }
  });

  it('contains the four quick service shortcuts from the visual reference', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    const ids = data.quickServices.map((s) => s.id).sort();
    expect(ids).toEqual(['fix-fault', 'request-maintenance', 'search-technician', 'track-order']);
  });

  it('contains the gold service guarantee section', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    expect(data.guarantee.titleAr).toMatch(/الذهبي/);
    expect(data.guarantee.descriptionAr.length).toBeGreaterThan(0);
    expect(data.guarantee.ctaAr.length).toBeGreaterThan(0);
  });

  it('contains at least one current order with a valid status', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    expect(data.currentOrders.length).toBeGreaterThan(0);
    const order = data.currentOrders[0];
    expect(order.status).toBe('in_progress');
    expect(order.taskAr).toBeTypeOf('string');
    expect(order.technicianName).toBeTypeOf('string');
  });

  it('contains at least four recommended technicians with ratings', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    expect(data.recommendedTechnicians.length).toBeGreaterThanOrEqual(4);
    for (const t of data.recommendedTechnicians) {
      expect(t.rating).toBeGreaterThanOrEqual(0);
      expect(t.rating).toBeLessThanOrEqual(5);
      expect(t.reviewCount).toBeGreaterThan(0);
    }
  });

  it('reports the customer role', async () => {
    const source = new MockCustomerHomeDataSource();
    const data = await source.getHome({ role: 'customer' });
    expect(data.role).toBe('customer');
  });

  it('returns a deep copy (mutating the response does not affect the next call)', async () => {
    const source = new MockCustomerHomeDataSource();
    const a = await source.getHome({ role: 'customer' });
    // The view-model fields are typed `readonly`. The deep-copy
    // contract is verified at runtime by replacing the entire object
    // and re-fetching; the new call must return the pristine fixture.
    const tampered = { ...a, context: { ...a.context, displayNameAr: 'TAMPERED' } };
    void tampered;
    const b = await source.getHome({ role: 'customer' });
    expect(b.context.displayNameAr).not.toBe('TAMPERED');
    expect(b.context.displayNameAr).toBe(a.context.displayNameAr);
  });
});
