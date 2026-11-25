import React from 'react';
import { sheet } from '@/lib/rn';
import { Icon, Img, Pressable, Text, View, isIconName } from '@/components/ui';
import { HomeFeatureItem, HomeLearnData } from '@/types';

// Port of frontend/src/components/ui/LearnBannerSection.tsx ("Learn with Annalia").
const LEARN_PORTRAIT = '/assets/images/1000128638-removebg-preview.png';
const FALLBACK_HEADING = 'Learn with Annalia';
const FALLBACK_SUBTITLE = 'Bridal, hair & business courses\nfrom industry pros';
const FALLBACK_CTA = 'Explore Courses';
const FALLBACK_ITEMS: HomeFeatureItem[] = [{ icon: 'play', title: 'Video Lessons', subtitle: 'Step-by-step' }];

// Items for features the app doesn't have are hidden, as in the app.
const UNSUPPORTED_ITEM_TITLES = new Set(['certificates', 'download', 'favorites']);
const isSupportedItem = (item: HomeFeatureItem) => !UNSUPPORTED_ITEM_TITLES.has(item.title.trim().toLowerCase());

function LearnBannerSectionImpl({
  data,
  onExplore,
  onItemPress,
}: {
  data?: HomeLearnData | null;
  onExplore?: () => void;
  onItemPress?: (index: number) => void;
}) {
  const heading = data?.heading || FALLBACK_HEADING;
  const subtitle = data?.subtitle || FALLBACK_SUBTITLE;
  const ctaText = data?.ctaText || FALLBACK_CTA;
  const items = (data?.items?.length ? data.items : FALLBACK_ITEMS).filter(isSupportedItem);
  const portrait = data?.imageUrl || LEARN_PORTRAIT;

  return (
    <View style={styles.learnSection}>
      <View style={styles.learnCard}>
        <View style={styles.learnCardBgArch} />
        <Text style={styles.sparkleTopRight}>✦</Text>
        <Text style={styles.sparkleMidLeft}>✦</Text>
        <View style={styles.learnTextCol}>
          <View style={styles.learnIconWrap}>
            <Icon name="school-outline" size={20} color="#884952" />
          </View>
          <Text style={styles.learnTitle}>{heading}</Text>
          <Text style={styles.learnSubtitle}>{subtitle}</Text>
          <Pressable onPress={onExplore} style={styles.learnCta}>
            <Text style={styles.learnCtaText}>{ctaText}</Text>
            <Icon name="arrow-forward" size={13} color="#FFFFFF" />
          </Pressable>
        </View>
        <Img src={portrait} fit="contain" position="bottom right" style={styles.learnPortrait} />
      </View>

      {items.length > 0 && (
        <View style={styles.featureGridCard}>
          {items.map((item, index) => (
            <React.Fragment key={`${item.title}-${index}`}>
              {index > 0 && <View style={styles.featureGridDivider} />}
              <Pressable onPress={() => onItemPress?.(index)} style={styles.featureGridCol}>
                {item.icon === 'play' ? (
                  <View style={styles.videoIconBox}>
                    <Icon name="play" size={10} color="#884952" style={{ marginLeft: 1 }} />
                  </View>
                ) : (
                  <Icon name={isIconName(item.icon) ? item.icon : 'ellipse-outline'} size={20} color="#884952" />
                )}
                <Text style={styles.featureGridTitle}>{item.title}</Text>
                {!!item.subtitle && <Text style={styles.featureGridSubtitle}>{item.subtitle}</Text>}
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

export const LearnBannerSection = React.memo(LearnBannerSectionImpl);

const styles = sheet({
  learnSection: { paddingHorizontal: 20, marginBottom: 20 },
  learnCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#F2E8EA', position: 'relative', overflow: 'hidden',
    minHeight: 152, paddingLeft: 18, paddingTop: 14, paddingBottom: 14, paddingRight: 0, justifyContent: 'center',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12,
  },
  learnCardBgArch: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', backgroundColor: '#FDECEF', borderTopLeftRadius: 80 },
  sparkleTopRight: { position: 'absolute', top: 14, right: 14, fontSize: 13, color: '#DFADB3', zIndex: 3 },
  sparkleMidLeft: { position: 'absolute', bottom: 38, right: '38%', fontSize: 11, color: '#DFADB3', zIndex: 3 },
  learnTextCol: { width: '60%', zIndex: 2, alignItems: 'flex-start' },
  learnIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FAF0F2', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  learnTitle: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 17.5, color: '#1e1b18', marginBottom: 3 },
  learnSubtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, lineHeight: 15.5, color: '#857374', marginBottom: 10 },
  learnCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, backgroundColor: '#884952', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 8 },
  learnCtaText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, color: '#FFFFFF' },
  learnPortrait: { position: 'absolute', right: 2, bottom: 0, top: 6, width: '38%', height: 'calc(100% - 6px)', zIndex: 2 },
  featureGridCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F2E8EA', paddingVertical: 10, paddingHorizontal: 4, marginTop: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#884952', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8,
  },
  featureGridCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, flexShrink: 1 },
  featureGridDivider: { width: 1, height: 26, backgroundColor: '#F5ECEE' },
  videoIconBox: { width: 22, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#884952', alignItems: 'center', justifyContent: 'center' },
  featureGridTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 11, color: '#1e1b18', marginTop: 4, textAlign: 'center' },
  featureGridSubtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 9.5, color: '#857374', marginTop: 1, textAlign: 'center' },
});
