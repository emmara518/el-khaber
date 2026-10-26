/**
 * Shared inline styles for the admin console tables and forms.
 */

import { color, radius } from '@khabir/ui-tokens';

import type { CSSProperties } from 'react';

export const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

export const formLabel: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  color: color.text.primary,
  margin: `10px 0 4px`,
  fontWeight: 500,
};

export const formInput: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.sm,
  fontSize: 13.5,
  fontFamily: 'inherit',
  backgroundColor: color.surface.base,
  transition: 'border-color 0.15s ease',
};
