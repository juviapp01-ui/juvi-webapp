import { useNavigate } from 'react-router-dom';
import { sheet } from '@/lib/rn';
import { formatPrice } from '@/utils/format';
import { BackHeader, Button } from './index';
import { Icon } from './Icon';
import { Text, View } from './primitives';

// ─── PAYMENT PLACEHOLDER ─────────────────────────────────────────────────────
// Paytm is not wired up on the website yet: the web checkout needs a return
// page on the site's domain, the domain allowed in the Paytm dashboard, and a
// backend change to create orders for the web (see README → Payments).
// Every flow reaches this screen at the pay step, so nothing is charged and
// nothing pretends to be.
export function PaymentStub({ title, amount, what, onBack }: { title: string; amount?: number; what: string; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <View style={styles.safe}>
      <BackHeader title={title} onBack={onBack ?? (() => navigate(-1))} />
      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PAYMENT PLACEHOLDER</Text>
        </View>
        <View style={styles.iconWrap}>
          <Icon name="card-outline" size={36} color="#884952" />
        </View>
        {typeof amount === 'number' && <Text style={styles.amount}>{formatPrice(amount)}</Text>}
        <Text style={styles.what}>{what}</Text>
        <Text style={styles.message}>
          Online payment isn't available on the website yet. Nothing has been charged. Please complete this payment in the JUVI app.
        </Text>
        <View style={{ width: '100%', maxWidth: 280, gap: 10 }}>
          <Button title="Pay now (not available yet)" disabled onPress={() => undefined} />
          <Button title="Go back" variant="outline" onPress={onBack ?? (() => navigate(-1))} />
        </View>
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 48, gap: 10 },
  badge: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 8 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#92400E' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(136, 73, 82, 0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  amount: { fontFamily: 'BodoniModa_700Bold', fontSize: 32, color: '#1e1b18' },
  what: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18', textAlign: 'center' },
  message: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#857374', textAlign: 'center', lineHeight: 20, maxWidth: 320, marginBottom: 12 },
});
