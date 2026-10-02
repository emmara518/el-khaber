import { useRouter } from 'expo-router';

import { StoreListScreen } from '../../src/features/store/store-list-screen';

/** Route entry: Customer Store (public product catalog). */
export default function CustomerStoreRoute() {
  const router = useRouter();
  return (
    <StoreListScreen
      role="customer"
      onPressNotifications={() => router.push('/(customer)/notifications')}
      onPressAvatar={() => router.push('/(customer)/profile')}
      onOpenProduct={(id) => router.push({ pathname: '/(customer)/store/[id]', params: { id } })}
    />
  );
}
