import { describe, expect, it } from 'vitest';

import { productImageDisplay } from './product-image-display';

describe('productImageDisplay (C5 truth rules)', () => {
  it('uses the truthful placeholder when no image URL is stored', () => {
    expect(productImageDisplay(null, 'loading')).toBe('placeholder');
    expect(productImageDisplay('', 'loaded')).toBe('placeholder');
    expect(productImageDisplay('   ', 'error')).toBe('placeholder');
  });

  it('shows the real image only once a stored URL has loaded', () => {
    expect(productImageDisplay('https://cdn.example/p.png', 'loaded')).toBe('image');
  });

  it('shows a quiet skeleton (never a false claim) while a stored URL loads', () => {
    expect(productImageDisplay('https://cdn.example/p.png', 'loading')).toBe('skeleton');
  });

  it('falls back to the placeholder when a stored URL fails to load', () => {
    expect(productImageDisplay('https://cdn.example/broken.png', 'error')).toBe('placeholder');
  });
});
