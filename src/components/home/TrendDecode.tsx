import React from 'react';
import { sheet, absoluteFill } from '@/lib/rn';
import { EmptyState, HScroll, Icon, Img, Pressable, PressableScale, Text, View } from '@/components/ui';
import { getSizedImageUri } from '@/utils/image';
import { TrendDecodeItem } from '@/types';

// Ports of frontend/src/components/ui/TrendDecodeCard.tsx and
// frontend/src/components/home/HomeTrendDecodeSection.tsx.

// The description's first sentence or line — kept short for the card.
function firstSegment(description?: string): string | undefined {
  if (!description) return undefined;
  const segment = description.split(/\r?\n|(?<=[.!?])\s+/)[0]?.trim();
  return segment || undefined;
}

function TrendDecodeCardImpl({ item, onPress }: { item: TrendDecodeItem; onPress: () => void }) {
  const subtitle = firstSegment(item.description);
  return (
    <PressableScale scaleTo={0.95} onPress={onPress} style={cardStyles.card} ariaLabel={item.title}>
      <Img src={getSizedImageUri(item.thumbnailUrl, 160)} style={cardStyles.thumbnail} />
      <View style={{ ...absoluteFill, background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.85) 100%)' }} />
      <View style={cardStyles.playBadge}>
        <Icon name="play" size={11} color="#FFFFFF" />
      </View>
      <View style={cardStyles.textOverlay}>
        <Text style={cardStyles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {subtitle ? (
          <Text style={cardStyles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

export const TrendDecodeCard = React.memo(TrendDecodeCardImpl);

const cardStyles = sheet({
  card: {
    width: 160, aspectRatio: '9 / 16', borderRadius: 16, overflow: 'hidden', position: 'relative', backgroundColor: '#efe6e2',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20,
  },
  thumbnail: { width: '100%', height: '100%' },
  playBadge: { position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(30, 27, 24, 0.55)', alignItems: 'center', justifyContent: 'center' },
  textOverlay: { position: 'absolute', bottom: 12, left: 12, right: 12, gap: 3, textAlign: 'left' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 13, lineHeight: 17, color: '#FFFFFF' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)' },
});

export const HomeTrendDecodeSection = React.memo(function HomeTrendDecodeSection({
  items,
  onOpenItem,
  onViewAll,
}: {
  items: TrendDecodeItem[];
  onOpenItem: (item: TrendDecodeItem) => void;
  onViewAll: () => void;
}) {
  return (
    <View style={sectionStyles.reelsSection}>
      <View style={{ ...sectionStyles.trendDecodeHeader, paddingLeft: 24, paddingRight: 24 }}>
        <View>
          <Text style={sectionStyles.sectionTitle}>Trend Decode</Text>
          <Text style={sectionStyles.trendDecodeSubtitle}>Watch, learn & get inspired</Text>
        </View>
        <Pressable onPress={onViewAll} style={sectionStyles.trendDecodePill}>
          <Text style={sectionStyles.trendDecodePillText}>View all Reels</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <EmptyState title="No trends yet" message="Trend Decode content will show up here." iconName="sparkles-outline" iconColor="#857374" />
      ) : (
        <HScroll contentStyle={sectionStyles.horizontalScrollContent}>
          {items.map((item, index) => (
            <div key={item.id} className="fade-up" style={{ animationDelay: `${index * 50}ms` }}>
              <TrendDecodeCard item={item} onPress={() => onOpenItem(item)} />
            </div>
          ))}
        </HScroll>
      )}
    </View>
  );
});

const sectionStyles = sheet({
  reelsSection: { marginBottom: 40 },
  trendDecodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sectionTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 24, color: '#1e1b18' },
  trendDecodeSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#857374', marginTop: 4 },
  trendDecodePill: { backgroundColor: '#1e1b18', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, marginTop: 2 },
  trendDecodePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#FFFFFF' },
  horizontalScrollContent: { paddingLeft: 24, paddingRight: 12, gap: 16 },
});
