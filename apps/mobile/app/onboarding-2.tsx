import { useRouter } from 'expo-router';

import { OnboardingSlide } from '../src/features/auth/components/onboarding-slide';
import { sceneAssets } from '../src/ui/scene-assets';

export default function OnboardingTwoRoute() {
  const router = useRouter();

  return (
    <OnboardingSlide
      imageSource={sceneAssets.customer_onboarding_technician}
      imageLabel="مشهد سينمائي لفني معتمد يعاين جهازًا منزليًا بثقة"
      title="اعثر على الفني المناسب بثقة"
      body="اكتشف فنيين متخصصين حسب جهازك ومشكلتك، مع تقييمات حقيقية ومتابعة للطلب."
      position={1}
      actionLabel="متابعة"
      actionAccessibilityLabel="متابعة إلى اختيار نوع الحساب"
      onNext={() => router.push('/account-type')}
      onSkip={() => router.replace('/account-type')}
      onBack={() => router.back()}
    />
  );
}
