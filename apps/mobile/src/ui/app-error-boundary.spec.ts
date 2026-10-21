import { describe, expect, it, vi } from 'vitest';

import { AppErrorBoundary } from './app-error-boundary';

import type { ErrorInfo, ReactNode } from 'react';

function collectText(node: ReactNode): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap((child) => collectText(child));
  if (typeof node === 'object' && 'props' in node) {
    return collectText((node as { props: { children?: ReactNode } }).props.children);
  }
  return [];
}

describe('AppErrorBoundary (M2)', () => {
  it('derives the fallback state from a render error', () => {
    expect(AppErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });

  it('renders the Arabic retry surface instead of children', () => {
    const boundary = new AppErrorBoundary({ children: 'content' });
    boundary.state = { hasError: true };

    const tree = boundary.render();
    const text = collectText(tree).join(' ');
    expect(text).toContain('حصلت مشكلة غير متوقعة');
    expect(text).toContain('حاول تاني');
  });

  it('keeps rendering children when no error occurred', () => {
    const boundary = new AppErrorBoundary({ children: 'content' });
    expect(boundary.render()).toBe('content');
  });

  it('never logs the error message or payload (possible secrets)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const boundary = new AppErrorBoundary({ children: null });
    boundary.componentDidCatch(new Error('token=SUPER_SECRET'), {
      componentStack: 'at Screen',
    } as ErrorInfo);

    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain('SUPER_SECRET');
    expect(logged).toContain('render error');
    warn.mockRestore();
  });
});
