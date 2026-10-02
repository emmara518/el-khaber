import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSafeBack } from '../../../src/features/customer/components/use-safe-back';
import { StoreProductScreen } from '../../../src/features/store/store-product-screen';

/** Route entry: Technician Store product detail. */
export default function TechnicianStoreProductRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  const back = useSafeBack('/(technician)/store');
  return (
    <StoreProductScreen
      role="technician"
      productId={productId}
      onPressNotifications={() => router.push('/(technician)/notifications')}
      onPressAvatar={() => router.push('/(technician)/profile')}
      onBack={back}
    />
  );
}
