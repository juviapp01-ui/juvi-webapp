import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { sheet, cx, absoluteFill } from '@/lib/rn';
import { Icon, Img, PressableScale, Spinner, Text, View } from '@/components/ui';
import { useAuth } from '@/hooks';

import { LOGO, OTP_LENGTH } from '@/config/constants';
import { isValidOtp } from '@/utils/validation';
import { getErrorMessage } from '@/utils/errors';
import { useUIStore } from '@/store/uiStore';
import type { Role } from '@/types';

// Port of frontend/src/screens/auth/PhoneOtpVerifyScreen.tsx, including the
// one-real-input design: a single <input autocomplete="one-time-code"> holds
// the code and the six boxes only draw it, so browser / iOS "From Messages"
// autofill fills all six at once.
const RESEND_COOLDOWN_SECONDS = 120;

export default function PhoneOtpVerifyScreen() {
  const navigate = useNavigate();
  const state = useLocation().state as { phone?: string; role?: Role } | null;
  const phone = state?.phone;
  const role = state?.role ?? 'CUSTOMER';

  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { verifyPhoneOtp, sendPhoneOtp } = useAuth();
  const showToast = useUIStore((s) => s.showToast);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const valid = isValidOtp(otp, OTP_LENGTH);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Arrived without a number (a reload, a typed URL): start over.
  if (!phone) return <Navigate to="/login" replace />;

  const onVerify = () => {
    if (verifyPhoneOtp.isPending || !valid) return;
    setError(null);
    // Remembered before signing in: the moment the session is saved, the
    // sign-in page's guard moves on to profile setup, which reads this. The
    // login choice, not the server role — a brand-new user is always created
    // as CUSTOMER, which would hide that they chose Partner.
    sessionStorage.setItem('juvi.pendingRole', role);
    verifyPhoneOtp.mutate(otp, {
      onSuccess: (res) => {
        const user = (res.data as any)?.user ?? (res.data as any)?.data?.user;
        if (!user?.name) navigate('/setup', { replace: true, state: { role } });
        else navigate(user.role === 'ARTIST' ? '/partner' : '/home', { replace: true });
      },
      onError: (e) => setError(getErrorMessage(e, 'Invalid or expired code. Please try again.')),
    });
  };

  const onResend = () => {
    if (sendPhoneOtp.isPending || cooldown > 0) return;
    sendPhoneOtp.mutate(
      { phone },
      {
        onSuccess: () => {
          setCooldown(RESEND_COOLDOWN_SECONDS);
          showToast('Code resent to your phone', 'success');
        },
        onError: (e) => showToast(getErrorMessage(e, 'Could not resend code'), 'error'),
      }
    );
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <PressableScale onPress={() => navigate(-1)} style={styles.backButton} ariaLabel="Back">
          <Icon name="arrow-back" size={22} color="#1e1b18" />
        </PressableScale>
        <Img src={LOGO} fit="contain" lazy={false} alt="JUVI" style={{ width: 120, height: 120, marginBottom: 20 }} />
        <View style={styles.backButton} />
      </View>

      <form
        style={styles.scrollContent}
        onSubmit={(e) => {
          e.preventDefault();
          onVerify();
        }}
      >
        <View style={styles.content}>
          <div className="fade-down">
            <Text style={styles.heading}>Verify Identity</Text>
            <Text style={styles.subtitle}>Enter the {OTP_LENGTH}-digit code sent to</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
              <Text style={styles.phoneDisplay}>+91 {phone}</Text>
              <PressableScale onPress={() => navigate(-1)} style={{ marginLeft: 8, padding: 4 }} ariaLabel="Change number">
                <Icon name="pencil" size={16} color="#884952" />
              </PressableScale>
            </View>
          </div>

          <View style={styles.otpRow} onClick={() => inputRef.current?.focus()}>
            {Array.from({ length: OTP_LENGTH }, (_, index) => {
              const digit = otp[index] ?? '';
              const active = focused && index === Math.min(otp.length, OTP_LENGTH - 1);
              return (
                <div key={index} className="fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <View style={cx(styles.otpBox, (digit || active) && styles.otpBoxFilled)}>
                    <Text style={styles.otpDigit}>{digit}</Text>
                  </View>
                </div>
              );
            })}
            {/* The real input, invisible and laid over the boxes. */}
            <input
              ref={inputRef}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={OTP_LENGTH}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoFocus
              aria-label={`${OTP_LENGTH}-digit verification code`}
              style={styles.otpHiddenInput}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <PressableScale onPress={onResend} disabled={sendPhoneOtp.isPending || cooldown > 0} style={{ width: '100%' }}>
            <Text style={styles.resendText}>
              Didn't receive the code?{' '}
              <Text style={styles.resendLink}>
                {cooldown > 0
                  ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}`
                  : sendPhoneOtp.isPending
                    ? 'Sending...'
                    : 'Resend Code'}
              </Text>
            </Text>
          </PressableScale>
        </View>

        <View style={styles.bottomSection}>
          <PressableScale
            type="submit"
            disabled={!valid || verifyPhoneOtp.isPending}
            style={cx(styles.verifyButton, (!valid || verifyPhoneOtp.isPending) && styles.verifyButtonDisabled)}
          >
            {verifyPhoneOtp.isPending ? <Spinner color="#FFFFFF" /> : <Text style={styles.verifyButtonText}>VERIFY</Text>}
          </PressableScale>
        </View>
      </form>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  scrollContent: { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 8, paddingBottom: 16 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 32 },
  heading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: '#1e1b18', textAlign: 'center', marginBottom: 14 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#524344', textAlign: 'center', lineHeight: 20 },
  phoneDisplay: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1e1b18', textAlign: 'center', marginTop: 4 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28, position: 'relative' },
  otpBox: { width: 48, height: 56, borderWidth: 1, borderColor: '#efe6e2', borderRadius: 4, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  otpBoxFilled: { borderColor: '#884952' },
  otpDigit: { fontSize: 22, fontFamily: 'Inter_600SemiBold', color: '#1e1b18' },
  otpHiddenInput: { ...absoluteFill, width: '100%', height: '100%', opacity: 0.011, color: 'transparent', caretColor: 'transparent', fontSize: 16, border: 0, background: 'transparent', cursor: 'text' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: '#ba1a1a', textAlign: 'center', marginTop: -12, marginBottom: 20 },
  resendText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#524344', textAlign: 'center' },
  resendLink: { fontFamily: 'Inter_500Medium', color: '#884952', textDecorationLine: 'underline' },
  bottomSection: { paddingBottom: 32, paddingTop: 32 },
  verifyButton: { backgroundColor: '#884952', borderRadius: 4, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', width: '100%' },
  verifyButtonDisabled: { opacity: 0.4 },
  verifyButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF', letterSpacing: 2, textTransform: 'uppercase' },
});
