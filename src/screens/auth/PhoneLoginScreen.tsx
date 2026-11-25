import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sheet, cx } from '@/lib/rn';
import { Img, PressableScale, Spinner, Text, View } from '@/components/ui';
import { useAuth } from '@/hooks';

import { LOGO } from '@/config/constants';
import { persist, Keys } from '@/utils/storage';
import { isValidPhone } from '@/utils/validation';
import { getErrorMessage } from '@/utils/errors';
import type { Role } from '@/types';

// Port of frontend/src/screens/auth/PhoneLoginScreen.tsx.
export default function PhoneLoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedRole = (location.state as { role?: Role } | null)?.role;
  const lastRole = persist.get<Role>(Keys.LAST_ROLE);
  // An approved artist has signed in on this browser before: skip the
  // Customer/Partner choice, as the app does.
  const knownArtist = lastRole === 'ARTIST' && !requestedRole;

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(requestedRole ?? (knownArtist ? 'ARTIST' : 'CUSTOMER'));
  const [showToggle, setShowToggle] = useState(!knownArtist);
  const [error, setError] = useState<string | null>(null);
  const { sendPhoneOtp } = useAuth();
  const valid = isValidPhone(phone);

  const onContinue = () => {
    if (sendPhoneOtp.isPending || !valid) return;
    setError(null);
    sendPhoneOtp.mutate(
      { phone },
      {
        onSuccess: () => navigate('/verify', { state: { phone, role } }),
        onError: (e) => setError(getErrorMessage(e, 'Could not send code')),
      }
    );
  };

  return (
    <View style={styles.safe}>
      <form
        style={styles.scrollContent}
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
      >
        <div className="fade-down">
          <Img src={LOGO} fit="contain" lazy={false} alt="JUVI" style={{ width: 120, height: 120, alignSelf: 'center', margin: '0 auto 20px' }} />
        </div>

        {!showToggle && (
          <PressableScale
            onPress={() => {
              setShowToggle(true);
              setRole('CUSTOMER');
            }}
          >
            <Text style={styles.switchRoleLink}>Not you? Sign in as a customer</Text>
          </PressableScale>
        )}

        {showToggle && (
          <View className="fade-up" style={styles.toggleContainer}>
            {(['CUSTOMER', 'ARTIST'] as const).map((r) => (
              <PressableScale key={r} onPress={() => setRole(r)} style={cx(styles.toggleButton, role === r && styles.toggleButtonActive)}>
                <Text style={cx(styles.toggleText, role === r && styles.toggleTextActive)}>{r === 'CUSTOMER' ? 'Customer' : 'Partner'}</Text>
              </PressableScale>
            ))}
          </View>
        )}

        <div className="fade-up">
          <Text style={styles.heading}>Welcome to JUVI</Text>
          <Text style={styles.subtitle}>Elegance in every touch</Text>
        </div>

        <div className="fade-up">
          <label htmlFor="phone">
            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
          </label>
          <View style={styles.inputContainer}>
            <Text style={styles.countryCode}>+91</Text>
            <input
              id="phone"
              className="rn-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(-10))}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={14}
              placeholder="Enter your phone number"
              style={styles.phoneInput}
              autoFocus
            />
          </View>
        </div>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <PressableScale type="submit" disabled={!valid || sendPhoneOtp.isPending} style={cx(styles.sendButton, (!valid || sendPhoneOtp.isPending) && styles.sendButtonDisabled)}>
          {sendPhoneOtp.isPending ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.sendButtonText}>SEND OTP</Text>
              <Text style={styles.sendButtonArrow}>→</Text>
            </>
          )}
        </PressableScale>

        <Text style={styles.termsText}>
          By continuing, you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and{'\n'}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>

      </form>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  scrollContent: { display: 'flex', flexDirection: 'column', flexGrow: 1, paddingHorizontal: 28, paddingTop: 40, paddingBottom: 40 },
  switchRoleLink: { textAlign: 'center', fontSize: 12.5, color: '#857374', textDecorationLine: 'underline', marginBottom: 18 },
  toggleContainer: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#fff8f5', borderRadius: 30, padding: 3, marginBottom: 32 },
  toggleButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 27 },
  toggleButtonActive: { backgroundColor: '#1e1b18' },
  toggleText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#524344', letterSpacing: 0.3 },
  toggleTextActive: { color: '#FFFFFF' },
  heading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: '#1e1b18', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#524344', textAlign: 'center', lineHeight: 20, marginBottom: 36 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#524344', letterSpacing: 2, marginBottom: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#efe6e2', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 },
  countryCode: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#1e1b18', marginRight: 10, paddingRight: 10, borderRightWidth: 1, borderRightColor: '#efe6e2' },
  phoneInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontFamily: 'Inter_400Regular', color: '#1e1b18' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12.5, color: '#ba1a1a', textAlign: 'center', marginTop: -12, marginBottom: 16 },
  sendButton: { backgroundColor: '#3D2B1F', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, width: '100%' },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF', letterSpacing: 1.5 },
  sendButtonArrow: { fontFamily: 'Inter_400Regular', fontSize: 18, color: '#FFFFFF', marginLeft: 10 },
  termsText: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#A8A29E', textAlign: 'center', lineHeight: 17 },
  termsLink: { color: '#884952', textDecorationLine: 'underline' },
});
