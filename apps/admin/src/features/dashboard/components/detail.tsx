import { color } from '@khabir/ui-tokens';

import type { ReactNode } from 'react';

import { mono } from '@/components/ui';


export function DetailLabel({ children }: { children: ReactNode }) {
  return <div style={{ color: color.text.secondary }}>{children}</div>;
}

export function DetailValue({ children, mono: isMono }: { children: ReactNode; mono?: boolean }) {
  return (
    <div style={isMono === true ? { ...mono, wordBreak: 'break-all' } : undefined}>{children}</div>
  );
}
