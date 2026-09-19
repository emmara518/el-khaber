import { useRouter } from 'expo-router';

import { OnboardingSlide } from '../src/features/auth/components/onboarding-slide';
import { sceneAssets } from '../src/ui/scene-assets';

export default function OnboardingOneRoute() {
  const router = useRouter();

  return (
    <OnboardingSlide
      imageSource={sceneAssets.customer_onboarding_home}
      imageLabel="مشهد سينمائي لمنزل يعتني به الخبير لصيانة الأجهزة المنزلية"
      title="الخبير لصيانة الأجهزة المنزلية"
      body="خدمة موثوقة لغسالاتك وثلاجاتك وتكييفاتك، بفنيين معتمدين وضمان واضح."
      position={0}
      actionLabel="التالي"
      actionAccessibilityLabel="التالي إلى الجولة التعريفية الثانية"
      onNext={() => router.push('/onboarding-2')}
      onSkip={() => router.replace('/account-type')}
    />
  );
}
