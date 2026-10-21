import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSafeBack } from '../../../src/features/customer/components/use-safe-back';
import { StoreProductScreen } from '../../../src/features/store/store-product-screen';

/** Route entry: Customer Store product detail. */
export default function CustomerStoreProductRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  const back = useSafeBack('/(customer)/store');
  return (
    <StoreProductScreen
      role="customer"
      productId={productId}
      onPressNotifications={() => router.push('/(customer)/notifications')}
      onPressAvatar={() => router.push('/(customer)/profile')}
      onBack={back}
    />
  );
}
