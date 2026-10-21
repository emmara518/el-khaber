import { useRouter } from 'expo-router';

import { OnboardingSlide } from '../src/features/auth/components/onboarding-slide';
import { onboardingAssets } from '../src/ui/onboarding-assets';

export default function OnboardingOneRoute() {
  const router = useRouter();

  return (
    <OnboardingSlide
      imageSource={onboardingAssets.appliances}
      imageAspectRatio={3 / 2}
      title="كل خدمات الأجهزة المنزلية في مكان واحد"
      body="غسالات، ثلاجات، تكييفات، ميكروويف وأكثر… صيانة موثوقة وسهولة."
      position={0}
      actionLabel="التالي"
      actionAccessibilityLabel="التالي إلى الجولة التعريفية الثانية"
      onNext={() => router.push('/onboarding-2')}
      onSkip={() => router.replace('/account-type')}
    />
  );
}
