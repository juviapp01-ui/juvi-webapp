import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Badge, Icon, Img, Pressable, Text, View } from '@/components/ui';
import { CitySearchInput } from '@/components/ui/CitySearchInput';
import { Card, Heading, InfoRow, MenuRow, PrimaryButton, QueryState, Screen, SectionLabel, TextField, kit } from '@/components/ui/kit';
import { loyaltyApi, notificationsApi, profileApi, referralsApi, reviewsApi } from '@/api';
import { useUnreadNotifications } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { LOYALTY_TIERS } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';
import { addressLine, savedAddresses, type SavedAddress } from '@/utils/addresses';
import { istDayjs } from '@/utils/ist';
import type { AppNotification, LoyaltyState, Review } from '@/types';

// Customer "You" tab and the screens it opens. Ports of the app's
// CustomerProfileScreen, EditProfile, SavedAddresses, PaymentMethods,
// Referral, Loyalty, Notifications and Reviews.

// ─── You (profile tab) ───────────────────────────────────────────────────────
export function ProfileTabScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const qc = useQueryClient();
  const unread = useUnreadNotifications();

  const onLogout = () => {
    if (!window.confirm('Log out of JUVI on this browser?')) return;
    logout();
    qc.clear();
    navigate('/login', { replace: true });
  };

  return (
    <View style={kit.safe}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>You</Text>
        <Pressable onPress={() => navigate('/notifications')} ariaLabel={`Notifications${unread ? `, ${unread} unread` : ''}`} style={styles.bell}>
          <Icon name="notifications-outline" size={22} color="#1e1b18" />
          {unread > 0 && <View style={styles.bellDot} />}
        </Pressable>
      </View>
      <View style={kit.content}>
        <View style={styles.profileHead}>
          <View style={styles.avatar}>
            {user?.profileImage ? <Img src={user.profileImage} alt="" style={styles.avatarImg} /> : <Icon name="person" size={40} color="rgba(136, 73, 82, 0.35)" />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.name || 'Your profile'}</Text>
            <Text style={styles.sub} numberOfLines={1}>{user?.phone || user?.email}</Text>
            {user?.city && <Text style={styles.sub}>{user.city}</Text>}
          </View>
        </View>

        <SectionLabel>Account</SectionLabel>
        <Card style={{ padding: 0 }}>
          <MenuRow icon="person-outline" label="Edit Profile" onPress={() => navigate('/profile/edit')} />
          <MenuRow icon="brush-outline" label="Become an Artist" sublabel="Apply to take bookings on JUVI" onPress={() => navigate('/partner')} />
          <MenuRow icon="location-outline" label="Saved Addresses" onPress={() => navigate('/profile/addresses')} />
          <MenuRow icon="card-outline" label="Payment Methods" onPress={() => navigate('/profile/payment-methods')} last />
        </Card>

        <SectionLabel>Activity</SectionLabel>
        <Card style={{ padding: 0 }}>
          <MenuRow icon="calendar-outline" label="My Bookings" onPress={() => navigate('/bookings')} />
          <MenuRow icon="trophy-outline" label="JUVI Rewards" onPress={() => navigate('/rewards')} />
          <MenuRow icon="gift-outline" label="Refer & Earn" onPress={() => navigate('/referral')} />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => navigate('/notifications')} right={unread ? <Badge label={String(unread)} /> : undefined} last />
        </Card>

        <SectionLabel>More</SectionLabel>
        <Card style={{ padding: 0 }}>
          <MenuRow icon="settings-outline" label="Settings" onPress={() => navigate('/settings')} />
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => navigate('/help')} />
          <MenuRow icon="log-out-outline" label="Log Out" onPress={onLogout} danger right={<span />} last />
        </Card>
      </View>
    </View>
  );
}

// ─── Edit profile ────────────────────────────────────────────────────────────
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export function EditProfileScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useUIStore((s) => s.showToast);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [state, setState] = useState(user?.state ?? '');
  const [gender, setGender] = useState<string>(user?.gender ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>(user?.profileImage);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: async () => {
      let profileImage = user?.profileImage;
      let photoFailed = false;
      if (photo) {
        // Same as the app: a failed photo upload doesn't stop the rest saving.
        try {
          const { uploadUrl, fileUrl } = (await profileApi.presignUpload(photo.type || 'image/jpeg')).data;
          const put = await fetch(uploadUrl, { method: 'PUT', body: photo, headers: { 'Content-Type': photo.type || 'image/jpeg' } });
          if (!put.ok) throw new Error(String(put.status));
          profileImage = fileUrl;
        } catch {
          photoFailed = true;
        }
      }
      const { data } = await profileApi.update({ name: name.trim(), email: email.trim(), city, state, gender: gender || undefined, profileImage });
      return { user: data.user, photoFailed };
    },
    onSuccess: ({ user: updated, photoFailed }) => {
      setUser(updated);
      showToast(photoFailed ? 'Profile saved, but the photo could not be uploaded.' : 'Profile updated successfully.', photoFailed ? 'error' : 'success');
      navigate(-1);
    },
    onError: (e) => showToast(getErrorMessage(e, 'Could not save your profile'), 'error'),
  });

  const onSave = () => {
    if (!name.trim()) return showToast('Please enter your name.', 'error');
    if (!email.trim() || !isEmail(email.trim())) return showToast('Please enter a valid email address.', 'error');
    save.mutate();
  };

  return (
    <Screen title="Edit Profile" footer={<PrimaryButton title="Save Changes" loading={save.isPending} onPress={onSave} />}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable onPress={() => fileRef.current?.click()} ariaLabel="Change profile photo" style={styles.avatarLg}>
          {preview ? <Img src={preview} alt="" style={styles.avatarImg} /> : <Icon name="person" size={44} color="rgba(136, 73, 82, 0.35)" />}
          <View style={styles.camBadge}>
            <Icon name="camera" size={16} color="#FFFFFF" />
          </View>
        </Pressable>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 8 * 1024 * 1024) return showToast('Please pick a photo under 8 MB.', 'error');
            setPhoto(f);
            setPreview(URL.createObjectURL(f));
          }}
        />
      </View>
      <View style={{ gap: 14 }}>
        <TextField label="FULL NAME" value={name} onChange={setName} placeholder="Enter your name" autoComplete="name" />
        <TextField label="EMAIL" value={email} onChange={setEmail} placeholder="Enter your email" type="email" autoComplete="email" />
        <TextField label="PHONE" value={user?.phone ?? ''} onChange={() => {}} disabled />
        <CitySearchInput city={city} state={state} onChange={(c, s) => { setCity(c); setState(s); }} />
        <View>
          <Text style={kit.sectionLabel}>GENDER</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['FEMALE', 'Female'],
              ['MALE', 'Male'],
              ['OTHER', 'Other'],
            ].map(([k, l]) => (
              <Pressable key={k} onPress={() => setGender(k)} style={cx(styles.chip, gender === k && styles.chipActive)}>
                <Text style={cx(styles.chipText, gender === k && { color: '#FFFFFF' })}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}

// ─── Saved addresses ─────────────────────────────────────────────────────────
const blankAddress = (): SavedAddress => ({ id: `${Date.now()}`, label: 'Home', flat: '', area: '', landmark: '', city: '', pincode: '' });

export function SavedAddressesScreen() {
  const showToast = useUIStore((s) => s.showToast);
  const [list, setList] = useState(savedAddresses.list());
  const [editing, setEditing] = useState<SavedAddress | null>(null);

  const set = (k: keyof SavedAddress) => (v: string) => setEditing((a) => (a ? { ...a, [k]: v } : a));
  const onSave = () => {
    if (!editing) return;
    if (!editing.flat.trim() || !editing.area.trim() || !editing.city.trim()) return showToast('Please fill in flat, area and city.', 'error');
    if (!/^\d{6}$/.test(editing.pincode.trim())) return showToast('Please enter a 6-digit pincode.', 'error');
    savedAddresses.save({ ...editing, label: editing.label.trim() || 'Home' });
    setList(savedAddresses.list());
    setEditing(null);
    showToast('Address saved', 'success');
  };

  if (editing) {
    return (
      <Screen title={list.some((a) => a.id === editing.id) ? 'Edit Address' : 'Add Address'} onBack={() => setEditing(null)} footer={<PrimaryButton title="Save Address" onPress={onSave} />}>
        <View style={{ gap: 14 }}>
          <TextField label="LABEL" value={editing.label} onChange={set('label')} placeholder="Home, Work…" maxLength={30} />
          <TextField label="FLAT / HOUSE NO." value={editing.flat} onChange={set('flat')} autoComplete="address-line1" />
          <TextField label="AREA / STREET" value={editing.area} onChange={set('area')} autoComplete="address-line2" />
          <TextField label="LANDMARK (OPTIONAL)" value={editing.landmark ?? ''} onChange={set('landmark')} />
          <TextField label="CITY" value={editing.city} onChange={set('city')} autoComplete="address-level2" />
          <TextField label="PINCODE" value={editing.pincode} onChange={(v) => set('pincode')(v.replace(/\D/g, ''))} inputMode="numeric" maxLength={6} autoComplete="postal-code" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Saved Addresses" footer={<PrimaryButton title="Add New Address" onPress={() => setEditing(blankAddress())} />}>
      <Text style={styles.note}>Addresses are kept in this browser and offered when you book an artist at home.</Text>
      <QueryState isLoading={false} empty={list.length === 0} emptyTitle="No saved addresses" emptyMessage="Add one to book faster next time." emptyIcon="location-outline">
        {list.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Icon name="location-outline" size={20} color="#884952" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.addrLabel}>{a.label}</Text>
                <Text style={styles.sub}>{addressLine(a)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setEditing(a)}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!window.confirm(`Remove "${a.label}"?`)) return;
                  savedAddresses.remove(a.id);
                  setList(savedAddresses.list());
                }}
              >
                <Text style={{ ...styles.link, color: '#ba1a1a' }}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </QueryState>
    </Screen>
  );
}

// ─── Payment methods (no stored cards: payment happens at checkout) ──────────
export function PaymentMethodsScreen() {
  return (
    <Screen title="Payment Methods">
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Icon name="lock-closed-outline" size={22} color="#884952" />
          <Text style={styles.addrLabel}>Pay securely at checkout</Text>
        </View>
        <Text style={{ ...styles.sub, marginTop: 8 }}>
          JUVI doesn't store your cards. You choose UPI, card, net banking or a wallet each time you pay, on Paytm's secure page.
        </Text>
      </Card>
      <Card style={{ borderStyle: 'dashed', borderColor: '#d7c1c3' }}>
        <Text style={styles.stubTag}>PAYMENT PLACEHOLDER</Text>
        <Text style={styles.sub}>Online payment isn't switched on for the website yet. Bookings and courses can be paid in the JUVI app.</Text>
      </Card>
    </Screen>
  );
}

// ─── Refer & earn ────────────────────────────────────────────────────────────
export function ReferralScreen() {
  const showToast = useUIStore((s) => s.showToast);
  const [code, setCode] = useState('');
  const { data: mine, isLoading, error, refetch } = useQuery({ queryKey: ['referral-code'], queryFn: () => referralsApi.myCode().then((r) => r.data.referralCode) });
  const apply = useMutation({
    mutationFn: () => referralsApi.apply(code.trim().toUpperCase()),
    onSuccess: (r) => {
      showToast(r.data.message || 'Referral code applied', 'success');
      setCode('');
    },
    onError: (e) => showToast(getErrorMessage(e, 'That code could not be applied'), 'error'),
  });
  const shareText = mine ? `Book beauty artists on JUVI with my code ${mine}.` : '';

  return (
    <Screen title="Refer & Earn">
      <View style={styles.hero}>
        <Icon name="gift-outline" size={36} color="#884952" />
        <Heading style={{ textAlign: 'center' }}>Share JUVI, earn rewards</Heading>
        <Text style={{ ...styles.sub, textAlign: 'center' }}>Invite friends with your code. You both get rewards when they make their first booking.</Text>
      </View>
      <SectionLabel>Your code</SectionLabel>
      <QueryState isLoading={isLoading} skeleton={1} error={error} errorTitle="Couldn't load your code" errorMessage={getErrorMessage(error)} onRetry={() => refetch()}>
        <Card>
          <Text style={styles.code}>{mine}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Copy Code"
                tone="ink"
                onPress={() =>
                  navigator.clipboard?.writeText(mine ?? '').then(
                    () => showToast('Code copied', 'success'),
                    () => showToast('Could not copy', 'error')
                  )
                }
              />
            </View>
            {typeof navigator.share === 'function' && (
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Share" onPress={() => navigator.share({ text: shareText }).catch(() => {})} />
              </View>
            )}
          </View>
        </Card>
      </QueryState>
      <SectionLabel>Have a friend's code?</SectionLabel>
      <Card>
        <TextField value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="Enter referral code" maxLength={20} />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Apply Code" disabled={code.trim().length < 4} loading={apply.isPending} onPress={() => apply.mutate()} />
      </Card>
    </Screen>
  );
}

// ─── JUVI Rewards ────────────────────────────────────────────────────────────
const MIN_REDEEM_POINTS = 100;
const HOW_POINTS_WORK = [
  { title: 'Earn', desc: 'Get 1 point for every ₹100 you spend on a paid booking.' },
  { title: 'Worth', desc: 'Each point is worth ₹1 off a booking.' },
  { title: 'Redeem', desc: `Points can be redeemed once you have at least ${MIN_REDEEM_POINTS}.` },
];

export function LoyaltyScreen() {
  const { data, isLoading, error, refetch } = useQuery<LoyaltyState>({ queryKey: ['loyalty'], queryFn: () => loyaltyApi.state().then((r) => r.data), retry: false });
  const points = data?.points ?? 0;
  const nextTier = LOYALTY_TIERS.find((t) => points < t.min);
  const goal = nextTier?.min ?? points;
  const pct = goal ? Math.min(100, Math.round((points / goal) * 100)) : 100;

  return (
    <Screen title="JUVI Rewards">
      <QueryState isLoading={isLoading} error={error || (!isLoading && !data)} errorTitle="Could not load loyalty status" errorMessage={getErrorMessage(error, 'Please try again shortly.')} onRetry={() => refetch()}>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>YOUR POINTS</Text>
          <Text style={styles.points}>{points.toLocaleString('en-IN')}</Text>
          <Text style={styles.tier}>TIER · {(data?.tier ?? 'bronze').toUpperCase()}</Text>
          <View style={styles.bar} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <View style={{ ...styles.barFill, width: `${pct}%` }} />
          </View>
          <Text style={styles.pointsHint}>{nextTier ? `${(goal - points).toLocaleString('en-IN')} points to ${nextTier.tier} tier` : 'You are at the top tier'}</Text>
        </View>

        <SectionLabel>How points work</SectionLabel>
        <Card>
          {HOW_POINTS_WORK.map((h) => (
            <InfoRow key={h.title} label={h.title} value={h.desc} />
          ))}
        </Card>

        <SectionLabel>History</SectionLabel>
        {data?.history?.length ? (
          <Card style={{ padding: 0 }}>
            {data.history.map((h, i) => (
              <View key={h.id} style={cx(styles.ledgerRow, i === data.history.length - 1 && { borderBottomWidth: 0 })}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.addrLabel}>{h.label}</Text>
                  <Text style={styles.sub}>{istDayjs(h.createdAt).format('D MMM YYYY')}</Text>
                </View>
                <Text style={{ ...styles.addrLabel, color: h.points < 0 ? '#857374' : '#2E7D32' }}>{h.points > 0 ? `+${h.points}` : h.points}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <Text style={styles.sub}>No points yet. You'll earn them on your next paid booking.</Text>
        )}
      </QueryState>
    </Screen>
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────
// The app's push deep links are app routes; map the common ones to site paths.
function linkFor(deepLink?: string): string | null {
  if (!deepLink) return null;
  const m = deepLink.match(/booking[s]?\/([\w-]+)/i);
  if (m) return `/bookings/${m[1]}`;
  if (/chat\/([\w-]+)/i.test(deepLink)) return `/chat/${deepLink.match(/chat\/([\w-]+)/i)![1]}`;
  return null;
}

export function NotificationsScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => notificationsApi.list(1).then((r) => r.data) });
  const items = (data?.items ?? []) as AppNotification[];
  const open = (n: AppNotification) => {
    if (!n.read) notificationsApi.markRead(n.id).then(() => qc.invalidateQueries({ queryKey: ['notifications'] }), () => {});
    const to = linkFor(n.deepLink);
    if (to) navigate(to);
  };

  return (
    <Screen title="Notifications">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load notifications" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} empty={items.length === 0} emptyTitle="You're all caught up" emptyMessage="Booking updates and messages show up here." emptyIcon="notifications-outline">
        <Card style={{ padding: 0 }}>
          {items.map((n, i) => (
            <Pressable key={n.id} onPress={() => open(n)} style={cx(styles.notifRow, i === items.length - 1 && { borderBottomWidth: 0 })}>
              <View style={cx(styles.notifDot, n.read && { backgroundColor: 'transparent' })} />
              <View style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <Text style={cx(styles.addrLabel, !n.read && { fontFamily: 'HankenGrotesk_700Bold' })}>{n.title}</Text>
                <Text style={styles.sub}>{n.body}</Text>
                <Text style={styles.time}>{istDayjs(n.createdAt).format('D MMM, h:mm A')}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

// ─── Reviews of an artist ────────────────────────────────────────────────────
export function ReviewsScreen({ artistId }: { artistId: string }) {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['reviews', artistId], queryFn: () => reviewsApi.list(artistId, 1).then((r) => r.data) });
  const raw = data as unknown as { items?: Review[]; reviews?: Review[] } | Review[] | undefined;
  const items: Review[] = Array.isArray(raw) ? raw : raw?.items ?? raw?.reviews ?? [];
  return (
    <Screen title="Reviews">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load reviews" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} empty={items.length === 0} emptyTitle="No reviews yet" emptyIcon="star-outline">
        {items.map((r) => <ReviewCard key={r.id} review={r} />)}
      </QueryState>
    </Screen>
  );
}

export function ReviewCard({ review, footer }: { review: Review; footer?: React.ReactNode }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.addrLabel}>{review.customerName || 'JUVI client'}</Text>
        <Text style={styles.time}>{istDayjs(review.createdAt).format('D MMM YYYY')}</Text>
      </View>
      <Text style={{ color: '#884952', fontSize: 15, margin: '4px 0' }} aria-label={`${review.rating} out of 5`}>
        {'★'.repeat(Math.round(review.rating))}
        <span style={{ color: '#d7c1c3' }}>{'★'.repeat(5 - Math.round(review.rating))}</span>
      </Text>
      {review.comment && <Text style={styles.body}>{review.comment}</Text>}
      {review.artistResponse && (
        <View style={styles.response}>
          <Text style={styles.pointsLabel}>ARTIST REPLY</Text>
          <Text style={styles.body}>{review.artistResponse}</Text>
        </View>
      )}
      {footer}
    </Card>
  );
}

const styles = sheet({
  tabHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 4px' },
  tabTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: '#1e1b18' },
  bell: { position: 'relative', padding: 6 },
  bellDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#884952' },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarLg: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999 },
  camBadge: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#884952', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff8f5' },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: '#857374', lineHeight: 19 },
  body: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#524344', lineHeight: 21 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#A8A29E', marginTop: 4 },
  note: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374', marginBottom: 12 },
  addrLabel: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  chip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: '#d7c1c3', backgroundColor: '#FFFFFF' },
  chipActive: { backgroundColor: '#884952', borderColor: '#884952' },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#1e1b18' },
  stubTag: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#92400E', marginBottom: 6 },
  hero: { alignItems: 'center', gap: 8, padding: '12px 8px 4px' },
  code: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: 4, color: '#884952', textAlign: 'center', marginBottom: 14 },
  pointsCard: { backgroundColor: '#884952', borderRadius: 20, padding: 22, gap: 6, marginBottom: 8 },
  pointsLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: '#efd9dc' },
  points: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 40, color: '#FFFFFF' },
  tier: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#FFFFFF', letterSpacing: 1 },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 8 },
  barFill: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  pointsHint: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#efd9dc' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3ece8', gap: 12 },
  notifRow: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3ece8', width: '100%', alignItems: 'flex-start' },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#884952', marginTop: 7 },
  response: { backgroundColor: '#fbf2ed', borderRadius: 12, padding: 12, marginTop: 10, gap: 4 },
});
