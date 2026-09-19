import { SceneAction, SceneHero } from '@/ui/cinematic';

export function DiscoveryHero({ applianceLabel, onExplore }: { applianceLabel: string; onExplore: () => void }) {
  return (
    <SceneHero
      asset="technician_discovery_hero"
      eyebrow="دليل الفنيين"
      title="اختر من يعتني بجهازك"
      body={`ابحث عن خدمة ${applianceLabel}، وقارن التخصصات ومناطق الخدمة قبل اختيار الفني.`}
      action={<SceneAction label="ابدأ البحث" accessibilityLabel="ابدأ البحث عن فني" onPress={onExplore} />}
    />
  );
}
