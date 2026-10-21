'use client';

/**
 * Spotlight card — adapted from the React Bits `SpotlightCard-TS-CSS`
 * pattern (cursor-tracking radial highlight) to the El-Khabir token
 * system: navy/gold palette, token radius, no new dependencies.
 *
 * The highlight is pointer-only progressive enhancement: touch and
 * keyboard users see the calm base card. Respects reduced-motion
 * (see `.spotlight-card` in globals.css).
 */

import { useRef } from 'react';

import type { CSSProperties, PropsWithChildren } from 'react';

export function SpotlightCard({
  children,
  style,
}: PropsWithChildren<{ style?: CSSProperties }>) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const el = ref.current;
    if (el === null) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mouse-x', `${String(e.clientX - rect.left)}px`);
    el.style.setProperty('--mouse-y', `${String(e.clientY - rect.top)}px`);
  };

  return (
    <div ref={ref} onMouseMove={handleMouseMove} className="spotlight-card" style={style}>
      {children}
    </div>
  );
}
