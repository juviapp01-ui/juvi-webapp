import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet } from '@/lib/rn';
import { Icon, Img, Pressable, Text, View } from '@/components/ui';
import { Card, MenuRow, PrimaryButton, QueryState, Screen, SectionLabel } from '@/components/ui/kit';
import { notificationsApi, profileApi, type NotificationPreferences } from '@/api';
import { useBlockedUsers, useUnblockUser } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { LAST_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS, type Section } from '@/content/legal';

// Ports of the app's Settings, NotificationPreferences, BlockedAccounts,
// HelpSupport, Legal and DeleteAccount screens (shared by customers and artists).

export function SettingsScreen() {
  const navigate = useNavigate();
  return (
    <Screen title="Settings">
      <SectionLabel>Preferences</SectionLabel>
      <Card style={{ padding: 0 }}>
        <MenuRow icon="notifications-outline" label="Notifications" sublabel="Booking, message and offer alerts" onPress={() => navigate('/settings/notifications')} />
        <MenuRow icon="ban-outline" label="Blocked Accounts" onPress={() => navigate('/settings/blocked')} last />
      </Card>
      <SectionLabel>Support</SectionLabel>
      <Card style={{ padding: 0 }}>
        <MenuRow icon="help-circle-outline" label="Help Center" onPress={() => navigate('/help')} />
        <MenuRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => navigate('/legal#privacy')} />
        <MenuRow icon="document-text-outline" label="Terms of Service" onPress={() => navigate('/legal')} last />
      </Card>
      <SectionLabel>Account</SectionLabel>
      <Card style={{ padding: 0 }}>
        <MenuRow icon="trash-outline" label="Delete Account" danger onPress={() => navigate('/settings/delete-account')} last />
      </Card>
    </Screen>
  );
}

function Switch({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{ width: 50, height: 30, borderRadius: 15, border: 0, padding: 3, background: value ? '#884952' : '#d7c1c3', cursor: disabled ? 'default' : 'pointer', transition: 'background .15s', flexShrink: 0 }}
    >
      <span style={{ display: 'block', width: 24, height: 24, borderRadius: 12, background: '#FFFFFF', transform: value ? 'translateX(20px)' : 'none', transition: 'transform .15s' }} />
    </button>
  );
}

export function NotificationPreferencesScreen() {
  const showToast = useUIStore((s) => s.showToast);
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['notification-prefs'], queryFn: () => notificationsApi.preferences().then((r) => r.data) });
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  useEffect(() => {
    if (data) setPrefs({ bookings: data.bookings, messages: data.messages, promotions: data.promotions });
  }, [data]);
  const update = useMutation({
    mutationFn: (p: Partial<NotificationPreferences>) => notificationsApi.updatePreferences(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-prefs'] }),
  });

  const toggle = (key: keyof NotificationPreferences, v: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, [key]: v });
    update.mutate({ [key]: v }, { onError: (e) => { setPrefs(before); showToast(getErrorMessage(e, 'Could not update'), 'error'); } });
  };

  const rows: { key: keyof NotificationPreferences; label: string; sub: string }[] = [
    { key: 'bookings', label: 'Booking updates', sub: 'Confirmations, reminders and changes' },
    { key: 'messages', label: 'Messages', sub: 'Replies from the JUVI team' },
    { key: 'promotions', label: 'Offers & news', sub: 'Occasional offers from JUVI' },
  ];

  return (
    <Screen title="Notifications">
      <Text style={styles.note}>These are the alerts sent to the JUVI app on your phone.</Text>
      <QueryState isLoading={isLoading} skeleton={1} error={error} errorTitle="Couldn't load your settings" errorMessage={getErrorMessage(error)} onRetry={() => refetch()}>
        <Card style={{ padding: 0 }}>
          {prefs &&
            rows.map((r, i) => (
              <View key={r.key} style={{ ...styles.row, ...(i === rows.length - 1 ? { borderBottomWidth: 0 } : {}) }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{r.label}</Text>
                  <Text style={styles.sub}>{r.sub}</Text>
                </View>
                <Switch label={r.label} value={prefs[r.key]} onChange={(v) => toggle(r.key, v)} />
              </View>
            ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

export function BlockedAccountsScreen() {
  const showToast = useUIStore((s) => s.showToast);
  const { data = [], isLoading, error, refetch } = useBlockedUsers();
  const unblock = useUnblockUser();
  return (
    <Screen title="Blocked Accounts">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load blocked accounts" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} empty={data.length === 0} emptyTitle="No blocked accounts" emptyMessage="People you block won't show up in your reels or search." emptyIcon="ban-outline">
        <Card style={{ padding: 0 }}>
          {data.map((u, i) => (
            <View key={u.id} style={{ ...styles.row, ...(i === data.length - 1 ? { borderBottomWidth: 0 } : {}) }}>
              <View style={styles.avatar}>{u.photoUrl ? <Img src={u.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="person" size={20} color="#857374" />}</View>
              <Text style={{ ...styles.label, flex: 1, minWidth: 0 }} numberOfLines={1}>{u.name || 'Blocked user'}</Text>
              <Pressable
                onPress={() =>
                  unblock.mutate(u.id, {
                    onSuccess: () => showToast('Unblocked', 'success'),
                    onError: (e) => showToast(getErrorMessage(e, 'Could not unblock'), 'error'),
                  })
                }
                disabled={unblock.isPending}
                style={styles.smallBtn}
              >
                <Text style={styles.smallBtnText}>Unblock</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

const FAQ = [
  { q: 'How do I book an artist?', a: 'Open an artist, choose a service, pick a date and time, then confirm with an advance payment.' },
  { q: 'Can I cancel or reschedule?', a: 'Yes, from the booking. Cancelling more than 24 hours ahead is a full refund, 12–24 hours is 50%, and under 12 hours has no refund.' },
  { q: 'How do I talk to my artist?', a: 'Use Messages on a confirmed booking. The JUVI team coordinates with your artist for you.' },
  { q: 'When do I get my refund?', a: 'Refunds go back to the original payment method, usually within 5–7 working days.' },
];

export function HelpSupportScreen() {
  return (
    <Screen title="Help & Support">
      <a href="mailto:support@juviapp.com" style={{ textDecoration: 'none' }}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="mail-outline" size={22} color="#884952" />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Email us</Text>
              <Text style={styles.sub}>support@juviapp.com</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#d7c1c3" />
          </View>
        </Card>
      </a>
      <SectionLabel>Common questions</SectionLabel>
      {FAQ.map((f) => (
        <details key={f.q} style={{ background: '#FFFFFF', border: '1px solid #efe6e2', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'Hanken Grotesk, sans-serif', fontWeight: 600, fontSize: 15, color: '#1e1b18' }}>{f.q}</summary>
          <Text style={{ ...styles.body, marginTop: 8 }}>{f.a}</Text>
        </details>
      ))}
    </Screen>
  );
}

function LegalSection({ title, paragraphs }: Section) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={styles.subheading}>{title}</Text>
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.body}>{p}</Text>
      ))}
    </View>
  );
}

export function LegalScreen() {
  useEffect(() => {
    if (window.location.hash === '#privacy') document.getElementById('privacy')?.scrollIntoView();
  }, []);
  return (
    <Screen title="Legal">
      <Text style={styles.heading}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
      {TERMS_SECTIONS.map((s) => <LegalSection key={s.title} {...s} />)}
      <View style={{ height: 1, backgroundColor: 'rgba(215, 193, 195, 0.3)', margin: '28px 0' }} />
      <h2 id="privacy" style={{ margin: 0 }}>
        <Text style={styles.heading}>Privacy Policy</Text>
      </h2>
      <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
      {PRIVACY_SECTIONS.map((s) => <LegalSection key={s.title} {...s} />)}
    </Screen>
  );
}

export function DeleteAccountScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const showToast = useUIStore((s) => s.showToast);
  const [confirm, setConfirm] = useState('');
  const del = useMutation({
    mutationFn: () => profileApi.deleteAccount(),
    onSuccess: () => {
      logout();
      qc.clear();
      showToast('Your account has been deleted', 'success');
      navigate('/login', { replace: true });
    },
  });
  const blocked = del.error ? getErrorMessage(del.error, 'Could not delete your account. Please try again.') : null;

  return (
    <Screen title="Delete Account" footer={<PrimaryButton title="Delete My Account" disabled={confirm.trim().toUpperCase() !== 'DELETE'} loading={del.isPending} onPress={() => del.mutate()} />}>
      <Card style={{ borderColor: 'rgba(186, 26, 26, 0.25)' }}>
        <Text style={{ ...styles.label, color: '#ba1a1a' }}>This can't be undone</Text>
        <Text style={styles.body}>Deleting your account removes your profile, saved artists, rewards and messages. Bookings that are still active, or money still owed, must be settled first.</Text>
      </Card>
      {blocked && (
        <Card style={{ backgroundColor: '#FFF4E5', borderColor: '#F5D9A8' }}>
          <Text style={{ ...styles.body, color: '#92400E' }}>{blocked}</Text>
        </Card>
      )}
      <Text style={{ ...styles.sub, margin: '8px 0' }}>Type DELETE to confirm.</Text>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        aria-label="Type DELETE to confirm"
        style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e8dcd8', borderRadius: 12, padding: '14px 16px', fontSize: 16, background: '#FFFFFF' }}
      />
    </Screen>
  );
}

const styles = sheet({
  note: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3ece8' },
  label: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374' },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#524344', lineHeight: 22, marginBottom: 8 },
  heading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18', marginBottom: 4 },
  subheading: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#1e1b18', marginBottom: 6 },
  updated: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#A8A29E', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  smallBtn: { borderWidth: 1, borderColor: '#d7c1c3', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  smallBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12.5, color: '#1e1b18' },
});
