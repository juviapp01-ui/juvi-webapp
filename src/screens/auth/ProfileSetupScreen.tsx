import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sheet, cx } from '@/lib/rn';
import { CitySearchInput, Icon, Img, PressableScale, Spinner, Text, View } from '@/components/ui';
import { profileApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { GENDER_OPTIONS, LOGO } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';
import { isValidEmail } from '@/utils/validation';
import type { Role } from '@/types';

// Port of frontend/src/screens/auth/ProfileSetupScreen.tsx: name, email,
// city (backend Places search), gender and an optional photo, saved with
// PUT /profile — the same call the app makes.
const PENDING_ROLE_KEY = 'juvi.pendingRole';

export default function ProfileSetupScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  // Kept across a reload of this page (the choice was made on the login screen).
  const role: Role =
    (location.state as { role?: Role } | null)?.role ??
    ((sessionStorage.getItem(PENDING_ROLE_KEY) as Role | null) || 'CUSTOMER');
  useEffect(() => {
    sessionStorage.setItem(PENDING_ROLE_KEY, role);
  }, [role]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useUIStore((s) => s.showToast);

  const emailError = email.trim().length === 0 || !isValidEmail(email);
  const incomplete = !name.trim() || emailError || !state || !city || !gender || saving;

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) {
      showToast('Choose a JPG or PNG photo', 'error');
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSave = async () => {
    if (incomplete) return;
    setSaving(true);
    setError(null);
    try {
      let finalPhotoUrl: string | undefined;
      let photoUploadFailed = false;

      if (photo) {
        try {
          const contentType = photo.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const { data } = await profileApi.presignUpload(contentType);
          // Straight to storage with the signed URL, as the app does.
          const upload = await fetch(data.uploadUrl, { method: 'PUT', body: photo, headers: { 'Content-Type': contentType } });
          if (!upload.ok) throw new Error('Photo upload failed. Please try again.');
          finalPhotoUrl = data.fileUrl;
        } catch (photoError) {
          photoUploadFailed = true;
          showToast(getErrorMessage(photoError, 'Could not upload your photo — the rest of your profile was still saved.'), 'error');
        }
      }

      const { data } = await profileApi.update({ name, email, profileImage: finalPhotoUrl, city, state, gender });
      sessionStorage.removeItem(PENDING_ROLE_KEY);
      setUser(data.user);
      if (!photoUploadFailed) showToast('Profile saved', 'success');
      // A new partner continues their application; everyone else goes Home.
      navigate(role === 'ARTIST' || data.user.role === 'ARTIST' ? '/partner' : '/home', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        {/* "Back" from here means leaving sign-in: the account exists but has no profile yet. */}
        <PressableScale
          onPress={() => {
            logout();
            navigate('/login', { replace: true });
          }}
          style={styles.closeButton}
          ariaLabel="Back to sign in"
        >
          <Icon name="arrow-back" size={22} color="#1e1b18" />
        </PressableScale>
        <Img src={LOGO} fit="contain" lazy={false} alt="JUVI" style={{ width: 80, height: 80 }} />
        <View style={styles.closeButton} />
      </View>

      <form
        style={styles.scrollContent}
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="fade-down">
          <Text style={styles.heading}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>{"Let's set up your profile to personalise your\nexperience."}</Text>
        </div>

        <View className="fade-up" style={styles.photoSection}>
          <PressableScale onPress={() => fileRef.current?.click()} style={styles.photoCircle} ariaLabel="Upload profile photo">
            {photoPreview ? <Img src={photoPreview} style={styles.photoPreview} /> : <Icon name="camera-outline" size={32} color="#A8A29E" />}
            <View style={styles.photoCameraOverlay}>
              <Icon name="camera" size={14} color="#FFFFFF" />
            </View>
          </PressableScale>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)} />
          <Text style={styles.photoLabel}>Upload Profile Photo</Text>
        </View>

        <label htmlFor="name">
          <Text style={styles.inputLabel}>FULL NAME</Text>
        </label>
        <input id="name" className="rn-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" style={styles.textInput} />

        <label htmlFor="email">
          <Text style={styles.inputLabel}>EMAIL</Text>
        </label>
        <input
          id="email"
          className="rn-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          autoComplete="email"
          style={styles.textInput}
        />
        {email.length > 0 && emailError && <Text style={styles.errorText}>Enter a valid email address</Text>}

        <CitySearchInput
          city={city}
          state={state}
          onChange={(c, s) => {
            setCity(c);
            setState(s);
          }}
        />

        <Text style={styles.inputLabel}>GENDER</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((g) => (
            <PressableScale key={g.value} onPress={() => setGender(g.value)} style={cx(styles.genderPill, gender === g.value && styles.genderPillActive)}>
              <Text style={cx(styles.genderPillText, gender === g.value && styles.genderPillTextActive)}>{g.label}</Text>
            </PressableScale>
          ))}
        </View>

        {error && <Text style={{ ...styles.errorText, marginTop: 0, textAlign: 'center' }}>{error}</Text>}

        <View style={styles.buttonWrapper}>
          <PressableScale type="submit" disabled={!!incomplete} style={cx(styles.completeButton, !!incomplete && styles.completeButtonDisabled)}>
            {saving ? <Spinner color="#FFFFFF" /> : <Text style={styles.completeButtonText}>COMPLETE SETUP</Text>}
          </PressableScale>
        </View>
      </form>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 8, paddingBottom: 12 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { display: 'flex', flexDirection: 'column', paddingHorizontal: 28, paddingBottom: 40 },
  heading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#1e1b18', textAlign: 'center', marginBottom: 10, marginTop: 8 },
  subtitle: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#524344', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  photoSection: { alignItems: 'center', marginBottom: 28 },
  photoCircle: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(215, 193, 195, 0.6)', borderStyle: 'dashed',
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'visible',
  },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoCameraOverlay: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#884952',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff8f5',
  },
  photoLabel: { fontFamily: 'HankenGrotesk_500Medium', fontSize: 13, color: '#524344', marginTop: 12 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#524344', letterSpacing: 1.5, marginBottom: 8 },
  textInput: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.4)', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, fontFamily: 'HankenGrotesk_400Regular', color: '#1e1b18', marginBottom: 20, width: '100%',
  },
  errorText: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 11, color: '#ba1a1a', marginTop: -14, marginBottom: 20 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  genderPill: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(215, 193, 195, 0.4)', backgroundColor: '#FFFFFF', alignItems: 'center' },
  genderPillActive: { backgroundColor: '#884952', borderColor: '#884952' },
  genderPillText: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 13, color: '#524344' },
  genderPillTextActive: { color: '#FFFFFF' },
  buttonWrapper: { marginTop: 24, marginBottom: 16 },
  completeButton: { backgroundColor: '#884952', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', width: '100%' },
  completeButtonDisabled: { opacity: 0.4 },
  completeButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF', letterSpacing: 1.5 },
});
