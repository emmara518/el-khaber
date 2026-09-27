import { useRouter } from 'expo-router';

import { OnboardingSlide } from '../src/features/auth/components/onboarding-slide';
import { onboardingAssets } from '../src/ui/onboarding-assets';

export default function OnboardingTwoRoute() {
  const router = useRouter();

  return (
    <OnboardingSlide
      imageSource={onboardingAssets.technician}
      imageLabel="فني معتمد يعمل بثقة محاطة بشارات التوثيق والتقييم والموقع والجدولة"
      imageAspectRatio={3 / 2}
      title="اعثر على الفني المناسب بثقة"
      body="فنيون متخصصون حسب جهازك وموقعك، مع تقييمات حقيقية ومتابعة لطلبك."
      position={1}
      actionLabel="التالي"
      actionAccessibilityLabel="التالي إلى اختيار نوع الحساب"
      onNext={() => router.replace('/account-type')}
      onSkip={() => router.replace('/account-type')}
    />
  );
}
