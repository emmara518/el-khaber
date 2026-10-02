import type { CustomerTabId } from './customer-tab-routing';
import type { BrandAssetName } from '@/ui/brand-assets';
import type { ViewStyle } from 'react-native';

import { RoleTabBar, type ShellTab } from '@/features/shell/role-tab-bar';
import { useI18n, type TranslationKey } from '@/i18n/use-i18n';

export type { CustomerTabId };

interface CustomerTabBarProps {
  /** Active tab, or `null` when the current route is not a tab route. */
  active: CustomerTabId | null;
  onChange: (id: CustomerTabId) => void;
  style?: ViewStyle;
}

interface TabDescriptor {
  id: CustomerTabId;
  labelKey: TranslationKey;
  /** Approved local asset for the destination (no tinting, contain). */
  asset: BrandAssetName;
}

/**
 * Only destinations that actually exist in the customer route group, each
 * mapped to its semantically matching approved brand asset:
 * home → `home`, requests → `my-requests`, maintenance → `maintenance`,
 * messages → `messages`, profile → `profile`.
 */
const TABS: ReadonlyArray<TabDescriptor> = [
  { id: 'home', labelKey: 'tab.home', asset: 'home' },
  { id: 'requests', labelKey: 'tab.requests', asset: 'my-requests' },
  { id: 'maintenance', labelKey: 'tab.maintenance', asset: 'maintenance' },
  { id: 'messages', labelKey: 'tab.messages', asset: 'messages' },
  { id: 'profile', labelKey: 'tab.profile', asset: 'profile' },
];

/**
 * Customer bottom navigation — the shared `RoleTabBar` navy surface with the
 * Customer destination configuration (i18n labels + approved brand assets).
 */
export function CustomerTabBar({ active, onChange, style }: CustomerTabBarProps) {
  const { t } = useI18n();
  const tabs: ReadonlyArray<ShellTab> = TABS.map((tab) => ({
    id: tab.id,
    labelAr: t(tab.labelKey),
    icon: 'circle',
    asset: tab.asset,
  }));
  return (
    <RoleTabBar
      tabs={tabs}
      active={active}
      onChange={(id) => onChange(id as CustomerTabId)}
      style={style}
    />
  );
}
