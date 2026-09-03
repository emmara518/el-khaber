import { spacing } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { FlatList, View } from 'react-native';

interface HorizontalCarouselProps<T> {
  data: ReadonlyArray<T>;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  /** Extra horizontal content padding. */
  contentPadding?: number;
  /** Horizontal spacing between items. */
  itemSpacing?: number;
  /** Use the inherited writing direction. Defaults to RTL for Arabic. */
  rtl?: boolean;
}

/**
 * A small wrapper around `FlatList` that is RTL-aware.
 *
 * The reference design uses two horizontal carousels (appliances
 * and technicians) with a peek of the next card. The `FlatList`
 * built-in RTL handling is used directly — we do NOT set `inverted`
 * (which flips scroll direction and changes gesture semantics).
 */
export function HorizontalCarousel<T>({
  data,
  renderItem,
  keyExtractor,
  contentPadding = spacing[4],
  itemSpacing = spacing[3],
}: HorizontalCarouselProps<T>) {
  // `FlatList` accepts `ArrayLike<T>`. A readonly array satisfies
  // that, so the cast is non-mutating.
  const flatListData = data as unknown as ReadonlyArray<T> & { length: number };
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={flatListData}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => (
        <View style={{ marginEnd: index === data.length - 1 ? 0 : itemSpacing }}>
          {renderItem(item, index)}
        </View>
      )}
      contentContainerStyle={{
        paddingHorizontal: contentPadding,
      }}
    />
  );
}
