import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sheet } from '@/lib/rn';
import { BackHeader, EmptyState, Icon, Img, PressableScale, SkeletonLoader, Text, View } from '@/components/ui';
import { artistsApi } from '@/api';
import { formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';

// Port of frontend/src/screens/customer/ServiceDetailScreen.tsx.
export default function ServiceDetailScreen() {
  const navigate = useNavigate();
  const { artistId = '', serviceId = '' } = useParams();

  const { data: artist } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => artistsApi.getById(artistId).then((r) => r.data),
    enabled: !!artistId,
  });
  const { data: services, isLoading, error } = useQuery({
    queryKey: ['artist-services', artistId],
    queryFn: () => artistsApi.services(artistId).then((r) => r.data),
    enabled: !!artistId,
  });
  const service = services?.find((s) => s.id === serviceId);

  if (isLoading) {
    return (
      <View style={styles.safe}>
        <SkeletonLoader height={340} style={{ borderRadius: 0 }} />
        <View style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 32 }}>
          <SkeletonLoader height={28} width="60%" style={{ marginBottom: 16 }} />
          <SkeletonLoader height={16} width="40%" style={{ marginBottom: 24 }} />
          <SkeletonLoader height={80} style={{ marginBottom: 16 }} />
        </View>
      </View>
    );
  }

  if (error || !service) {
    return (
      <View style={styles.safe}>
        <BackHeader onBack={() => navigate(-1)} />
        <EmptyState
          title="Could not load this service"
          message={error ? getErrorMessage(error) : 'This service is no longer available.'}
          iconName="alert-circle-outline"
          iconColor="#C0392B"
        />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <BackHeader title="Service" onBack={() => navigate(-1)} />

      <View style={styles.scrollContent}>
        {artist?.photoUrl && (
          <View className="fade-up" style={styles.heroSection}>
            <Img src={artist.photoUrl} lazy={false} style={{ width: '100%', height: '100%' }} />
          </View>
        )}

        <View className="fade-up" style={{ ...styles.contentCard, ...(!artist?.photoUrl ? { marginTop: 0 } : {}) }}>
          <View style={styles.titleBlock}>
            {artist && (
              <PressableScale onPress={() => navigate(`/artist/${artist.id}`)} style={styles.eliteBadge}>
                <Icon name="sparkles-outline" size={12} color="#884952" />
                <Text style={styles.eliteBadgeText}>{artist.name}</Text>
              </PressableScale>
            )}
            <Text style={styles.titleText}>{service.title}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>{formatPrice(service.price)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{service.durationMin} Min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Rating</Text>
              <View style={styles.ratingRow}>
                <Icon name="star" size={14} color="#884952" />
                <Text style={styles.statValue}>{artist?.rating?.toFixed(1) ?? '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionHeading}>About this service</Text>
            <Text style={styles.bodyText}>{service.description}</Text>
          </View>

          {service.category && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionHeading}>Category</Text>
              <Text style={styles.bodyText}>{service.category}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.stickyFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{formatPrice(service.price)}</Text>
        </View>
        <PressableScale style={styles.bookBtn} onPress={() => navigate('/book', { state: { artistId, serviceIds: [serviceId] } })}>
          <Text style={styles.bookBtnText}>Book Now</Text>
          <Icon name="arrow-forward" size={16} color="#FFFFFF" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  scrollContent: { paddingBottom: 140 },
  heroSection: { width: '100%', aspectRatio: '4 / 5', backgroundColor: '#efe6e2', position: 'relative' },
  contentCard: {
    marginTop: -40, backgroundColor: 'rgba(255, 255, 255, 0.95)', borderTopLeftRadius: 40, borderTopRightRadius: 40,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40,
  },
  titleBlock: { alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  eliteBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbf2ed', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.4)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, gap: 6 },
  eliteBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#884952', textTransform: 'uppercase', letterSpacing: 2 },
  titleText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 32, color: '#1e1b18' },
  statsGrid: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: 'rgba(215, 193, 195, 0.2)', borderBottomColor: 'rgba(215, 193, 195, 0.2)', paddingVertical: 24, marginBottom: 32 },
  statColumn: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#857374', textTransform: 'uppercase', letterSpacing: 1.5 },
  statValue: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#1e1b18' },
  statDivider: { width: 1, backgroundColor: 'rgba(215, 193, 195, 0.2)' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailSection: { marginBottom: 32 },
  sectionHeading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#884952', marginBottom: 12 },
  bodyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#524344', lineHeight: 22 },
  stickyFooter: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 30,
    backgroundColor: 'rgba(255, 248, 245, 0.96)', borderTopWidth: 1, borderTopColor: 'rgba(215, 193, 195, 0.2)',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerLeft: { gap: 2 },
  priceLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#857374', textTransform: 'uppercase', letterSpacing: 1.5 },
  priceValue: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#1e1b18' },
  bookBtn: { backgroundColor: '#884952', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookBtnText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 2 },
});
