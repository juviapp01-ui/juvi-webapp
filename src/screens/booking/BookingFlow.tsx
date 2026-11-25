import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Icon, Img, Pressable, PressableScale, Text, View } from '@/components/ui';
import { Card, InfoRow, PrimaryButton, QueryState, Screen, SectionLabel, Segmented, TextField } from '@/components/ui/kit';
import { PaymentStub } from '@/components/ui/PaymentStub';
import { SlotPicker } from '@/components/booking/SlotPicker';
import { bookingsApi } from '@/api';
import { useArtist } from '@/hooks';
import { ADVANCE_PAYMENT_PERCENTAGE } from '@/config/constants';
import { addressLine, savedAddresses, type SavedAddress } from '@/utils/addresses';
import { formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { formatIstDate, formatIstTime } from '@/utils/ist';
import type { Service } from '@/types';

// The booking flow, as in the app: SlotPicker → BookingConfirm → Payment.
// The selection travels in the URL (?artist=&services=&start=) so a reload
// keeps the customer's place.
//
// Stops at the pay step: payments are a labelled placeholder on the website
// (see README → Payments). The booking itself is NOT created here — an unpaid
// booking would sit as PENDING and hold the artist's time until it expired.
// Once Paytm web exists, the confirm button creates it with
// bookingsApi.create(...) exactly as the app does, then opens checkout.

function useSelection() {
  const [params] = useSearchParams();
  const artistId = params.get('artist') ?? '';
  const serviceIds = (params.get('services') ?? '').split(',').filter(Boolean);
  const start = params.get('start');
  const { data: artist, isLoading, error, refetch } = useArtist(artistId);
  const services = useMemo<Service[]>(() => (artist?.services ?? []).filter((s) => serviceIds.includes(s.id)), [artist, serviceIds.join(',')]);
  const durationMin = services.reduce((sum, s) => sum + (s.durationMin || 0), 0);
  const baseServiceFee = services.reduce((sum, s) => sum + (s.price || 0), 0);
  return { artistId, serviceIds, start, artist, services, durationMin, baseServiceFee, isLoading, error, refetch };
}

const query = (artistId: string, serviceIds: string[], start?: string | null) =>
  `artist=${encodeURIComponent(artistId)}&services=${serviceIds.map(encodeURIComponent).join(',')}${start ? `&start=${encodeURIComponent(start)}` : ''}`;

// ─── 1. Pick a time ──────────────────────────────────────────────────────────
export function SlotPickerScreen() {
  const navigate = useNavigate();
  const sel = useSelection();
  const [start, setStart] = useState<string | null>(sel.start);

  return (
    <Screen
      title="Choose slot"
      footer={
        <PrimaryButton
          title={start ? `Continue · ${formatIstDate(start, 'D MMM')}, ${formatIstTime(start)}` : 'Select a time'}
          disabled={!start}
          onPress={() => start && navigate(`/book/confirm?${query(sel.artistId, sel.serviceIds, start)}`)}
        />
      }
    >
      <QueryState
        isLoading={sel.isLoading}
        error={sel.error}
        errorTitle="Couldn't load this artist"
        errorMessage={getErrorMessage(sel.error)}
        onRetry={() => sel.refetch()}
        empty={!sel.isLoading && sel.services.length === 0}
        emptyTitle="Pick a service first"
        emptyMessage="Choose one or more services on the artist's page."
        emptyIcon="pricetags-outline"
      >
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Img src={sel.artist?.photoUrl} style={styles.avatar} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.artistName}>{sel.artist?.name}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {sel.services.map((s) => s.title).join(' · ')} · {sel.durationMin} mins
            </Text>
          </View>
        </Card>
        {sel.durationMin > 0 && <SlotPicker artistId={sel.artistId} durationMin={sel.durationMin} value={start} onChange={setStart} />}
      </QueryState>
    </Screen>
  );
}

// ─── 2. Confirm (location, address, pricing) ─────────────────────────────────
export function BookingConfirmScreen() {
  const navigate = useNavigate();
  const sel = useSelection();
  const { data: pricing, isLoading: pricingLoading, error: pricingError, refetch: refetchPricing } = useQuery({
    queryKey: ['booking-pricing'],
    queryFn: () => bookingsApi.pricing().then((r) => r.data.pricing),
  });

  const homeAvailable = !sel.artist || sel.artist.offersHomeService !== false;
  const studioAvailable = !!sel.artist?.studioAddress;
  const [location, setLocation] = useState<'home' | 'studio'>('home');
  const where = !homeAvailable && studioAvailable ? 'studio' : !studioAvailable ? 'home' : location;

  const saved = useMemo(() => savedAddresses.list(), []);
  const [addr, setAddr] = useState<Omit<SavedAddress, 'id' | 'label'>>(() => {
    const first = saved[0];
    return first ? { flat: first.flat, area: first.area, landmark: first.landmark, city: first.city, pincode: first.pincode } : { flat: '', area: '', landmark: '', city: '', pincode: '' };
  });
  const [notes, setNotes] = useState('');

  const pricingReady = !!pricing;
  const homeServiceFee = pricing?.homeServiceFee ?? 0;
  const convenienceFeePct = pricing?.convenienceFeePct ?? 0;
  const advancePct = pricing?.advancePct ?? ADVANCE_PAYMENT_PERCENTAGE;
  const homeServiceAddon = where === 'home' ? homeServiceFee : 0;
  const convenienceFee = Math.round((sel.baseServiceFee + homeServiceAddon) * convenienceFeePct);
  const totalAmount = sel.baseServiceFee + homeServiceAddon + convenienceFee;
  const advanceAmount = Math.round(totalAmount * advancePct);
  const remainingAmount = totalAmount - advanceAmount;

  const addressOk = where === 'studio' || (addr.flat.trim() && addr.area.trim() && addr.city.trim() && /^[1-9]\d{5}$/.test(addr.pincode.trim()));
  const reason = !sel.start ? 'Pick a time first' : !addressOk ? 'Add the full address and a 6-digit pincode' : !pricingReady ? 'Loading prices…' : null;

  return (
    <Screen
      title="Checkout"
      footer={
        <>
          {reason && <Text style={styles.reason}>{reason}</Text>}
          <PrimaryButton
            title={pricingReady ? `Pay Advance ${formatPrice(advanceAmount)}` : 'Loading prices…'}
            disabled={!!reason}
            onPress={() =>
              navigate(`/book/pay?${query(sel.artistId, sel.serviceIds, sel.start)}&amount=${advanceAmount}`, {
                state: { address: where === 'home' ? addressLine(addr) : sel.artist?.studioAddress, notes },
              })
            }
          />
        </>
      }
    >
      <QueryState isLoading={sel.isLoading} error={sel.error} errorTitle="Couldn't load this booking" errorMessage={getErrorMessage(sel.error)} onRetry={() => sel.refetch()}>
        <Text style={styles.subtitle}>Review your appointment details.</Text>

        <Card>
          <InfoRow label="Artist" value={sel.artist?.name ?? '—'} />
          <InfoRow label="Service" value={sel.services.map((s) => s.title).join(', ') || '—'} />
          <InfoRow label="Date" value={sel.start ? formatIstDate(sel.start, 'MMM D, YYYY') : '—'} />
          <InfoRow label="Time" value={sel.start ? formatIstTime(sel.start) : '—'} />
          <PressableScale onPress={() => navigate(`/book?${query(sel.artistId, sel.serviceIds, sel.start)}`)} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            <Text style={styles.link}>Change time</Text>
          </PressableScale>
        </Card>

        <SectionLabel>Location Preference</SectionLabel>
        <Segmented
          options={[
            { key: 'home', label: homeAvailable ? `At my place${pricingReady && homeServiceFee > 0 ? ` (+${formatPrice(homeServiceFee)})` : ''}` : 'Home · Not available' },
            { key: 'studio', label: studioAvailable ? 'At the studio' : 'Studio · Not available' },
          ]}
          value={where}
          onChange={(v) => {
            if ((v === 'home' && homeAvailable) || (v === 'studio' && studioAvailable)) setLocation(v);
          }}
        />

        {where === 'studio' ? (
          <Card style={{ flexDirection: 'row', gap: 10 }}>
            <Icon name="location-outline" size={18} color="#884952" />
            <Text style={styles.body}>{sel.artist?.studioAddress}</Text>
          </Card>
        ) : (
          <>
            {saved.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {saved.map((a) => (
                  <Pressable key={a.id} onPress={() => setAddr({ flat: a.flat, area: a.area, landmark: a.landmark, city: a.city, pincode: a.pincode })} style={styles.savedChip}>
                    <Text style={styles.savedChipText}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <TextField label="Flat / House No., Building *" placeholder="E.g. B-402, Sunrise Apartments" value={addr.flat} onChange={(v) => setAddr({ ...addr, flat: v })} autoComplete="address-line1" />
            <TextField label="Area / Street / Locality *" placeholder="E.g. Near City Mall, MG Road" value={addr.area} onChange={(v) => setAddr({ ...addr, area: v })} autoComplete="address-line2" />
            <TextField label="Landmark (optional)" placeholder="E.g. Opposite HDFC Bank" value={addr.landmark ?? ''} onChange={(v) => setAddr({ ...addr, landmark: v })} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <TextField label="City *" value={addr.city} onChange={(v) => setAddr({ ...addr, city: v })} autoComplete="address-level2" />
              </View>
              <View style={{ flex: 1 }}>
                <TextField label="Pincode *" value={addr.pincode} onChange={(v) => setAddr({ ...addr, pincode: v.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" autoComplete="postal-code" />
              </View>
            </View>
          </>
        )}

        <TextField label="Notes for the artist (optional)" placeholder="Skin type, look you want, parking…" value={notes} onChange={setNotes} multiline maxLength={500} />

        <SectionLabel>Payment Summary</SectionLabel>
        {pricingError ? (
          <PressableScale onPress={() => refetchPricing()} style={{ marginBottom: 14 }}>
            <Text style={{ ...styles.reason, textAlign: 'left' }}>Couldn't load the latest fees — tap to retry</Text>
          </PressableScale>
        ) : null}
        <Card>
          <InfoRow label="Service Fee" value={formatPrice(sel.baseServiceFee)} />
          {where === 'home' && homeServiceFee > 0 && <InfoRow label="Home Service Fee" value={formatPrice(homeServiceFee)} />}
          {(!pricingReady || convenienceFeePct > 0) && (
            <InfoRow label={`Convenience Fee${pricingReady ? ` (${Math.round(convenienceFeePct * 1000) / 10}%)` : ''}`} value={pricingLoading ? '…' : formatPrice(convenienceFee)} />
          )}
          <View style={styles.divider} />
          <InfoRow label="Total Service Cost" value={formatPrice(totalAmount)} strong />
          <View style={styles.advanceBox}>
            <InfoRow label="Advance Payment (Due Now)" value={formatPrice(advanceAmount)} strong />
            <InfoRow label="Remaining (Due After Service)" value={formatPrice(remainingAmount)} />
          </View>
        </Card>
      </QueryState>
    </Screen>
  );
}

// ─── 3. Pay (placeholder) ────────────────────────────────────────────────────
export function BookingPayScreen() {
  const [params] = useSearchParams();
  const amount = Number(params.get('amount')) || undefined;
  return <PaymentStub title="Payment" amount={amount} what="Booking advance" />;
}

const styles = sheet({
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#efe6e2' },
  artistName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17, color: '#1e1b18' },
  meta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374', marginTop: 2 },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#524344', marginBottom: 14 },
  body: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#1e1b18', lineHeight: 20, flex: 1 },
  link: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#884952', textDecorationLine: 'underline' },
  reason: { fontFamily: 'Inter_500Medium', fontSize: 12.5, color: '#827378', textAlign: 'center' },
  savedChip: { borderWidth: 1, borderColor: '#884952', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  savedChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#884952' },
  divider: { height: 1, backgroundColor: '#f1e7e3', margin: '8px 0' },
  advanceBox: { backgroundColor: '#fbf2ed', borderRadius: 12, padding: '6px 12px', marginTop: 8 },
});

