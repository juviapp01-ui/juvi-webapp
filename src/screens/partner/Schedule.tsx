import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Badge, HScroll, Icon, Pressable, PressableScale, Text, View } from '@/components/ui';
import { Card, InfoRow, PrimaryButton, QueryState, Screen, SectionLabel, TextField, kit } from '@/components/ui/kit';
import { BookingCard } from '@/screens/booking/Bookings';
import { bookingsApi } from '@/api';
import { useBookingAction, useBookings } from '@/hooks';
import { useUIStore } from '@/store/uiStore';
import {
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANT,
  CANCELLABLE_BOOKING_STATUSES,
  CHAT_ELIGIBLE_BOOKING_STATUSES,
  canCompleteService,
  canStartService,
} from '@/constants/bookingStatus';
import { formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { formatIstDate, formatIstTime } from '@/utils/ist';
import type { Booking, BookingStatus } from '@/types';

// Ports of the app's ArtistBookingsScreen ("Schedule" tab) and the artist
// side of BookingDetailScreen: accept / decline requests, send the start or
// completion code to the client and verify it, cancel.

const FILTERS: { key: string; label: string; statuses: BookingStatus[] | null }[] = [
  { key: 'requests', label: 'Requests', statuses: [BOOKING_STATUS.PENDING_ARTIST_APPROVAL] },
  { key: 'upcoming', label: 'Upcoming', statuses: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS] },
  { key: 'completed', label: 'Completed', statuses: [BOOKING_STATUS.SERVICE_COMPLETED, BOOKING_STATUS.COMPLETED] },
  { key: 'all', label: 'All', statuses: null },
];

export function ScheduleScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('requests');
  const { data, isLoading, error, refetch } = useBookings('artist');
  const all = useMemo(() => (data?.items ?? []) as Booking[], [data]);
  const bookings = useMemo(() => {
    const statuses = FILTERS.find((f) => f.key === filter)?.statuses;
    return statuses ? all.filter((b) => statuses.includes(b.status)) : all;
  }, [all, filter]);
  const pending = all.filter((b) => b.status === BOOKING_STATUS.PENDING_ARTIST_APPROVAL).length;

  return (
    <View style={kit.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.sub}>
          {pending > 0 ? `${pending} new session ${pending === 1 ? 'request awaits' : 'requests await'} your response.` : 'Manage your sessions and client requests.'}
        </Text>
        <Pressable onPress={() => navigate('/partner/availability')} style={styles.hoursLink}>
          <Icon name="time-outline" size={16} color="#884952" />
          <Text style={styles.hoursLinkText}>Working hours & blocked time</Text>
        </Pressable>
      </View>
      <HScroll contentStyle={{ gap: 8, padding: '0 20px 12px' }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <PressableScale key={f.key} scaleTo={0.94} onPress={() => setFilter(f.key)} style={cx(styles.pill, active && styles.pillActive)}>
              <Text style={cx(styles.pillText, active && { color: '#FFFFFF' })}>{f.label}</Text>
              {f.key === 'requests' && pending > 0 && (
                <View style={styles.count}>
                  <Text style={styles.countText}>{pending}</Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </HScroll>
      <View style={{ ...kit.content, paddingTop: 4, paddingBottom: 110 }}>
        <QueryState
          isLoading={isLoading}
          error={error}
          errorTitle="Could not load bookings"
          errorMessage={getErrorMessage(error)}
          onRetry={() => refetch()}
          empty={bookings.length === 0}
          emptyTitle={filter === 'requests' ? 'No new requests' : 'Nothing here yet'}
          emptyMessage="New booking requests from clients show up here."
          emptyIcon="calendar-outline"
        >
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} perspective="artist" onPress={() => navigate(`/partner/bookings/${b.id}`)} />
          ))}
        </QueryState>
      </View>
    </View>
  );
}

// ─── Artist booking detail ───────────────────────────────────────────────────
const OTP_LENGTH = 4;

export function ArtistBookingDetailScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const { data: booking, isLoading, error, refetch } = useQuery({ queryKey: ['booking', id], queryFn: () => bookingsApi.getById(id).then((r) => r.data), enabled: !!id });
  const { accept, reject, cancel, sendStartOtp, start, sendCompletionOtp, complete } = useBookingAction();
  const [otpStage, setOtpStage] = useState<'start' | 'complete' | null>(null);
  const [otp, setOtp] = useState('');
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['booking', id] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
  };

  if (isLoading || error || !booking) {
    return (
      <Screen title="Booking">
        <QueryState isLoading={isLoading} error={error || !booking} errorTitle="Could not load booking" errorMessage={getErrorMessage(error)} onRetry={() => refetch()}>
          <span />
        </QueryState>
      </Screen>
    );
  }

  const commissionRate = typeof booking.commissionRate === 'number' ? booking.commissionRate : null;
  // Paid on the pre-discount total: a JUVI promo is JUVI's cost, not the artist's.
  const payoutBase = booking.totalAmount + (booking.discountAmount ?? 0);
  const earning = typeof booking.artistPayout === 'number' ? booking.artistPayout : commissionRate !== null ? payoutBase * (1 - commissionRate) : null;
  const commission = earning !== null ? Math.max(0, payoutBase - earning) : null;
  const isRequest = booking.status === BOOKING_STATUS.PENDING_ARTIST_APPROVAL;
  const canStart = canStartService(booking.status);
  const canComplete = canCompleteService(booking.status);

  const sendCode = (stage: 'start' | 'complete') => {
    const m = stage === 'start' ? sendStartOtp : sendCompletionOtp;
    m.mutate(booking.id, {
      onSuccess: () => {
        setOtp('');
        setOtpStage(stage);
        showToast('Code sent to your client', 'success');
      },
      onError: (e) => showToast(getErrorMessage(e, 'Could not send code. Please try again.'), 'error'),
    });
  };
  const verify = () => {
    const m = otpStage === 'start' ? start : complete;
    m.mutate(
      { id: booking.id, otp },
      {
        onSuccess: () => {
          showToast(otpStage === 'start' ? 'Service started' : 'Service marked complete', 'success');
          setOtpStage(null);
          refresh();
        },
        onError: (e) => showToast(getErrorMessage(e, 'Invalid code. Please try again.'), 'error'),
      }
    );
  };

  return (
    <Screen title={isRequest ? 'Booking Request' : 'Booking Details'}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={styles.detailTitle}>{booking.customerName || 'Client'}</Text>
          <Badge label={BOOKING_STATUS_LABELS[booking.status] ?? booking.status} variant={BOOKING_STATUS_VARIANT[booking.status]} />
        </View>
        <Text style={styles.ref}>Ref. #JV-2026-{booking.id.slice(-4).toUpperCase()}</Text>
        <InfoRow label="Service" value={booking.serviceTitle} />
        <InfoRow label="Date & Time" value={`${formatIstDate(booking.scheduledAt)} · ${formatIstTime(booking.scheduledAt)}`} />
        {!!booking.durationMin && <InfoRow label="Duration" value={`${booking.durationMin} mins`} />}
        <InfoRow label="Location" value={booking.locationType === 'STUDIO' ? 'At your studio' : booking.address || 'Home visit'} />
        {!!booking.customerGender && <InfoRow label="Client" value={String(booking.customerGender).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} />}
        {booking.customerPhone && !isRequest && (
          <InfoRow label="Phone" value={<a href={`tel:${booking.customerPhone}`} style={{ color: '#884952' }}>{booking.customerPhone}</a>} />
        )}
        {booking.notes && <InfoRow label="Notes" value={booking.notes} />}
      </Card>

      <SectionLabel>Your earning</SectionLabel>
      <Card>
        <InfoRow label="Service Subtotal" value={formatPrice(payoutBase)} />
        <InfoRow
          label={`Platform Commission${commissionRate !== null ? ` (${Math.round(commissionRate * 1000) / 10}%)` : ''}`}
          value={commission === null ? '—' : commission > 0 ? `-${formatPrice(commission)}` : formatPrice(0)}
        />
        <InfoRow label="Your Total Earning" value={earning === null ? '—' : formatPrice(earning)} strong />
      </Card>

      {otpStage && (
        <Card style={{ backgroundColor: '#fbf2ed', borderColor: '#efd9dc' }}>
          <SectionLabel style={{ marginTop: 0 }}>{otpStage === 'start' ? 'Enter the start code' : 'Enter the completion code'}</SectionLabel>
          <Text style={styles.sub}>Ask your client for the {OTP_LENGTH}-digit code we just sent them.</Text>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Code"
            style={{ margin: '12px 0', width: '100%', boxSizing: 'border-box', textAlign: 'center', letterSpacing: 12, fontSize: 28, fontFamily: 'Inter, sans-serif', fontWeight: 700, padding: 12, borderRadius: 12, border: '1px solid #d7c1c3', background: '#FFFFFF' }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Cancel" tone="ink" onPress={() => setOtpStage(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Verify" disabled={otp.length !== OTP_LENGTH} loading={start.isPending || complete.isPending} onPress={verify} />
            </View>
          </View>
        </Card>
      )}

      <View style={{ gap: 10, marginTop: 6 }}>
        {isRequest && !declining && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => setDeclining(true)} style={styles.secondaryBtn} disabled={accept.isPending}>
                <Text style={styles.secondaryText}>Decline</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Accept Booking"
                loading={accept.isPending}
                onPress={() =>
                  accept.mutate(booking.id, {
                    onSuccess: () => {
                      showToast('Booking accepted', 'success');
                      refresh();
                    },
                    onError: (e) => showToast(getErrorMessage(e, 'Could not accept booking.'), 'error'),
                  })
                }
              />
            </View>
          </View>
        )}
        {isRequest && declining && (
          <Card>
            <TextField label="Reason (optional)" value={declineReason} onChange={setDeclineReason} placeholder="Not available at that time" maxLength={200} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Keep" tone="ink" onPress={() => setDeclining(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Decline Request"
                  loading={reject.isPending}
                  onPress={() =>
                    reject.mutate(
                      { id: booking.id, reason: declineReason.trim() || 'Declined by partner' },
                      {
                        onSuccess: () => {
                          showToast('Request declined', 'success');
                          navigate('/partner/schedule', { replace: true });
                        },
                        onError: (e) => showToast(getErrorMessage(e, 'Could not decline request.'), 'error'),
                      }
                    )
                  }
                />
              </View>
            </View>
          </Card>
        )}
        {(canStart || canComplete) && !otpStage && (
          <PrimaryButton
            title={canStart ? 'Start Service — Send Code' : 'Finish Service — Send Code'}
            loading={sendStartOtp.isPending || sendCompletionOtp.isPending}
            onPress={() => sendCode(canStart ? 'start' : 'complete')}
          />
        )}
        {CHAT_ELIGIBLE_BOOKING_STATUSES.includes(booking.status) && <PrimaryButton title="Message Client" tone="ink" onPress={() => navigate(`/partner/chat/${booking.id}`)} />}
        {CANCELLABLE_BOOKING_STATUSES.includes(booking.status) && !isRequest && (
          <>
            <Text style={{ ...styles.sub, textAlign: 'center' }}>Cancelling after confirmation might affect your reliability rating.</Text>
            <Pressable
              onPress={() => {
                if (!window.confirm('Cancel this appointment? Your client will be refunded.')) return;
                cancel.mutate(
                  { id: booking.id, reason: 'Cancelled by partner' },
                  {
                    onSuccess: () => {
                      showToast('Appointment cancelled', 'success');
                      refresh();
                    },
                    onError: (e) => showToast(getErrorMessage(e, 'Could not cancel.'), 'error'),
                  }
                );
              }}
              style={styles.secondaryBtn}
            >
              <Text style={{ ...styles.secondaryText, color: '#B91C1C' }}>Cancel Appointment</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = sheet({
  header: { padding: '20px 20px 12px', gap: 4 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: '#857374', lineHeight: 19 },
  hoursLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  hoursLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#efe6e2' },
  pillActive: { backgroundColor: '#884952', borderColor: '#884952' },
  pillText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#524344' },
  count: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E4407A', alignItems: 'center', justifyContent: 'center', padding: '0 5px' },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 10.5, color: '#FFFFFF' },
  detailTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1e1b18', flex: 1 },
  ref: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#A8A29E', letterSpacing: 1, marginBottom: 8 },
  secondaryBtn: { borderWidth: 1, borderColor: '#d7c1c3', borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: '100%' },
  secondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1e1b18' },
});
