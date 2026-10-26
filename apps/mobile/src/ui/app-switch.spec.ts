import { color } from '@khabir/ui-tokens';
import { describe, expect, it } from 'vitest';

import { switchColors } from './app-switch';

describe('AppSwitch visual mapping', () => {
  it('uses the neutral track and white thumb when off', () => {
    expect(switchColors(false)).toEqual({
      track: color.border.default,
      thumb: color.surface.base,
    });
  });

  it('uses the navy track and gold thumb when on', () => {
    expect(switchColors(true)).toEqual({
      track: color.brand.navy,
      thumb: color.brand.gold,
    });
  });
});
