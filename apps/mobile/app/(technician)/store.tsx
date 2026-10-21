import { useRouter } from 'expo-router';

import { StoreListScreen } from '../../src/features/store/store-list-screen';

/** Route entry: Technician Store (same public product catalog as Customer). */
export default function TechnicianStoreRoute() {
  const router = useRouter();
  return (
    <StoreListScreen
      role="technician"
      onPressNotifications={() => router.push('/(technician)/notifications')}
      onPressAvatar={() => router.push('/(technician)/profile')}
      onOpenProduct={(id) => router.push({ pathname: '/(technician)/store/[id]', params: { id } })}
    />
  );
}
