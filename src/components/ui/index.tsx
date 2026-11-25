import React, { useEffect, type CSSProperties } from 'react';
import { sheet, cx } from '@/lib/rn';
import { useUIStore } from '@/store/uiStore';
import { Icon, type IconName } from './Icon';
import { PressableScale, Spinner, Text, View } from './primitives';

export * from './primitives';
export * from './Icon';
export * from './CitySearchInput';

// ─── Button ─── (frontend/src/components/ui/Button.tsx)
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  fullWidth = true,
  type = 'button',
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}) {
  const isDisabled = disabled || loading;
  const isLight = variant === 'secondary' || variant === 'outline' || variant === 'ghost';
  return (
    <PressableScale
      scaleTo={0.97}
      type={type}
      onPress={onPress}
      disabled={isDisabled}
      style={cx(buttonStyles.buttonBase, buttonStyles[variant], fullWidth && buttonStyles.fullWidth, isDisabled && buttonStyles.disabled)}
    >
      {loading ? (
        <Spinner color={isLight ? '#1e1b18' : '#ffffff'} />
      ) : (
        <Text style={cx(buttonStyles.textBase, buttonText[variant])}>{title}</Text>
      )}
    </PressableScale>
  );
}

const buttonStyles = sheet({
  buttonBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingVertical: 14, paddingHorizontal: 20 },
  primary: { backgroundColor: '#884952' },
  secondary: { borderWidth: 1, borderColor: '#1e1b18', backgroundColor: 'transparent' },
  accent: { backgroundColor: '#a5616a' },
  outline: { borderWidth: 1, borderColor: '#d7c1c3', backgroundColor: 'transparent' },
  ghost: { backgroundColor: 'transparent' },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },
  textBase: { fontSize: 15, textAlign: 'center' },
});
const buttonText = sheet({
  primary: { color: '#ffffff', fontFamily: 'HankenGrotesk_600SemiBold' },
  secondary: { color: '#1e1b18', fontFamily: 'HankenGrotesk_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 12 },
  accent: { color: '#ffffff', fontFamily: 'HankenGrotesk_600SemiBold' },
  outline: { color: '#1e1b18', fontFamily: 'HankenGrotesk_500Medium' },
  ghost: { color: '#884952', fontFamily: 'HankenGrotesk_600SemiBold' },
});

// ─── Badge ─── (frontend/src/components/ui/Badge.tsx)
const tones: Record<string, { bg: string; text: string; border?: string }> = {
  primary: { bg: 'rgba(136, 73, 82, 0.1)', text: '#884952' },
  success: { bg: 'rgba(21, 128, 61, 0.1)', text: '#15803D' },
  error: { bg: 'rgba(186, 26, 26, 0.1)', text: '#ba1a1a' },
  muted: { bg: '#fff8f5', text: '#524344', border: '#efe6e2' },
  elite: { bg: 'rgba(165, 97, 106, 0.15)', text: '#a5616a' },
  warning: { bg: 'rgba(217, 119, 6, 0.12)', text: '#b45309' },
};

export function Badge({ label, variant = 'primary' }: { label: string; variant?: keyof typeof tones }) {
  const tone = tones[variant] || tones.primary;
  return (
    <View
      style={cx(badgeStyles.container, { backgroundColor: tone.bg }, tone.border ? { border: `1px solid ${tone.border}` } : null)}
    >
      <Text style={cx(badgeStyles.text, { color: tone.text })}>{label}</Text>
    </View>
  );
}
const badgeStyles = sheet({
  container: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ─── StarRating ─── (read-only, as on the artist profile)
export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }} aria-label={`${value?.toFixed?.(1) ?? 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, margin: '0 1px', color: i <= Math.round(value || 0) ? '#884952' : '#d7c1c3' }}>
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── SkeletonLoader ───
export function SkeletonLoader({ height = 16, width = '100%', style }: { height?: number; width?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, width, borderRadius: 8, ...style }} />;
}

// ─── EmptyState ─── (frontend/src/components/ui/EmptyState.tsx)
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  iconName = 'sparkles-outline',
  iconColor = '#884952',
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: IconName;
  iconColor?: string;
}) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrapper}>
        <Icon name={iconName} size={40} color={iconColor} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      {message ? <Text style={emptyStyles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={emptyStyles.actionWrapper}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
const emptyStyles = sheet({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64 },
  iconWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(136, 73, 82, 0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'HankenGrotesk_700Bold', color: '#1e1b18', marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 14, fontFamily: 'HankenGrotesk_400Regular', color: '#857374', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  actionWrapper: { width: 192 },
});

// ─── Toast ─── (frontend/src/components/ui/Toast.tsx)
const TOAST_ICON: Record<'success' | 'error' | 'info', IconName> = {
  success: 'checkmark-circle',
  error: 'alert-circle-outline',
  info: 'sparkles-outline',
};
const TOAST_COLOR = { success: '#15803D', error: '#ba1a1a', info: '#884952' };

export function Toast() {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 3000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);
  if (!toast) return null;
  return (
    <div className="fade-down" style={toastStyles.wrap} role="status" key={toast.id}>
      <Icon name={TOAST_ICON[toast.type]} size={18} color={TOAST_COLOR[toast.type]} />
      <Text style={toastStyles.text} numberOfLines={2}>
        {toast.message}
      </Text>
    </div>
  );
}
const toastStyles = sheet({
  wrap: {
    position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', width: 'min(440px, calc(100% - 32px))', zIndex: 100,
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#efe6e2',
    shadowColor: '#1e1b18', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16,
  },
  text: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: '#1e1b18' },
});

// ─── Header bar used by stack screens (back arrow · title · spacer) ───
export function BackHeader({ title, onBack, right }: { title?: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={headerStyles.header}>
      <PressableScale onPress={onBack} style={headerStyles.iconButton} ariaLabel="Back">
        <Icon name="arrow-back" size={24} color="#1e1b18" />
      </PressableScale>
      <Text style={headerStyles.title} numberOfLines={1}>
        {title ?? ''}
      </Text>
      {right ?? <View style={headerStyles.iconButton} />}
    </View>
  );
}
const headerStyles = sheet({
  header: { height: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: '#fff8f5', zIndex: 10 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, color: '#1e1b18', textAlign: 'center', marginHorizontal: 8 },
});
