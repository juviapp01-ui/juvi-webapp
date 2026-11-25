import React, { useMemo } from 'react';
import { sheet, cx } from '@/lib/rn';
import { HScroll, Icon, Img, PressableScale, Text, View } from '@/components/ui';
import { useHomeLayout } from '@/hooks';
import { HOME_CATEGORY_CARDS } from '@/config/constants';
import { formatPrice } from '@/utils/format';
import { getSizedImageUri } from '@/utils/image';
import type { Artist, HomeCategoriesData, PortfolioItem } from '@/types';

// Ports of frontend/src/components/discovery/{ArtistResultCard,CategorySwitcherRow}.tsx
// and frontend/src/components/artist/PortfolioGrid.tsx.

// ─── ArtistResultCard ───────────────────────────────────────────────────────
function ArtistResultCardImpl({ artist, onPress, featured }: { artist: Artist; onPress: () => void; featured?: boolean }) {
  const cover = artist.portfolio?.[0]?.imageUrl ?? artist.photoUrl;
  const categories = (artist.category ?? []).slice(0, 2).join(' · ');
  return (
    <PressableScale scaleTo={0.97} onPress={onPress} style={cx(cardStyles.card, featured && cardStyles.cardFeatured)} ariaLabel={artist.name}>
      <View style={cx(cardStyles.imageWrap, featured && cardStyles.imageWrapFeatured)}>
        {cover ? (
          <Img src={getSizedImageUri(cover, featured ? 400 : 168)} style={cardStyles.image} />
        ) : (
          <View style={cx(cardStyles.image, cardStyles.imageEmpty)}>
            <Icon name="image-outline" size={22} color="#c2a3a8" />
          </View>
        )}
        {artist.offer && (
          <View style={cardStyles.offerBadge}>
            <Text style={cardStyles.offerText} numberOfLines={1}>
              {artist.offer.label}
            </Text>
          </View>
        )}
        {typeof artist.rating === 'number' && artist.rating > 0 && (
          <View style={cardStyles.ratingPill}>
            <Icon name="star" size={10} color="#FFFFFF" />
            <Text style={cardStyles.ratingText}>{artist.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <View style={cardStyles.body}>
        <Text style={cardStyles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        {!!categories && (
          <Text style={cardStyles.categories} numberOfLines={1}>
            {categories}
          </Text>
        )}
        <View style={cardStyles.metaRow}>
          {typeof artist.durationMins === 'number' && (
            <>
              <Icon name="time-outline" size={12} color="#857374" />
              <Text style={cardStyles.metaText}>{artist.durationMins} mins</Text>
            </>
          )}
          {typeof artist.distanceKm === 'number' && (
            <>
              {typeof artist.durationMins === 'number' && <Text style={cardStyles.metaDot}>·</Text>}
              <Text style={cardStyles.metaText}>{artist.distanceKm} km</Text>
            </>
          )}
        </View>
        {typeof artist.startingPrice === 'number' && (
          <Text style={cardStyles.price}>
            from <Text style={cardStyles.priceValue}>{formatPrice(artist.startingPrice)}</Text>
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

export const ArtistResultCard = React.memo(ArtistResultCardImpl);

const cardStyles = sheet({
  card: { width: 168, marginRight: 14, textAlign: 'left' },
  cardFeatured: { width: '100%', marginRight: 0, marginBottom: 18 },
  imageWrap: { position: 'relative', borderRadius: 18, overflow: 'hidden', backgroundColor: '#f7f1ee' },
  imageWrapFeatured: { borderRadius: 20 },
  image: { width: '100%', aspectRatio: '4 / 3' },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  offerBadge: {
    position: 'absolute', left: 0, top: 10, maxWidth: '85%', backgroundColor: 'rgba(30,27,24,0.82)',
    paddingHorizontal: 10, paddingVertical: 5, borderTopRightRadius: 8, borderBottomRightRadius: 8,
  },
  offerText: { color: '#FFFFFF', fontSize: 11.5, fontFamily: 'HankenGrotesk_600SemiBold' },
  ratingPill: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1f7a4d', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  ratingText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'HankenGrotesk_600SemiBold' },
  body: { paddingTop: 9 },
  name: { fontSize: 15, color: '#1e1b18', fontFamily: 'HankenGrotesk_600SemiBold' },
  categories: { marginTop: 2, fontSize: 12, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { fontSize: 12, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  metaDot: { fontSize: 12, color: '#d7c1c3' },
  price: { marginTop: 4, fontSize: 12.5, color: '#857374', fontFamily: 'HankenGrotesk_400Regular' },
  priceValue: { color: '#1e1b18', fontFamily: 'HankenGrotesk_600SemiBold' },
});

// ─── CategorySwitcherRow ────────────────────────────────────────────────────
type Tile = { key: string; title: string; src: string | null };
const FALLBACK_TILES: Tile[] = HOME_CATEGORY_CARDS.map((c) => ({ key: c.title, title: c.title, src: c.image }));

function CategorySwitcherRowImpl({ activeCategory, onSelect }: { activeCategory?: string; onSelect: (category: string | undefined) => void }) {
  const { data: homeLayout } = useHomeLayout();
  const categoriesData = homeLayout?.find((s) => s.slug === 'categories')?.data as HomeCategoriesData | undefined;

  const tiles = useMemo<Tile[]>(() => {
    if (categoriesData?.tiles?.length) {
      const bundled = new Map<string, string>(HOME_CATEGORY_CARDS.map((c) => [c.title.toLowerCase(), c.image]));
      return categoriesData.tiles.map((t) => ({
        key: t.id,
        title: t.title,
        src: t.imageUrl || bundled.get(t.title.trim().toLowerCase()) || null,
      }));
    }
    return FALLBACK_TILES;
  }, [categoriesData]);

  return (
    <HScroll contentStyle={switcherStyles.row}>
      <PressableScale scaleTo={0.94} onPress={() => onSelect(undefined)} style={switcherStyles.item}>
        <View style={cx(switcherStyles.avatarWrap, !activeCategory && switcherStyles.avatarActive)}>
          <Icon name="grid-outline" size={22} color={!activeCategory ? '#884952' : '#a68e90'} />
        </View>
        <Text style={cx(switcherStyles.label, !activeCategory && switcherStyles.labelActive)}>All</Text>
      </PressableScale>
      {tiles.map((tile) => {
        const active = activeCategory === tile.title;
        return (
          <PressableScale key={tile.key} scaleTo={0.94} onPress={() => onSelect(tile.title)} style={switcherStyles.item}>
            <View style={cx(switcherStyles.avatarWrap, active && switcherStyles.avatarActive)}>
              {tile.src ? (
                <Img src={tile.src} style={switcherStyles.avatarImage} />
              ) : (
                <Text style={switcherStyles.initial}>{tile.title.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={cx(switcherStyles.label, active && switcherStyles.labelActive)} numberOfLines={1}>
              {tile.title}
            </Text>
          </PressableScale>
        );
      })}
    </HScroll>
  );
}

export const CategorySwitcherRow = React.memo(CategorySwitcherRowImpl);

const switcherStyles = sheet({
  initial: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 20, color: '#884952' },
  row: { paddingHorizontal: 16, paddingVertical: 14, gap: 18 },
  item: { alignItems: 'center', width: 62, gap: 6 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: '#f7f1ee', borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  avatarActive: { borderColor: '#884952' },
  avatarImage: { width: '100%', height: '100%' },
  label: { fontSize: 11, color: '#857374', fontFamily: 'HankenGrotesk_500Medium', textAlign: 'center', width: '100%' },
  labelActive: { color: '#884952', fontFamily: 'HankenGrotesk_700Bold' },
});

// ─── PortfolioGrid ──────────────────────────────────────────────────────────
// Three square columns with a 4px gap, as in the app.
function PortfolioGridImpl({ items }: { items: PortfolioItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
      {[...(items || [])]
        .sort((a, b) => a.order - b.order)
        .map((item, index) => (
          <div key={item.id} className="fade-up" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
            <Img src={getSizedImageUri(item.imageUrl, 160)} alt={item.caption ?? ''} style={{ width: '100%', aspectRatio: '1', borderRadius: 8 }} />
          </div>
        ))}
    </div>
  );
}

export const PortfolioGrid = React.memo(PortfolioGridImpl);
