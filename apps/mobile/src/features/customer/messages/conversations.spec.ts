/**
 * Batch A tests: maintenance entry + conversations logic contracts.
 */

import { describe, expect, it } from 'vitest';

import {
  issuesForAppliance,
} from '../maintenance/maintenance-entry-types';
import { MockMaintenanceEntryDataSource } from '../maintenance/mock-maintenance-entry-data-source';

import { totalUnread } from './conversations-types';
import { MockConversationsDataSource } from './mock-conversations-data-source';

describe('maintenance entry', () => {
  it('covers exactly the three locked appliance categories', async () => {
    const data = await new MockMaintenanceEntryDataSource().getEntry({ role: 'customer' });
    expect(data.appliances.map((a) => a.slug).sort()).toEqual(
      ['air_conditioner', 'refrigerator', 'washing_machine'].sort(),
    );
    expect(data.stepsAr.length).toBeGreaterThan(0);
  });

  it('returns teasers for the selected appliance only', async () => {
    const data = await new MockMaintenanceEntryDataSource().getEntry({ role: 'customer' });
    const wm = issuesForAppliance(data.popularIssues, 'washing_machine');
    expect(wm.length).toBeGreaterThan(0);
    expect(wm.every((i) => i.applianceSlug === 'washing_machine')).toBe(true);
    const ac = issuesForAppliance(data.popularIssues, 'air_conditioner');
    expect(ac.every((i) => i.applianceSlug === 'air_conditioner')).toBe(true);
  });
});

describe('conversations', () => {
  it('sums unread counts', async () => {
    const data = await new MockConversationsDataSource().getConversations({ role: 'customer' });
    expect(totalUnread(data.conversations)).toBe(2);
    expect(totalUnread([])).toBe(0);
  });

  it('returns threads with technician context and order refs', async () => {
    const data = await new MockConversationsDataSource().getConversations({ role: 'customer' });
    expect(data.conversations.length).toBeGreaterThan(0);
    for (const c of data.conversations) {
      expect(c.technicianNameAr.length).toBeGreaterThan(0);
      expect(c.lastMessageAr.length).toBeGreaterThan(0);
      expect(c.orderRefAr.length).toBeGreaterThan(0);
    }
  });
});
