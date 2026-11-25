import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Badge, Icon, Pressable, PressableScale, Text, View } from '@/components/ui';
import { Card, InfoRow, PrimaryButton, QueryState, Screen, SectionLabel, Segmented, TextField } from '@/components/ui/kit';
import { PaymentStub } from '@/components/ui/PaymentStub';
import { SlotPicker } from '@/components/booking/SlotPicker';
import { bookingsApi, reviewsApi } from '@/api';
import { useActiveOtp, useBookingAction, useBookings } from '@/hooks';
import { useUIStore } from '@/store/uiStore';
import {
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_VARIANT,
  CANCELLABLE_BOOKING_STATUSES,
  CHAT_ELIGIBLE_BOOKING_STATUSES,
  UPCOMING_BOOKING_STATUSES,
} from '@/constants/bookingStatus';
import { refundFraction } from '@/utils/booking';
import { refundOutstandingStages } from '@/utils/refund';
import { formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { formatIstDate, formatIstDateTime, formatIstTime } from '@/utils/ist';
import type { Booking, BookingStatus } from '@/types';

// Ports of the app's MyBookings, BookingDetail (customer side), CancelBooking,
// RescheduleBooking and WriteReview screens. Paying a remaining balance stops
// at the payment placeholder; everything else is the real API.

const statusLabel = (s: BookingStatus) => BOOKING_STATUS_LABELS[s] ?? s.replace(/_/g, ' ');

function useBooking(id: string) {
  return useQuery({ queryKey: ['booking', id], queryFn: () => bookingsApi.getById(id).then((r) => r.data), enabled: !!id });
}

// ─── My Bookings ─────────────────────────────────────────────────────────────
const FILTERS: Record<string, BookingStatus[] | null> = {
  all: null,
  upcoming: UPCOMING_BOOKING_STATUSES,
  completed: [BOOKING_STATUS.SERVICE_COMPLETED, BOOKING_STATUS.COMPLETED],
  cancelled: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.EXPIRED],
};

export function BookingCard({ booking, onPress, perspective = 'customer' }: { booking: Booking; onPress: () => void; perspective?: 'customer' | 'artist' }) {
  const unpaid = booking.status === BOOKING_STATUS.PENDING && !booking.advancePaid;
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={styles.bookingCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{booking.serviceTitle}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {perspective === 'customer' ? `with ${booking.artistName}` : booking.customerName ?? 'Customer'}
          </Text>
        </View>
        <Badge label={statusLabel(booking.status)} variant={BOOKING_STATUS_VARIANT[booking.status]} />
      </View>
      <View style={styles.cardFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar-outline" size={14} color="#857374" />
          <Text style={styles.cardMeta}>{formatIstDateTime(booking.scheduledAt)}</Text>
        </View>
        <Text style={styles.cardPrice}>{formatPrice(booking.totalAmount || booking.amount)}</Text>
      </View>
      {unpaid && perspective === 'customer' && <Text style={styles.payPending}>Payment pending</Text>}
    </PressableScale>
  );
}

export function MyBookingsScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const { data, isLoading, error, refetch } = useBookings('customer');
  const bookings = useMemo(() => {
    const list = (data?.items ?? []) as Booking[];
    const statuses = FILTERS[filter];
    return statuses ? list.filter((b) => statuses.includes(b.status)) : list;
  }, [data, filter]);

  return (
    <Screen title="My Bookings">
      <Segmented
        options={[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Completed' },
          { key: 'cancelled', label: 'Cancelled' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        errorTitle="Could not load bookings"
        errorMessage={getErrorMessage(error)}
        onRetry={() => refetch()}
        empty={bookings.length === 0}
        emptyTitle="No bookings found"
        emptyMessage="When you book an artist, it shows up here."
        emptyIcon="calendar-outline"
      >
        {bookings.map((b) => (
          <BookingCard key={b.id} booking={b} onPress={() => navigate(`/bookings/${b.id}`)} />
        ))}
      </QueryState>
    </Screen>
  );
}

// ─── Booking detail ──────────────────────────────────────────────────────────
export function BookingDetailScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { data: booking, isLoading, error, refetch } = useBooking(id);
  const showOtp = !!booking && (booking.status === BOOKING_STATUS.CONFIRMED || booking.status === BOOKING_STATUS.IN_PROGRESS);
  const { data: otp } = useActiveOtp(id, showOtp);

  return (
    <Screen title="Booking Details">
      <QueryState isLoading={isLoading} error={error || (!isLoading && !booking)} errorTitle="Couldn't load this booking" errorMessage={getErrorMessage(error, 'It may have been removed.')} onRetry={() => refetch()}>
        {booking && (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.detailTitle}>{booking.serviceTitle}</Text>
                <Badge label={statusLabel(booking.status)} variant={BOOKING_STATUS_VARIANT[booking.status]} />
              </View>
              <InfoRow label="Artist" value={booking.artistName} />
              <InfoRow label="Date & Time" value={`${formatIstDate(booking.scheduledAt)} · ${formatIstTime(booking.scheduledAt)}`} />
              {!!booking.durationMin && <InfoRow label="Duration" value={`${booking.durationMin} mins`} />}
              <InfoRow label="Location" value={booking.locationType === 'STUDIO' ? 'At the studio' : booking.address || 'At your place'} />
              {booking.notes && <InfoRow label="Notes" value={booking.notes} />}
            </Card>

            {showOtp && otp?.otp && (
              <Card style={{ backgroundColor: '#fbf2ed', borderColor: '#efd9dc' }}>
                <SectionLabel style={{ marginTop: 0 }}>{otp.stage === 'completion' ? 'Completion code' : 'Start code'}</SectionLabel>
                <Text style={styles.otp}>{otp.otp}</Text>
                <Text style={styles.cardMeta}>Share this code with your artist {otp.stage === 'completion' ? 'when the service is done' : 'when they arrive'}.</Text>
              </Card>
            )}

            <SectionLabel>Billing Details</SectionLabel>
            <Card>
              <InfoRow label="Total Service Cost" value={formatPrice(booking.totalAmount)} />
              {!!booking.discountAmount && <InfoRow label={booking.discountLabel || 'Discount'} value={`− ${formatPrice(booking.discountAmount)}`} />}
              <InfoRow label="Advance Payment" value={booking.advancePaid ? `${formatPrice(booking.advanceAmount)} · Paid` : `${formatPrice(booking.advanceAmount)} · Not paid`} />
              <InfoRow label="Remaining" value={booking.finalPaid ? `${formatPrice(booking.remainingAmount)} · Paid` : formatPrice(booking.remainingAmount)} />
              {booking.payments?.some((p) => p.paymentType === 'REFUND' || p.status === 'REFUNDED') && <InfoRow label="Refund" value="Processing" />}
            </Card>

            <View style={{ gap: 10, marginTop: 6 }}>
              {booking.status === BOOKING_STATUS.PENDING && !booking.advancePaid && (
                <PrimaryButton title={`Pay Advance ${formatPrice(booking.advanceAmount)}`} onPress={() => navigate(`/bookings/${booking.id}/pay?stage=ADVANCE`)} />
              )}
              {booking.status === BOOKING_STATUS.SERVICE_COMPLETED && !booking.finalPaid && (
                <PrimaryButton title={`Pay Remaining ${formatPrice(booking.remainingAmount)}`} onPress={() => navigate(`/bookings/${booking.id}/pay?stage=FINAL`)} />
              )}
              {CHAT_ELIGIBLE_BOOKING_STATUSES.includes(booking.status) && (
                <PrimaryButton title="Message Artist" tone="ink" onPress={() => navigate(`/chat/${booking.id}`)} />
              )}
              {booking.status === BOOKING_STATUS.COMPLETED && (
                <PrimaryButton title="Write a Review" tone="ink" onPress={() => navigate(`/bookings/${booking.id}/review`)} />
              )}
              {booking.status === BOOKING_STATUS.CONFIRMED && (
                <Pressable onPress={() => navigate(`/bookings/${booking.id}/reschedule`)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Reschedule Booking</Text>
                </Pressable>
              )}
              {CANCELLABLE_BOOKING_STATUSES.includes(booking.status) && (
                <Pressable onPress={() => navigate(`/bookings/${booking.id}/cancel`)} style={styles.secondaryBtn}>
                  <Text style={{ ...styles.secondaryBtnText, color: '#ba1a1a' }}>Cancel Appointment</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </QueryState>
    </Screen>
  );
}

export function BookingPaymentScreen() {
  const { id = '' } = useParams();
  const { data: booking } = useBooking(id);
  const stage = new URLSearchParams(window.location.search).get('stage') === 'FINAL' ? 'FINAL' : 'ADVANCE';
  return (
    <PaymentStub
      title="Payment"
      amount={booking ? (stage === 'FINAL' ? booking.remainingAmount : booking.advanceAmount) : undefined}
      what={booking ? `${stage === 'FINAL' ? 'Remaining balance' : 'Advance'} · ${booking.serviceTitle}` : 'Booking payment'}
    />
  );
}

// ─── Cancel ──────────────────────────────────────────────────────────────────
const CANCEL_REASONS = ['Change of plans', 'Booked by mistake', 'Found another artist', 'Price too high', 'Other'];

export function CancelBookingScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const { data: booking, isLoading, error } = useBooking(id);
  const { cancel } = useBookingAction();
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [other, setOther] = useState('');

  const paid = (booking?.advancePaid ? booking.advanceAmount : 0) + (booking?.finalPaid ? booking.remainingAmount : 0);
  const fraction = booking ? refundFraction(booking.scheduledAt) : 0;
  const refund = Math.round(paid * fraction);

  const onCancel = () => {
    if (!booking) return;
    const text = reason === 'Other' ? other.trim() || 'Other' : reason;
    cancel.mutate(
      { id: booking.id, reason: text },
      {
        onSuccess: async () => {
          // Same as the app: ask the backend to refund whatever was paid.
          const results = await refundOutstandingStages(booking);
          qc.invalidateQueries({ queryKey: ['booking', booking.id] });
          const note = results.length ? ` ${results.map((r) => r.message).join(' · ')}` : '';
          showToast(`Booking cancelled.${note}`, 'success');
          navigate(`/bookings/${booking.id}`, { replace: true });
        },
        onError: (e) => showToast(getErrorMessage(e, 'Could not cancel. Please try again.'), 'error'),
      }
    );
  };

  return (
    <Screen
      title="Cancel Booking"
      footer={
        <>
          <PrimaryButton title="Cancel Booking" loading={cancel.isPending} disabled={!booking} onPress={onCancel} />
          <Pressable onPress={() => navigate(-1)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Keep Booking</Text>
          </Pressable>
        </>
      }
    >
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load this booking" errorMessage={getErrorMessage(error)}>
        {booking && (
          <>
            <SectionLabel>Why are you cancelling?</SectionLabel>
            <Card>
              {CANCEL_REASONS.map((r) => (
                <Pressable key={r} onPress={() => setReason(r)} style={styles.reasonRow}>
                  <Icon name={reason === r ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={reason === r ? '#884952' : '#d7c1c3'} />
                  <Text style={styles.reasonText}>{r}</Text>
                </Pressable>
              ))}
              {reason === 'Other' && <TextField placeholder="Tell us a little more" value={other} onChange={setOther} multiline maxLength={300} />}
            </Card>

            <SectionLabel>Refund Breakdown</SectionLabel>
            <Card>
              <InfoRow label="Total Paid" value={formatPrice(paid)} />
              <InfoRow label="Cancellation Penalty" value={formatPrice(paid - refund)} />
              <InfoRow label="Estimated Refund" value={formatPrice(refund)} strong />
            </Card>

            <SectionLabel>Cancellation Policy</SectionLabel>
            <Card>
              <Text style={styles.policy}>• 100% refund if cancelled more than 24 hours before the appointment.</Text>
              <Text style={styles.policy}>• 50% refund if cancelled between 12-24 hours.</Text>
              <Text style={styles.policy}>• No refund if cancelled less than 12 hours before the appointment.</Text>
            </Card>
          </>
        )}
      </QueryState>
    </Screen>
  );
}

// ─── Reschedule ──────────────────────────────────────────────────────────────
export function RescheduleBookingScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const showToast = useUIStore((s) => s.showToast);
  const { data: booking, isLoading, error } = useBooking(id);
  const { reschedule } = useBookingAction();
  const [start, setStart] = useState<string | null>(null);

  return (
    <Screen
      title="Reschedule"
      footer={
        <PrimaryButton
          title="Confirm Reschedule"
          disabled={!start}
          loading={reschedule.isPending}
          onPress={() =>
            booking &&
            start &&
            reschedule.mutate(
              { id: booking.id, newStartTime: start },
              {
                onSuccess: () => {
                  showToast('Booking rescheduled', 'success');
                  navigate(`/bookings/${booking.id}`, { replace: true });
                },
                onError: (e) => showToast(getErrorMessage(e, 'Could not reschedule. Please try again.'), 'error'),
              }
            )
          }
        />
      }
    >
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load this booking" errorMessage={getErrorMessage(error)}>
        {booking && (
          <>
            <Card>
              <InfoRow label="Currently" value={formatIstDateTime(booking.scheduledAt)} />
              <InfoRow label="Service" value={booking.serviceTitle} />
            </Card>
            <SlotPicker artistId={booking.artistId} durationMin={booking.durationMin || 60} value={start} onChange={setStart} />
          </>
        )}
      </QueryState>
    </Screen>
  );
}

// ─── Write a review ──────────────────────────────────────────────────────────
export function WriteReviewScreen() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const showToast = useUIStore((s) => s.showToast);
  const { data: booking } = useBooking(id);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const submit = useMutation({
    mutationFn: () => reviewsApi.create({ bookingId: id, artistId: booking!.artistId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      showToast('Thanks — your review is posted', 'success');
      navigate(`/bookings/${id}`, { replace: true });
    },
    onError: (e) => showToast(getErrorMessage(e, 'Could not post your review'), 'error'),
  });

  return (
    <Screen title="Review" footer={<PrimaryButton title="Post Review" disabled={!booking} loading={submit.isPending} onPress={() => submit.mutate()} />}>
      <Text style={styles.detailTitle}>How was {booking?.artistName ?? 'your artist'}?</Text>
      <View style={{ flexDirection: 'row', gap: 6, margin: '16px 0' }} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable key={i} onPress={() => setRating(i)} ariaLabel={`${i} star${i === 1 ? '' : 's'}`} scaleTo={0.85}>
            <Text style={{ fontSize: 36, color: i <= rating ? '#884952' : '#d7c1c3' }}>★</Text>
          </Pressable>
        ))}
      </View>
      <TextField label="Your review (optional)" placeholder="What did you love? What could be better?" value={comment} onChange={setComment} multiline maxLength={1000} />
    </Screen>
  );
}

const styles = sheet({
  bookingCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#efe6e2', padding: 16, marginBottom: 12, width: '100%', gap: 10 },
  cardTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 16, color: '#1e1b18' },
  cardMeta: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#884952' },
  payPending: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#92400E', textAlign: 'left' },
  detailTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1e1b18', flex: 1 },
  otp: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: 8, color: '#884952', marginBottom: 6 },
  secondaryBtn: { borderWidth: 1, borderColor: '#d7c1c3', borderRadius: 12, paddingVertical: 14, alignItems: 'center', width: '100%' },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1e1b18' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, width: '100%' },
  reasonText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 15, color: '#1e1b18' },
  policy: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: '#524344', lineHeight: 20 },
});

