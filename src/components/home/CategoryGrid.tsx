import React from 'react';
import { sheet, cx } from '@/lib/rn';
import { Img, Pressable, PressableScale, Text, View } from '@/components/ui';
import { HOME_CATEGORY_CARDS } from '@/config/constants';
import { HomeCategoriesData, HomeCategoryTileData } from '@/types';

// Port of frontend/src/components/home/CategoryGrid.tsx: admin tiles when the
// console has any, otherwise the bundled eight, with the bundled art as the
// fallback for a tile the admin left without a picture.
type Tile = { key: string; title: string; bgColor: string | undefined; src: string | null };

const FALLBACK_TILES: Tile[] = HOME_CATEGORY_CARDS.map((c) => ({ key: c.title, title: c.title, bgColor: c.color, src: c.image }));
const BUNDLED_ART = new Map<string, string>(HOME_CATEGORY_CARDS.map((c) => [c.title.toLowerCase(), c.image]));

const toTile = (tile: HomeCategoryTileData): Tile => ({
  key: tile.id,
  title: tile.title,
  bgColor: tile.bgColor ?? undefined,
  src: tile.imageUrl || BUNDLED_ART.get(tile.title.trim().toLowerCase()) || null,
});

function CategoryGridImpl({
  data,
  onPressSeeAll,
  onPressCategory,
}: {
  data: HomeCategoriesData | null;
  onPressSeeAll: () => void;
  onPressCategory: (title: string) => void;
}) {
  const tiles = data?.tiles?.length ? data.tiles.map(toTile) : FALLBACK_TILES;
  return (
    <View className="fade-down" style={styles.categoriesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Beauty as always for you</Text>
        <Pressable onPress={onPressSeeAll}>
          <Text style={styles.seeAllLink}>See all</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {tiles.map((tile, index) => (
          <div key={tile.key} className="fade-up" style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, minWidth: 0 }}>
            <PressableScale scaleTo={0.94} onPress={() => onPressCategory(tile.title)} style={cx(styles.categoryItem, { backgroundColor: tile.bgColor })}>
              <View style={styles.categoryImageWrapper}>
                {tile.src ? (
                  <Img src={tile.src} style={styles.categoryImage} />
                ) : (
                  <View style={cx(styles.categoryImage, styles.categoryPlaceholder)}>
                    <Text style={styles.categoryInitial}>{tile.title.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.categoryLabel} numberOfLines={2}>
                {tile.title}
              </Text>
            </PressableScale>
          </div>
        ))}
      </View>
    </View>
  );
}

export const CategoryGrid = React.memo(CategoryGridImpl);

const styles = sheet({
  categoryPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6eeeb' },
  categoryInitial: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 36, color: '#884952' },
  categoriesSection: { paddingHorizontal: 24, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 24, color: '#1e1b18' },
  seeAllLink: {
    fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#884952', textTransform: 'uppercase', letterSpacing: 1.5,
    borderBottomWidth: 1, borderBottomColor: 'rgba(136, 73, 82, 0.3)', paddingBottom: 2,
  },
  // Two columns with a 16px gap — the app computes the same from screen width.
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  categoryItem: {
    width: '100%', borderRadius: 24, padding: 16, alignItems: 'center', gap: 12,
    shadowColor: '#884952', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16,
  },
  categoryImageWrapper: { width: '100%', aspectRatio: '1', borderRadius: 20, overflow: 'hidden', backgroundColor: 'transparent', position: 'relative' },
  categoryImage: { position: 'absolute', width: '100%', height: '120%', top: 0, left: 0 },
  categoryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 18, minHeight: 44, color: '#1e1b18', width: '100%', textAlign: 'left' },
});
