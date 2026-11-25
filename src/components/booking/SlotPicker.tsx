import { useEffect, useMemo, useState } from 'react';
import { sheet, cx } from '@/lib/rn';
import { EmptyState, HScroll, PressableScale, SkeletonLoader, Text, View } from '@/components/ui';
import { useAvailableDays, useSlots } from '@/hooks';
import { getErrorMessage } from '@/utils/errors';
import { formatIstTime, istDayjs, istToday } from '@/utils/ist';

// Port of the app's TimeSlotPicker: a strip of the next 30 days (days with
// no openings greyed out), then the open start times for the chosen day.
// Both come from the server's live slot calculation (hours, blocked time,
// other bookings), so nothing here decides availability.
const DAYS = 30;

export function SlotPicker({ artistId, durationMin, value, onChange }: { artistId: string; durationMin: number; value: string | null; onChange: (startIso: string | null) => void }) {
  const today = istToday();
  const { data: summary, isLoading: daysLoading, error: daysError } = useAvailableDays(artistId, today, DAYS, durationMin);
  const days = useMemo(() => summary?.days ?? [], [summary]);
  const [date, setDate] = useState<string | null>(null);

  // Start on the first day that has an opening.
  useEffect(() => {
    if (!date && days.length) setDate(days.find((d) => d.count > 0)?.date ?? days[0].date);
  }, [days, date]);

  const { data: slots = [], isLoading: slotsLoading, error: slotsError } = useSlots(artistId, date ?? '', durationMin);

  if (summary?.paused) {
    return (
      <EmptyState
        title="Not taking new bookings"
        message={summary.pausedUntil ? `This artist is back on ${istDayjs(summary.pausedUntil).format('ddd, D MMM')}.` : 'This artist has paused bookings for now.'}
        iconName="pause-circle-outline"
        iconColor="#92400E"
      />
    );
  }
  if (daysError) return <EmptyState title="Couldn't load dates" message={getErrorMessage(daysError)} iconName="alert-circle-outline" iconColor="#C0392B" />;

  return (
    <View>
      <Text style={styles.label}>SELECT DATE</Text>
      {daysLoading ? (
        <SkeletonLoader height={72} style={{ borderRadius: 16, marginBottom: 20 }} />
      ) : (
        <HScroll contentStyle={styles.dayRow}>
          {days.map((d) => {
            const day = istDayjs(`${d.date}T12:00:00+05:30`);
            const active = d.date === date;
            const empty = d.count === 0;
            return (
              <PressableScale
                key={d.date}
                onPress={() => {
                  setDate(d.date);
                  onChange(null);
                }}
                disabled={empty}
                style={cx(styles.dayChip, active && styles.dayChipActive, empty && styles.dayChipEmpty)}
                ariaLabel={`${day.format('dddd D MMMM')}${empty ? ', no openings' : `, ${d.count} openings`}`}
              >
                <Text style={cx(styles.dayWeek, active && styles.onActive)}>{day.format('ddd')}</Text>
                <Text style={cx(styles.dayNum, active && styles.onActive)}>{day.format('D')}</Text>
                <Text style={cx(styles.dayMonth, active && styles.onActive)}>{day.format('MMM')}</Text>
              </PressableScale>
            );
          })}
        </HScroll>
      )}

      <Text style={styles.label}>SELECT TIME</Text>
      {!date || slotsLoading ? (
        <SkeletonLoader height={96} style={{ borderRadius: 16 }} />
      ) : slotsError ? (
        <EmptyState title="Couldn't load times" message={getErrorMessage(slotsError)} iconName="alert-circle-outline" iconColor="#C0392B" />
      ) : slots.length === 0 ? (
        <Text style={styles.noSlots}>No openings on this day — pick another date.</Text>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {slots.map((s) => {
            const active = value === s.startTime;
            return (
              <PressableScale key={s.startTime} onPress={() => onChange(s.startTime)} style={cx(styles.slot, active && styles.slotActive)}>
                <Text style={cx(styles.slotText, active && styles.onActive)}>{formatIstTime(s.startTime)}</Text>
              </PressableScale>
            );
          })}
        </div>
      )}
    </View>
  );
}

const styles = sheet({
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#524344', letterSpacing: 1.5, marginBottom: 10, marginTop: 6 },
  dayRow: { gap: 10, paddingBottom: 20 },
  dayChip: { width: 62, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF', alignItems: 'center', gap: 2 },
  dayChipActive: { backgroundColor: '#884952', borderColor: '#884952' },
  dayChipEmpty: { opacity: 0.4 },
  dayWeek: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#857374' },
  dayNum: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1e1b18' },
  dayMonth: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#857374', textTransform: 'uppercase' },
  onActive: { color: '#FFFFFF' },
  slot: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#efe6e2', backgroundColor: '#FFFFFF', alignItems: 'center' },
  slotActive: { backgroundColor: '#884952', borderColor: '#884952' },
  slotText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1e1b18' },
  noSlots: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#857374', paddingVertical: 16 },
});
