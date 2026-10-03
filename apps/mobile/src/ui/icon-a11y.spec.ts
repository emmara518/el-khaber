import { describe, expect, it } from 'vitest';

import { iconIsAccessible } from './icon-a11y';

describe('iconIsAccessible', () => {
  it('treats an unlabelled icon as decorative by default', () => {
    expect(iconIsAccessible(undefined, undefined)).toBe(false);
  });

  it('promotes an icon to an accessibility element when it has a label', () => {
    expect(iconIsAccessible('إغلاق', undefined)).toBe(true);
  });

  it('lets a caller force decorative even when a label is present', () => {
    expect(iconIsAccessible('إغلاق', false)).toBe(false);
  });

  it('lets a caller force accessible without a label', () => {
    expect(iconIsAccessible(undefined, true)).toBe(true);
  });
});
