import React from 'react';
import { sheet } from '@/lib/rn';
import { Text, View } from '@/components/ui';
import { HomeFooterData } from '@/types';

// Port of frontend/src/components/home/HomeFooter.tsx.
const FALLBACK_HEADING = 'Live Across North-East India';
const FALLBACK_CITIES = 'Dimapur | Kohima | Guwahati | Shillong | Imphal & more';
const FALLBACK_COPYRIGHT = `© ${new Date().getFullYear()} JUVI Beauty Boutique`;

function HomeFooterImpl({ data }: { data: HomeFooterData | null }) {
  return (
    <View style={styles.footerSection}>
      <View style={styles.citiesBlock}>
        <Text style={styles.citiesTitle}>{data?.heading || FALLBACK_HEADING}</Text>
        <Text style={styles.citiesList}>{data?.cities || FALLBACK_CITIES}</Text>
      </View>
      <View style={styles.footerBranding}>
        <Text style={styles.footerLogo}>JUVI</Text>
        <Text style={styles.footerCopyright}>{data?.copyright || FALLBACK_COPYRIGHT}</Text>
      </View>
    </View>
  );
}

export const HomeFooter = React.memo(HomeFooterImpl);

const styles = sheet({
  footerSection: { borderTopWidth: 1, borderTopColor: 'rgba(215, 193, 195, 0.2)', paddingTop: 48, paddingBottom: 24, alignItems: 'center', gap: 32 },
  citiesBlock: { alignItems: 'center', gap: 12 },
  citiesTitle: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 20, color: '#1e1b18' },
  citiesList: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#524344', textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  footerBranding: { alignItems: 'center', gap: 8 },
  footerLogo: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 36, color: '#884952' },
  footerCopyright: { fontFamily: 'Inter_400Regular', fontSize: 10, color: 'rgba(82, 67, 68, 0.6)' },
});
