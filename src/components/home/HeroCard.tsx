import React from 'react';
import { sheet, absoluteFill } from '@/lib/rn';
import { Img, Pressable, Text, View } from '@/components/ui';
import { HomeHeroData } from '@/types';

// Port of frontend/src/components/home/HeroCard.tsx — same fallbacks, layout
// and the optional looping video over the poster image.
const FALLBACK_IMAGE = '/assets/images/mock/6.png';
const FALLBACK_HEADING = 'Luxury Beauty on Demand';
const FALLBACK_SUBTITLE = 'Specialists for you';
const FALLBACK_CTA = 'View all services';
const FALLBACK_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBde5usPO9s1nYK4FHL90TLLe7ZCKvOhF3gLCUQTf8bMdPecQOheqMILdoB6LTiwey54GRcSTOqVtgwgvX705PZomgOF7-j-eYJDAX8_-PzSZo1_GQNNnvZF8l1BMqQrmNb2UZCPIO9f27G_1OLdjvRY55X61qFXk0pI-8X3PSDCGsOuOoL299y-41GMf2r0SsqjFCHsqSjk_Ok16O3L2r5_iqbcTDDgPTjZ9SSoZZFU8Y90KLVxPq0KiVDVM3c1nWRo_U2m7eFdZU',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ0wIVxvsOtd8rfS4O4DbQq9-8TICR5f2XU4bO6vD-EIOOW064dUUpFXz6t0lAxcGgxADKLoQDIWIJThuXAUmrJpHrf725-hF5rjE1pWsHrbE5AnworvcuDOZ3L4ydirq3aIAVhCEqy6vj2A0W-J-HquxdZ_wSpB8S0gsoddgkFeTijOYXiu6qwpL43R9ZLuJ3eIP6RJUdFq5o4W0o1OEnFkJFytnxezW-cAxk9WrxsupMuL6ytdcbRrCr2fzLN3Yd2JCBKCC-QhRuRA',
];

function HeroCardImpl({ data, onPressCta }: { data: HomeHeroData | null; onPressCta: () => void }) {
  const heading = data?.heading || FALLBACK_HEADING;
  const subtitle = data?.subtitle || FALLBACK_SUBTITLE;
  const ctaText = data?.ctaText || FALLBACK_CTA;
  const avatars = data?.avatarUrls?.length ? data.avatarUrls : FALLBACK_AVATARS;
  const image = data?.imageUrl || FALLBACK_IMAGE;
  const videoUrl = data?.videoUrl ?? null;

  return (
    <View className="fade-down" style={styles.heroSection}>
      <View style={styles.heroCard}>
        <Img src={image} style={styles.heroImage} lazy={false} />
        {videoUrl && (
          <video
            src={videoUrl}
            poster={image}
            autoPlay
            muted
            loop
            playsInline
            style={{ ...absoluteFill, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
          />
        )}
        <View style={styles.overlapCard}>
          <Text style={styles.overlapTitle}>{heading}</Text>
          <View style={styles.specialistRow}>
            <View style={styles.avatarStack}>
              {avatars.slice(0, 2).map((uri, i) => (
                <Img key={uri} src={uri} style={{ ...styles.stackAvatar, zIndex: 2 - i, ...(i > 0 ? { marginLeft: -12 } : {}) }} />
              ))}
            </View>
            <Text style={styles.specialistText}>{subtitle}</Text>
          </View>
          <Pressable onPress={onPressCta} style={styles.viewAllBtn}>
            <Text style={styles.viewAllBtnText}>{ctaText}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const HeroCard = React.memo(HeroCardImpl);

const styles = sheet({
  heroSection: { paddingHorizontal: 24, marginBottom: 76 },
  heroCard: {
    position: 'relative', width: '100%', aspectRatio: '4 / 5', borderRadius: 16, backgroundColor: '#efe6e2',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.12, shadowRadius: 40,
  },
  heroImage: { width: '100%', height: '100%', borderRadius: 16 },
  overlapCard: {
    position: 'absolute', bottom: -32, left: 16, right: 16, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(8px)',
    shadowColor: '#1e1b18', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20,
  },
  overlapTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 28, color: '#1e1b18', marginBottom: 12 },
  specialistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#FFFFFF', position: 'relative' },
  specialistText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#524344' },
  viewAllBtn: {
    backgroundColor: '#1e1b18', borderRadius: 24, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', width: '100%',
    shadowColor: '#1e1b18', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  viewAllBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 2 },
});
