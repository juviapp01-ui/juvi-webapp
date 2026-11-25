import React from 'react';
import { sheet, cx, absoluteFill } from '@/lib/rn';
import { Img, PressableScale, Text, View } from '@/components/ui';
import { HomePromoData } from '@/types';

// Port of frontend/src/components/home/PromoBannerCard.tsx — renders nothing
// without admin copy, exactly like the app.
function PromoBannerCardImpl({ data, onPressCta }: { data: HomePromoData | null; onPressCta?: () => void }) {
  const heading = data?.heading?.trim();
  if (!data || !heading) return null;
  const buttonText = data.buttonText?.trim();
  const showCta = !!onPressCta && !!buttonText && buttonText.toLowerCase() !== 'coming soon';

  const body = (
    <>
      <View style={styles.promoCircleBlur} />
      {!!data.badgeText && <Text style={styles.promoBadge}>{data.badgeText}</Text>}
      <Text style={styles.promoValue}>{heading}</Text>
      {!!data.subtitle && <Text style={styles.promoDesc}>{data.subtitle}</Text>}
      {showCta && (
        <PressableScale scaleTo={0.96} style={styles.promoBtn} onPress={onPressCta}>
          <Text style={styles.promoBtnText}>{buttonText}</Text>
        </PressableScale>
      )}
    </>
  );

  return (
    <View style={styles.promoSection}>
      {data.imageUrl ? (
        <View style={styles.promoCard}>
          <Img src={data.imageUrl} style={{ ...absoluteFill, width: '100%', height: '100%' }} />
          <View style={styles.promoScrim} />
          {body}
        </View>
      ) : (
        <View style={cx(styles.promoCard, { background: 'linear-gradient(180deg, #390a14, #20050b)' })}>{body}</View>
      )}
    </View>
  );
}

export const PromoBannerCard = React.memo(PromoBannerCardImpl);

const styles = sheet({
  promoSection: { paddingHorizontal: 24, marginBottom: 48 },
  promoCard: {
    borderRadius: 32, padding: 32, alignItems: 'center', position: 'relative', overflow: 'hidden',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20,
  },
  promoScrim: { ...absoluteFill, backgroundColor: 'rgba(32, 5, 11, 0.55)' },
  promoCircleBlur: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(136, 73, 82, 0.2)' },
  promoBadge: { fontFamily: 'Inter_700Bold', fontSize: 9, color: '#ffd9dc', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8, position: 'relative' },
  promoValue: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 36, color: '#FFFFFF', marginBottom: 8, textAlign: 'center', position: 'relative' },
  promoDesc: { fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: 20, position: 'relative' },
  promoBtn: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 24,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10,
  },
  promoBtnText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#390a14', textTransform: 'uppercase', letterSpacing: 2 },
});
