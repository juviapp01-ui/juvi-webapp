import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { sheet, cx } from '@/lib/rn';
import { BackHeader, EmptyState, SkeletonLoader } from './index';
import { Icon, type IconName } from './Icon';
import { Pressable, PressableScale, Spinner, Text, View } from './primitives';

// Shared building blocks for the account, booking and partner pages, in the
// app's look: cream page, white cards with the warm hairline border,
// Playfair headings, Hanken body text, uppercase Inter section labels.

export function Screen({
  title,
  onBack,
  right,
  children,
  footer,
  padded = true,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <View style={kit.safe}>
      <BackHeader title={title} onBack={onBack ?? (() => navigate(-1))} right={right} />
      <View style={cx(padded && kit.content, !!footer && { paddingBottom: 120 })}>{children}</View>
      {footer && <View style={kit.footer}>{footer}</View>}
    </View>
  );
}

// Loading / error / empty, in one place, the same everywhere.
export function QueryState({
  isLoading,
  error,
  empty,
  emptyTitle,
  emptyMessage,
  emptyIcon = 'sparkles-outline',
  onRetry,
  errorTitle = 'Something went wrong',
  errorMessage,
  skeleton = 3,
  children,
}: {
  isLoading: boolean;
  error?: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: IconName;
  onRetry?: () => void;
  errorTitle?: string;
  errorMessage?: string;
  skeleton?: number;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <View style={{ gap: 12 }}>
        {Array.from({ length: skeleton }, (_, i) => (
          <SkeletonLoader key={i} height={84} style={{ borderRadius: 16 }} />
        ))}
      </View>
    );
  }
  if (error) {
    return <EmptyState title={errorTitle} message={errorMessage} iconName="alert-circle-outline" iconColor="#C0392B" actionLabel={onRetry ? 'Retry' : undefined} onAction={onRetry} />;
  }
  if (empty) return <EmptyState title={emptyTitle ?? 'Nothing here yet'} message={emptyMessage} iconName={emptyIcon} iconColor="#857374" />;
  return <>{children}</>;
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <View style={cx(kit.card, style)}>{children}</View>;
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text style={cx(kit.sectionLabel, style)}>{children}</Text>;
}

export function Heading({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text style={cx(kit.heading, style)}>{children}</Text>;
}

export function MenuRow({
  icon,
  label,
  sublabel,
  onPress,
  right,
  danger,
  last,
}: {
  icon?: IconName;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={cx(kit.menuRow, last && { borderBottomWidth: 0 })}>
      {icon && (
        <View style={cx(kit.menuIcon, danger && { backgroundColor: 'rgba(186, 26, 26, 0.08)' })}>
          <Icon name={icon} size={18} color={danger ? '#ba1a1a' : '#884952'} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Text style={cx(kit.menuLabel, danger && { color: '#ba1a1a' })}>{label}</Text>
        {sublabel && <Text style={kit.menuSub}>{sublabel}</Text>}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={16} color="#d7c1c3" /> : null)}
    </Pressable>
  );
}

export function InfoRow({ label, value, strong, style }: { label: string; value: ReactNode; strong?: boolean; style?: CSSProperties }) {
  return (
    <View style={cx(kit.infoRow, style)}>
      <Text style={kit.infoLabel}>{label}</Text>
      <Text style={cx(kit.infoValue, strong && kit.infoValueStrong)}>{value}</Text>
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = 'text',
  inputMode,
  maxLength,
  autoComplete,
  error,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'search';
  maxLength?: number;
  autoComplete?: string;
  error?: string | null;
  disabled?: boolean;
}) {
  const common = {
    className: 'rn-input',
    value,
    placeholder,
    maxLength,
    disabled,
    'aria-label': label ?? placeholder,
    style: kit.input,
  };
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={kit.inputLabel}>{label}</Text>}
      {multiline ? (
        <textarea {...common} rows={4} onChange={(e) => onChange(e.target.value)} style={{ ...kit.input, resize: 'vertical', minHeight: 96 }} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <Text style={kit.fieldError}>{error}</Text>}
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={kit.segment}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={cx(kit.segmentItem, value === o.key && kit.segmentItemOn)}>
          <Text style={cx(kit.segmentText, value === o.key && kit.segmentTextOn)}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, loading, tone = 'rose' }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; tone?: 'rose' | 'ink' }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={cx(kit.primaryBtn, tone === 'ink' && { backgroundColor: '#1e1b18' }, (disabled || loading) && { opacity: 0.4 })}
    >
      {loading ? <Spinner color="#FFFFFF" /> : <Text style={kit.primaryBtnText}>{title}</Text>}
    </PressableScale>
  );
}

export const kit = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  footer: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 30,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#efe6e2', backgroundColor: '#FFFFFF', gap: 8,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#efe6e2', padding: 16, marginBottom: 14 },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#857374', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
  heading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#1e1b18', marginBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f6eeeb', width: '100%' },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(136, 73, 82, 0.08)', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  menuSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12.5, color: '#857374', marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 6 },
  infoLabel: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#524344' },
  infoValue: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: '#1e1b18', textAlign: 'right' },
  infoValueStrong: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 16, color: '#884952' },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#524344', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.4)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'HankenGrotesk_400Regular', color: '#1e1b18',
  },
  fieldError: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: '#ba1a1a', marginTop: 6 },
  segment: { flexDirection: 'row', backgroundColor: '#f6eeeb', borderRadius: 12, padding: 4, marginBottom: 16 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segmentItemOn: { backgroundColor: '#FFFFFF' },
  segmentText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#827378' },
  segmentTextOn: { color: '#1e1b18' },
  primaryBtn: { backgroundColor: '#884952', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', width: '100%' },
  primaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF', letterSpacing: 1.2 },
});
