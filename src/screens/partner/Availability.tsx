import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { sheet, cx } from '@/lib/rn';
import { Icon, Pressable, Text, View } from '@/components/ui';
import { Card, PrimaryButton, QueryState, Screen, SectionLabel, TextField } from '@/components/ui/kit';
import { bookingsApi, type AvailabilityDay, type TimeBlock } from '@/api';
import { useUIStore } from '@/store/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { istDayjs } from '@/utils/ist';
import { END_TIMES, START_TIMES, WEEKDAYS, formatHHMM, minutesOfHHMM, summarizeDays } from '@/utils/availability';
import {
  BLOCK_FROM_TIMES,
  BLOCK_TO_TIMES,
  blockInvalidReason,
  buildBlockPayload,
  describeBlockSelection,
  emptyBlockSelection,
  isBlockEndDisabled,
  istNow,
  selectBlockDay,
  selectBlockEnd,
  selectBlockStart,
  setBlockWholeDay,
  type BlockSelection,
} from '@/utils/blockTime';

// Port of the app's AvailabilityScreen: weekly working hours (same every day,
// or per day with split shifts), pausing new bookings, and blocking time.
// Block time uses the same rules as the app (utils/blockTime.ts, copied as
// is): dates and times are India time, whole-day ranges, and always-visible
// From/To time chips.

type Window = { start: string; end: string };
type Week = Record<number, Window[]>;
const emptyWeek = (): Week => Object.fromEntries(WEEKDAYS.map((d) => [d.num, []])) as unknown as Week;

const weekFromRows = (rows: AvailabilityDay[]): Week => {
  const week = emptyWeek();
  for (const r of rows) {
    if (!r.isAvailable || week[r.dayOfWeek] === undefined) continue;
    week[r.dayOfWeek].push({ start: r.startTime, end: r.endTime });
  }
  for (const d of WEEKDAYS) week[d.num].sort((a, b) => minutesOfHHMM(a.start) - minutesOfHHMM(b.start));
  return week;
};

const uniformWindow = (week: Week): Window | null => {
  let found: Window | null = null;
  for (const d of WEEKDAYS) {
    const w = week[d.num];
    if (w.length === 0) continue;
    if (w.length > 1) return null;
    if (found && (found.start !== w[0].start || found.end !== w[0].end)) return null;
    found = w[0];
  }
  return found;
};

function TimeSelect({ value, options, onChange, label }: { value: string | null; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label={label} style={selectStyle}>
      <option value="" disabled>
        {label}
      </option>
      {options.map((t) => (
        <option key={t} value={t}>
          {formatHHMM(t)}
        </option>
      ))}
    </select>
  );
}

export function AvailabilityScreen() {
  const showToast = useUIStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingDefault, setUsingDefault] = useState(false);
  const [perDay, setPerDay] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [week, setWeek] = useState<Week>(emptyWeek());
  const [dirty, setDirty] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);
  const [pauseSheet, setPauseSheet] = useState(false);
  const [pauseUntilDate, setPauseUntilDate] = useState<string | null>(null);
  const [savingPause, setSavingPause] = useState(false);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [blockOpen, setBlockOpen] = useState(false);
  const [block, setBlock] = useState<BlockSelection>(emptyBlockSelection());
  const [blockError, setBlockError] = useState<string | null>(null);
  const [savingBlock, setSavingBlock] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [{ data: av }, { data: bl }] = await Promise.all([bookingsApi.getMyAvailability(), bookingsApi.getMyBlocks()]);
      const defaults = av.defaultHours ?? null;
      const isDefault = !!av.usingDefaultHours;
      setUsingDefault(isDefault);
      if (isDefault && defaults) {
        setPerDay(false);
        setDays(defaults.days);
        setStart(defaults.startTime);
        setEnd(defaults.endTime);
        const w = emptyWeek();
        for (const d of defaults.days) w[d] = [{ start: defaults.startTime, end: defaults.endTime }];
        setWeek(w);
      } else {
        const w = weekFromRows(av.availability ?? []);
        setWeek(w);
        const uniform = uniformWindow(w);
        const workDays = WEEKDAYS.filter((d) => w[d.num].length > 0).map((d) => d.num);
        if (uniform || workDays.length === 0) {
          setPerDay(false);
          setDays(workDays);
          setStart(uniform?.start ?? defaults?.startTime ?? null);
          setEnd(uniform?.end ?? defaults?.endTime ?? null);
        } else {
          // Split shifts or different hours per day: keep them as they are.
          setPerDay(true);
        }
      }
      setPaused(!!av.paused);
      setPausedUntil(av.pausedUntil ?? null);
      setBlocks(bl.blocks ?? []);
      setDirty(false);
    } catch (e) {
      setLoadError(getErrorMessage(e, 'Could not load your availability'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Leaving with unsaved hours: the browser asks first.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };
  const setDayWindows = (num: number, windows: Window[]) => {
    setWeek((w) => ({ ...w, [num]: windows.sort((a, b) => minutesOfHHMM(a.start) - minutesOfHHMM(b.start)) }));
    setDirty(true);
  };

  const switchMode = (toPerDay: boolean) => {
    if (toPerDay === perDay) return;
    if (toPerDay) {
      // Start the per-day editor from the simple settings.
      const w = emptyWeek();
      if (start && end) for (const d of days) w[d] = [{ start, end }];
      setWeek(w);
    } else {
      const uniform = uniformWindow(week);
      const workDays = WEEKDAYS.filter((d) => week[d.num].length > 0).map((d) => d.num);
      setDays(workDays);
      const first = WEEKDAYS.map((d) => week[d.num][0]).find(Boolean);
      setStart(uniform?.start ?? first?.start ?? start);
      setEnd(uniform?.end ?? first?.end ?? end);
    }
    setPerDay(toPerDay);
    setDirty(true);
  };

  const saveHours = async () => {
    let payload: AvailabilityDay[];
    if (perDay) {
      for (const d of WEEKDAYS) {
        const ws = week[d.num];
        for (let i = 0; i < ws.length; i++) {
          if (minutesOfHHMM(ws[i].end) <= minutesOfHHMM(ws[i].start)) return showToast(`${d.name}: end time must be after the start time`, 'error');
          if (i > 0 && minutesOfHHMM(ws[i].start) < minutesOfHHMM(ws[i - 1].end)) return showToast(`${d.name}: two time ranges overlap`, 'error');
        }
      }
      payload = WEEKDAYS.flatMap((d) => week[d.num].map((w) => ({ dayOfWeek: d.num, startTime: w.start, endTime: w.end, isAvailable: true })));
    } else {
      if (days.length > 0 && (!start || !end)) return showToast('Choose your start and end time', 'error');
      if (start && end && minutesOfHHMM(end) <= minutesOfHHMM(start)) return showToast('End time must be after the start time', 'error');
      payload = days.map((d) => ({ dayOfWeek: d, startTime: start!, endTime: end!, isAvailable: true }));
    }
    if (payload.length === 0 && !window.confirm('No working days? Customers won’t be able to book you at all until you add hours again.')) return;
    setSavingHours(true);
    try {
      await bookingsApi.setAvailability(payload);
      setUsingDefault(false);
      setDirty(false);
      showToast('Working hours saved — customers see them now', 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save your hours'), 'error');
    } finally {
      setSavingHours(false);
    }
  };

  const savePause = async (pause: boolean, until?: string | null) => {
    setSavingPause(true);
    try {
      const { data } = await bookingsApi.setPause(pause, until ?? undefined);
      setPaused(data.paused);
      setPausedUntil(data.pausedUntil);
      setPauseSheet(false);
      showToast(data.paused ? (data.pausedUntil ? `Bookings paused until ${dayjs(data.pausedUntil).format('D MMM')}` : 'Bookings paused') : 'You’re taking bookings again', 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not update that'), 'error');
    } finally {
      setSavingPause(false);
    }
  };

  const updateBlock = (change: (sel: BlockSelection) => BlockSelection) => {
    setBlockError(null);
    setBlock((sel) => change(sel));
  };
  const saveBlock = async () => {
    const invalid = blockInvalidReason(block);
    if (invalid) return setBlockError(invalid);
    setSavingBlock(true);
    try {
      const { data } = await bookingsApi.addBlock(buildBlockPayload(block));
      setBlocks((prev) => [...prev, data.block].sort((a, b) => (a.startTime < b.startTime ? -1 : 1)));
      setBlockOpen(false);
      showToast('Time blocked — customers can’t book it', 'success');
    } catch (e) {
      setBlockError(getErrorMessage(e, 'Couldn’t block that time. Please try again.'));
    } finally {
      setSavingBlock(false);
    }
  };
  const removeBlock = async (b: TimeBlock) => {
    setRemovingId(b.id);
    try {
      if (b.kind === 'dayOff') await bookingsApi.removeDayOff(b.id);
      else await bookingsApi.removeBlock(b.id);
      setBlocks((prev) => prev.filter((x) => x.id !== b.id));
      showToast('Unblocked — customers can book that time again', 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not remove that'), 'error');
    } finally {
      setRemovingId(null);
    }
  };
  const describeBlock = (b: TimeBlock) => {
    const s = istDayjs(b.startTime);
    const day = s.format('ddd, D MMM');
    if (b.allDay) {
      const last = istDayjs(b.endTime).subtract(1, 'minute');
      return last.isSame(s, 'day') ? { day, time: 'All day' } : { day: `${day} – ${last.format('ddd, D MMM')}`, time: `All day · ${last.diff(s.startOf('day'), 'day') + 1} days` };
    }
    const e = istDayjs(b.endTime);
    const endLabel = e.isSame(s.add(1, 'day').startOf('day')) ? '12:00 AM (midnight)' : e.format('h:mm A');
    return { day, time: `${s.format('h:mm A')} – ${endLabel}` };
  };

  const summary = useMemo(() => {
    if (perDay) {
      const workDays = WEEKDAYS.filter((d) => week[d.num].length > 0);
      return workDays.length === 0 ? 'No working days set' : `${summarizeDays(workDays.map((d) => d.num))}, hours vary by day`;
    }
    if (days.length === 0 || !start || !end) return 'No working days set';
    return `${summarizeDays(days)}, ${formatHHMM(start)} – ${formatHHMM(end)}`;
  }, [perDay, week, days, start, end]);

  // Calendar for Block time: this month and the next two, India dates.
  const today = istNow().date;
  const months = useMemo(() => [0, 1, 2].map((i) => dayjs(today).startOf('month').add(i, 'month')), [today]);
  const [monthIdx, setMonthIdx] = useState(0);
  const month = months[monthIdx];
  const inRange = (d: string) => !!block.date && (d === block.date || (!!block.endDate && d > block.date && d <= block.endDate));

  return (
    <Screen
      title="Availability"
      footer={dirty ? <PrimaryButton title="Save Working Hours" loading={savingHours} onPress={saveHours} /> : undefined}
    >
      <QueryState isLoading={loading} error={loadError} errorTitle="Couldn't load your availability" errorMessage={loadError ?? undefined} onRetry={() => { setLoading(true); loadAll(); }}>
        {/* Taking bookings */}
        <Card style={paused ? { backgroundColor: '#FFF4E5', borderColor: '#F5D9A8' } : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name={paused ? 'pause-circle-outline' : 'checkmark-circle-outline'} size={24} color={paused ? '#92400E' : '#2E7D32'} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.label}>{paused ? 'Bookings paused' : 'Taking bookings'}</Text>
              <Text style={styles.sub}>{paused ? (pausedUntil ? `Back on ${dayjs(pausedUntil).format('ddd, D MMM')}` : 'Until you turn them back on') : 'Customers can book your open times'}</Text>
            </View>
            <Pressable
              onPress={() => (paused ? savePause(false) : (setPauseUntilDate(null), setPauseSheet(true)))}
              disabled={savingPause}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>{paused ? 'Resume' : 'Pause'}</Text>
            </Pressable>
          </View>
          {pauseSheet && !paused && (
            <View style={{ marginTop: 14, gap: 10 }}>
              <Pressable onPress={() => setPauseUntilDate(null)} style={styles.option}>
                <Icon name={pauseUntilDate === null ? 'radio-button-on' : 'radio-button-off'} size={18} color="#884952" />
                <Text style={styles.optionText}>Until I turn them back on</Text>
              </Pressable>
              <Pressable onPress={() => setPauseUntilDate(pauseUntilDate ?? dayjs(today).add(1, 'day').format('YYYY-MM-DD'))} style={styles.option}>
                <Icon name={pauseUntilDate !== null ? 'radio-button-on' : 'radio-button-off'} size={18} color="#884952" />
                <Text style={styles.optionText}>Until a date</Text>
              </Pressable>
              {pauseUntilDate !== null && (
                <input
                  type="date"
                  value={pauseUntilDate}
                  min={dayjs(today).add(1, 'day').format('YYYY-MM-DD')}
                  onChange={(e) => e.target.value && setPauseUntilDate(e.target.value)}
                  aria-label="Back on"
                  style={selectStyle}
                />
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Cancel" tone="ink" onPress={() => setPauseSheet(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Pause Bookings" loading={savingPause} onPress={() => savePause(true, pauseUntilDate)} />
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Working hours */}
        <SectionLabel>Working hours</SectionLabel>
        <Text style={{ ...styles.sub, marginBottom: 10 }}>
          {summary}
          {usingDefault ? ' (JUVI’s default hours — save to make them yours)' : ''}
        </Text>
        <View style={styles.modeRow} role="tablist">
          {[
            [false, 'Same every day'],
            [true, 'Different by day'],
          ].map(([v, l]) => (
            <Pressable key={String(v)} onPress={() => switchMode(v as boolean)} style={cx(styles.mode, perDay === v && styles.modeOn)}>
              <Text style={cx(styles.modeText, perDay === v && { color: '#FFFFFF' })}>{l as string}</Text>
            </Pressable>
          ))}
        </View>

        {!perDay ? (
          <Card>
            <Text style={styles.fieldLabel}>DAYS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.num);
                return (
                  <Pressable key={d.num} onPress={() => edit(setDays)(on ? days.filter((x) => x !== d.num) : [...days, d.num])} style={cx(styles.dayChip, on && styles.chipOn)} ariaLabel={`${d.name}${on ? ', working' : ''}`}>
                    <Text style={cx(styles.chipText, on && { color: '#FFFFFF' })}>{d.short}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FROM</Text>
                <TimeSelect label="Start time" value={start} options={START_TIMES} onChange={edit(setStart)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TO</Text>
                <TimeSelect label="End time" value={end} options={END_TIMES} onChange={edit(setEnd)} />
              </View>
            </View>
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {WEEKDAYS.map((d, i) => {
              const ws = week[d.num];
              return (
                <View key={d.num} style={cx(styles.dayRow, i === WEEKDAYS.length - 1 && { borderBottomWidth: 0 })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.label}>{d.name}</Text>
                    <Pressable
                      onPress={() => setDayWindows(d.num, ws.length ? [] : [{ start: start ?? '10:00', end: end ?? '19:00' }])}
                      style={styles.smallBtn}
                    >
                      <Text style={styles.smallBtnText}>{ws.length ? 'Day off' : 'Add hours'}</Text>
                    </Pressable>
                  </View>
                  {ws.map((w, wi) => (
                    <View key={wi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <View style={{ flex: 1 }}>
                        <TimeSelect label="From" value={w.start} options={START_TIMES} onChange={(v) => setDayWindows(d.num, ws.map((x, xi) => (xi === wi ? { ...x, start: v } : x)))} />
                      </View>
                      <Text style={styles.sub}>to</Text>
                      <View style={{ flex: 1 }}>
                        <TimeSelect label="To" value={w.end} options={END_TIMES} onChange={(v) => setDayWindows(d.num, ws.map((x, xi) => (xi === wi ? { ...x, end: v } : x)))} />
                      </View>
                      <Pressable onPress={() => setDayWindows(d.num, ws.filter((_, xi) => xi !== wi))} ariaLabel="Remove these hours">
                        <Icon name="close-circle" size={22} color="#d7c1c3" />
                      </Pressable>
                    </View>
                  ))}
                  {ws.length > 0 && (
                    <Pressable
                      onPress={() => {
                        const last = ws[ws.length - 1];
                        const s = Math.min(minutesOfHHMM(last.end) + 60, 22 * 60);
                        const startT = START_TIMES.find((t) => minutesOfHHMM(t) >= s) ?? '22:00';
                        const endT = END_TIMES.find((t) => minutesOfHHMM(t) >= minutesOfHHMM(startT) + 120) ?? '24:00';
                        setDayWindows(d.num, [...ws, { start: startT, end: endT }]);
                      }}
                      style={{ marginTop: 8, alignSelf: 'flex-start' }}
                    >
                      <Text style={styles.link}>+ Add another time</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        {/* Blocked time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <SectionLabel>Blocked time</SectionLabel>
          {!blockOpen && (
            <Pressable
              onPress={() => {
                setBlock(emptyBlockSelection());
                setBlockError(null);
                setMonthIdx(0);
                setBlockOpen(true);
              }}
            >
              <Text style={styles.link}>+ Block time</Text>
            </Pressable>
          )}
        </View>

        {blockOpen && (
          <Card>
            <Text style={styles.label}>Block time</Text>
            <Text style={{ ...styles.sub, marginBottom: 12 }}>Customers can’t book you during blocked time. India time (IST).</Text>
            <View style={styles.modeRow}>
              {[
                [true, 'Whole day'],
                [false, 'Part of the day'],
              ].map(([v, l]) => (
                <Pressable key={String(v)} onPress={() => updateBlock((s) => setBlockWholeDay(s, v as boolean))} style={cx(styles.mode, block.wholeDay === v && styles.modeOn)}>
                  <Text style={cx(styles.modeText, block.wholeDay === v && { color: '#FFFFFF' })}>{l as string}</Text>
                </Pressable>
              ))}
            </View>
            {block.wholeDay && <Text style={{ ...styles.sub, marginBottom: 8 }}>Tap a day. Tap a later day to block a range.</Text>}

            {/* Month calendar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Pressable onPress={() => setMonthIdx((i) => Math.max(0, i - 1))} disabled={monthIdx === 0} ariaLabel="Previous month">
                <Icon name="chevron-back" size={20} color={monthIdx === 0 ? '#d7c1c3' : '#1e1b18'} />
              </Pressable>
              <Text style={styles.label}>{month.format('MMMM YYYY')}</Text>
              <Pressable onPress={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))} disabled={monthIdx === months.length - 1} ariaLabel="Next month">
                <Icon name="chevron-forward" size={20} color={monthIdx === months.length - 1 ? '#d7c1c3' : '#1e1b18'} />
              </Pressable>
            </View>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
                <span key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#A8A29E', padding: '4px 0' }}>{w}</span>
              ))}
              {Array.from({ length: month.day() }, (_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: month.daysInMonth() }, (_, i) => {
                const d = month.date(i + 1).format('YYYY-MM-DD');
                const past = d < today;
                const on = inRange(d);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={past}
                    onClick={() => updateBlock((s) => selectBlockDay(s, d))}
                    aria-pressed={on}
                    aria-label={dayjs(d).format('dddd D MMMM')}
                    style={{ height: 38, borderRadius: 10, border: 0, cursor: past ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: on ? 700 : 500, background: on ? '#884952' : d === today ? '#fbf2ed' : 'transparent', color: on ? '#FFFFFF' : past ? '#d7c1c3' : '#1e1b18' }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {!block.wholeDay && (
              <>
                <Text style={{ ...styles.fieldLabel, marginTop: 14 }}>FROM</Text>
                <div style={chipGrid}>
                  {BLOCK_FROM_TIMES.map((t) => {
                    const on = block.start === t;
                    return (
                      <button key={t} type="button" onClick={() => updateBlock((s) => selectBlockStart(s, t))} aria-pressed={on} style={chipStyle(on, false)}>
                        {formatHHMM(t)}
                      </button>
                    );
                  })}
                </div>
                <Text style={{ ...styles.fieldLabel, marginTop: 14 }}>TO</Text>
                <div style={chipGrid}>
                  {BLOCK_TO_TIMES.map((t) => {
                    const on = block.end === t;
                    const off = isBlockEndDisabled(block, t);
                    return (
                      <button key={t} type="button" disabled={off} onClick={() => updateBlock((s) => selectBlockEnd(s, t))} aria-pressed={on} style={chipStyle(on, off)}>
                        {t === '24:00' ? 'Midnight' : formatHHMM(t)}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <View style={{ marginTop: 14 }}>
              <TextField label="REASON (OPTIONAL)" value={block.reason} onChange={(v) => updateBlock((s) => ({ ...s, reason: v }))} placeholder="Wedding, travel…" maxLength={120} />
            </View>
            {describeBlockSelection(block) && <Text style={{ ...styles.label, marginTop: 12 }}>{describeBlockSelection(block)}</Text>}
            {(blockError || blockInvalidReason(block)) && <Text style={{ ...styles.sub, color: blockError ? '#B91C1C' : '#857374', marginTop: 6 }}>{blockError || blockInvalidReason(block)}</Text>}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Cancel" tone="ink" onPress={() => !savingBlock && setBlockOpen(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Block" disabled={!!blockInvalidReason(block)} loading={savingBlock} onPress={saveBlock} />
              </View>
            </View>
          </Card>
        )}

        {blocks.length === 0 ? (
          !blockOpen && <Text style={styles.sub}>Nothing blocked. Block a day off, a trip, or a few hours.</Text>
        ) : (
          <Card style={{ padding: 0 }}>
            {blocks.map((b, i) => {
              const d = describeBlock(b);
              return (
                <View key={b.id} style={cx(styles.blockRow, i === blocks.length - 1 && { borderBottomWidth: 0 })}>
                  <Icon name="ban-outline" size={18} color="#884952" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.label}>{d.day}</Text>
                    <Text style={styles.sub}>
                      {d.time}
                      {b.reason ? ` · ${b.reason}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeBlock(b)} disabled={removingId === b.id} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>{removingId === b.id ? '…' : 'Unblock'}</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
      </QueryState>
    </Screen>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 12px', borderRadius: 12, border: '1px solid #e8dcd8', background: '#FFFFFF',
  fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1e1b18',
};
const chipGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 };
const chipStyle = (on: boolean, off: boolean): React.CSSProperties => ({
  padding: '9px 4px', borderRadius: 10, border: `1px solid ${on ? '#884952' : '#efe6e2'}`, background: on ? '#884952' : '#FFFFFF',
  color: on ? '#FFFFFF' : off ? '#d7c1c3' : '#1e1b18', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, cursor: off ? 'default' : 'pointer',
});

const styles = sheet({
  label: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374', lineHeight: 19 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#524344', letterSpacing: 1.5, marginBottom: 8 },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  smallBtn: { borderWidth: 1, borderColor: '#d7c1c3', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  smallBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: '#1e1b18' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  optionText: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 14, color: '#1e1b18' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mode: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#d7c1c3', alignItems: 'center', backgroundColor: '#FFFFFF' },
  modeOn: { backgroundColor: '#884952', borderColor: '#884952' },
  modeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#524344' },
  dayChip: { width: 52, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#efe6e2', alignItems: 'center', backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: '#884952', borderColor: '#884952' },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1e1b18' },
  dayRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3ece8' },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3ece8' },
});
