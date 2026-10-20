/**
 * Minimal react-native stub for Node component tests.
 *
 * React Native ships Flow syntax (`import typeof`), which Rollup's SSR
 * parser cannot read. Component tests only need host-element shapes and
 * StyleSheet identity, so the vitest config aliases `react-native` here.
 * Production and Metro bundling are unaffected.
 */

import { createElement, type ReactNode } from 'react';

type Props = Record<string, unknown> & { children?: ReactNode | ((state: { pressed: boolean }) => ReactNode) };

export function View(props: Props) {
  return createElement('View', props, props.children as ReactNode);
}

export function Text(props: Props) {
  return createElement('Text', props, props.children as ReactNode);
}

export function Pressable(props: Props) {
  const children =
    typeof props.children === 'function' ? props.children({ pressed: false }) : props.children;
  return createElement('Pressable', props, children as ReactNode);
}

export function Image(props: Props) {
  return createElement('Image', props);
}

export const StyleSheet = {
  create: <T,>(styles: T): T => styles,
  flatten: <T,>(style: T): T => style,
};

export const Platform = {
  OS: 'web' as const,
  select: <T,>(options: Record<string, T>): T | undefined => options.web ?? options.default,
};

export const I18nManager = {
  isRTL: true,
  allowRTL: () => undefined,
  forceRTL: () => undefined,
};

export const Dimensions = {
  get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
};

export default {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  I18nManager,
  Dimensions,
};
