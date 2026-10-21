import { SearchField } from '@/ui/search-field';

interface HomeSearchProps {
  placeholder: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * Home search entry — a real navigation trigger into the existing discovery
 * flow (not a fake input). Delegates to the shared `SearchField` so the
 * search surface is identical across the Customer experience.
 */
export function HomeSearch({ placeholder, onPress, accessibilityLabel }: HomeSearchProps) {
  return (
    <SearchField placeholder={placeholder} onPress={onPress} accessibilityLabel={accessibilityLabel} />
  );
}
