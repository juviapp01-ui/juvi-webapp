import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet } from '@/lib/rn';
import { Icon, Img, Pressable, PressableScale, Text, View } from '@/components/ui';
import { Card, MenuRow, PrimaryButton, QueryState, Screen, SectionLabel, TextField, kit } from '@/components/ui/kit';
import { ReviewCard } from '@/screens/account/Account';
import { artistsApi, profileApi, reelsApi, reviewsApi } from '@/api';
import { useArtistDashboard, useDeleteReel, useMyArtistProfile, useMyReels, useUnreadNotifications } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getErrorMessage } from '@/utils/errors';
import { formatCompactNumber } from '@/utils/format';
import { imageContentType, putToSignedUrl } from '@/utils/upload';
import type { Reel, Review } from '@/types';

// Ports of the app's ArtistProfileScreen ("Account" tab), EditArtistProfile,
// MyReels / MyReelPlayer, ReelUpload and ReviewResponse.

export function PartnerAccountScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unread = useUnreadNotifications();
  const { data: me } = useMyArtistProfile();
  const { data: dash } = useArtistDashboard();

  return (
    <View style={kit.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Pressable onPress={() => navigate('/notifications')} ariaLabel="Notifications" style={{ position: 'relative', padding: 6 }}>
          <Icon name="notifications-outline" size={22} color="#1e1b18" />
          {unread > 0 && <View style={styles.dot} />}
        </Pressable>
      </View>
      <View style={{ ...kit.content, paddingBottom: 110 }}>
        <View style={{ alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <View style={styles.avatar}>{user?.profileImage ? <Img src={user.profileImage} alt="" style={styles.fill} /> : <Icon name="person" size={40} color="#c2a3a8" />}</View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name}>{user?.name}</Text>
            {me?.isVerified && <Icon name="verified" size={18} color="#884952" />}
          </View>
          {me?.title && <Text style={styles.sub}>{me.title}</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.stat}>{me?.rating ? me.rating.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </Card>
          <PressableScale onPress={() => navigate('/partner/schedule')} style={{ flex: 1 }}>
            <Card style={{ alignItems: 'center' }}>
              <Text style={styles.stat}>{dash?.stats.bookingsCount ?? 0}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </Card>
          </PressableScale>
        </View>

        <SectionLabel>Business Management</SectionLabel>
        <Card style={{ padding: 0 }}>
          <MenuRow icon="eye-outline" label="View as Customer" onPress={me ? () => navigate(`/partner/preview/${me.id}`) : undefined} />
          <MenuRow icon="create-outline" label="Edit Profile" onPress={() => navigate('/partner/profile/edit')} />
          <MenuRow icon="pricetags-outline" label="Service Catalog" onPress={() => navigate('/partner/apply/services')} />
          <MenuRow icon="images-outline" label="Portfolio" onPress={() => navigate('/partner/apply/portfolio')} />
          <MenuRow icon="location-outline" label="Studio & Location" onPress={() => navigate('/partner/apply/studio')} />
          <MenuRow icon="time-outline" label="Availability & Hours" onPress={() => navigate('/partner/availability')} />
          <MenuRow icon="film-outline" label="My Reels" onPress={() => navigate('/partner/my-reels')} />
          <MenuRow icon="star-outline" label="Reviews" onPress={() => navigate('/partner/reviews')} last />
        </Card>

        <SectionLabel>Preferences & Settings</SectionLabel>
        <Card style={{ padding: 0 }}>
          <MenuRow icon="ribbon-outline" label="Subscription" onPress={() => navigate('/partner/subscription')} />
          <MenuRow icon="notifications-outline" label="Notifications" onPress={() => navigate('/notifications')} />
          <MenuRow icon="settings-outline" label="Settings" onPress={() => navigate('/settings')} />
          <MenuRow icon="wallet-outline" label="Payment Details" onPress={() => navigate('/partner/earnings/bank')} />
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => navigate('/help')} last />
        </Card>

        <Pressable
          onPress={() => {
            if (!window.confirm('Sign out of JUVI on this browser?')) return;
            logout();
            qc.clear();
            navigate('/login', { replace: true });
          }}
          style={styles.signOut}
        >
          <Icon name="log-out-outline" size={18} color="#ba1a1a" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Edit profile ────────────────────────────────────────────────────────────
export function EditArtistProfileScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useUIStore((s) => s.showToast);
  const { data: me, isLoading } = useMyArtistProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [travel, setTravel] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState(user?.profileImage);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!me) return;
    setTitle(me.title ?? '');
    setBio(me.bio ?? '');
    setTravel(me.maxTravelDistance ? String(me.maxTravelDistance) : '');
  }, [me]);

  const save = async () => {
    if (!name.trim()) return showToast('Please enter your name.', 'error');
    const km = travel.trim() ? Number(travel) : undefined;
    if (km !== undefined && (!Number.isFinite(km) || km < 1 || km > 200)) return showToast('Travel distance should be between 1 and 200 km.', 'error');
    setSaving(true);
    try {
      let profileImage = user?.profileImage;
      let photoFailed = false;
      if (photo) {
        try {
          const type = imageContentType(photo);
          const { data } = await profileApi.presignUpload(type);
          await putToSignedUrl(data.uploadUrl, photo, { 'Content-Type': type });
          profileImage = data.fileUrl;
        } catch {
          photoFailed = true;
          showToast('Could not upload your photo — the rest of your changes were still saved.', 'error');
        }
      }
      const { data } = await profileApi.update({ name: name.trim(), email: email.trim(), profileImage });
      setUser(data.user);
      await artistsApi.updateProfile({ title: title.trim(), bio: bio.trim(), maxTravelDistance: km });
      await qc.invalidateQueries({ queryKey: ['artist', 'me'] });
      if (!photoFailed) showToast('Profile updated successfully', 'success');
      navigate(-1);
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Edit Profile" footer={<PrimaryButton title="Save Changes" loading={saving} onPress={save} />}>
      <QueryState isLoading={isLoading} skeleton={3}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Pressable onPress={() => fileRef.current?.click()} ariaLabel="Change profile photo" style={styles.avatarLg}>
            {preview ? <Img src={preview} alt="" style={styles.fill} /> : <Icon name="person" size={44} color="#c2a3a8" />}
            <View style={styles.cam}>
              <Icon name="camera" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
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
          <TextField label="FULL NAME" value={name} onChange={setName} autoComplete="name" />
          <TextField label="EMAIL" value={email} onChange={setEmail} type="email" autoComplete="email" />
          <TextField label="PHONE" value={user?.phone ?? ''} onChange={() => {}} disabled />
          <TextField label="PROFESSIONAL TITLE" value={title} onChange={setTitle} placeholder="E.g. Master Bridal Stylist" maxLength={60} />
          <TextField label="BIO" value={bio} onChange={setBio} multiline maxLength={600} placeholder="Your artistry, experience and what makes you different" />
          <TextField label="HOW FAR YOU TRAVEL (KM)" value={travel} onChange={(v) => setTravel(v.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" />
        </View>
      </QueryState>
    </Screen>
  );
}

// ─── My reels ────────────────────────────────────────────────────────────────
export function MyReelsScreen() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useMyReels();
  const del = useDeleteReel();
  const reels = data?.pages.flatMap((p) => p.items) ?? [];
  const [playing, setPlaying] = useState<Reel | null>(null);

  return (
    <Screen title="My Reels" footer={<PrimaryButton title="Upload a Reel" onPress={() => navigate('/partner/reels/new')} />}>
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load your reels" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} empty={reels.length === 0} emptyTitle="No reels yet" emptyMessage="Short videos of your work help clients find you." emptyIcon="film-outline">
        {playing && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <video src={playing.videoUrl} poster={playing.thumbnailUrl} controls autoPlay playsInline style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }} />
            <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sub}>{playing.caption || 'No caption'}</Text>
              <Pressable onPress={() => setPlaying(null)}>
                <Text style={styles.link}>Close</Text>
              </Pressable>
            </View>
          </Card>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {reels.map((r) => (
            <View key={r.id} style={styles.reelTile}>
              <PressableScale onPress={() => setPlaying(r)} style={{ width: '100%', height: '100%' }} ariaLabel="Play reel">
                <Img src={r.thumbnailUrl} alt="" style={styles.fill} />
              </PressableScale>
              <View style={styles.reelStats}>
                <Icon name="eye-outline" size={11} color="#FFFFFF" />
                <Text style={styles.reelStatText}>{formatCompactNumber(r.viewCount ?? 0)}</Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!window.confirm('Delete this reel? This can’t be undone.')) return;
                  del.mutate(r.id, {
                    onSuccess: () => {
                      if (playing?.id === r.id) setPlaying(null);
                      showToast('Reel deleted', 'success');
                    },
                    onError: (e) => showToast(getErrorMessage(e, 'Could not delete reel'), 'error'),
                  });
                }}
                style={styles.reelDelete}
                ariaLabel="Delete reel"
              >
                <Icon name="trash-outline" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </div>
        {hasNextPage && (
          <Pressable onPress={() => fetchNextPage()} style={{ alignSelf: 'center', marginTop: 14 }}>
            <Text style={styles.link}>{isFetchingNextPage ? 'Loading…' : 'Load more'}</Text>
          </Pressable>
        )}
      </QueryState>
    </Screen>
  );
}

// ─── Upload a reel ───────────────────────────────────────────────────────────
// Same checks as the app: a vertical video (height/width 1.5–2.2). The web
// can't re-encode video, so only MP4 is accepted (that's what the backend
// presigns for) up to 100 MB; the thumbnail is a frame grabbed in the browser.
const MIN_RATIO = 1.5;
const MAX_RATIO = 2.2;
const MAX_BYTES = 100 * 1024 * 1024;
type Stage = 'idle' | 'uploading-video' | 'uploading-thumbnail' | 'saving';
const STAGE_LABEL: Record<Stage, string> = { idle: '', 'uploading-video': 'Uploading video...', 'uploading-thumbnail': 'Uploading thumbnail...', saving: 'Saving...' };

function grabFrame(video: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 720 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make a thumbnail'))), 'image/jpeg', 0.85);
  });
}

export function ReelUploadScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [caption, setCaption] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.type !== 'video/mp4') return showToast('Please pick an MP4 video.', 'error');
    if (f.size > MAX_BYTES) return showToast('Please pick a video under 100 MB.', 'error');
    setFile(f);
    setUrl(URL.createObjectURL(f));
  };

  const onLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    const ratio = v.videoHeight / v.videoWidth;
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      showToast('Reels must be vertical (portrait) videos, like 9:16.', 'error');
      setFile(null);
      setUrl(null);
      return;
    }
    setDuration(Math.round(v.duration || 0));
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
  };

  const upload = async () => {
    if (!file || !videoRef.current) return;
    try {
      const thumb = await grabFrame(videoRef.current);
      setStage('uploading-video');
      setProgress(0);
      const vp = (await reelsApi.presignVideo('video/mp4')).data;
      await putToSignedUrl(vp.uploadUrl, file, vp.requiredHeaders ?? { 'Content-Type': 'video/mp4' }, setProgress);
      setStage('uploading-thumbnail');
      const tp = (await reelsApi.presignThumbnail('image/jpeg')).data;
      await putToSignedUrl(tp.uploadUrl, thumb, tp.requiredHeaders ?? { 'Content-Type': 'image/jpeg' });
      setStage('saving');
      await reelsApi.create({ videoUrl: vp.fileUrl, thumbnailUrl: tp.fileUrl, caption: caption.trim() || undefined, durationSeconds: duration || undefined });
      qc.invalidateQueries({ queryKey: ['reels', 'mine'] });
      qc.invalidateQueries({ queryKey: ['artistDashboard'] });
      showToast('Reel uploaded — it will appear once it’s approved', 'success');
      navigate('/partner/my-reels', { replace: true });
    } catch (e) {
      showToast(getErrorMessage(e, 'Upload failed. Please try again.'), 'error');
    } finally {
      setStage('idle');
    }
  };

  const busy = stage !== 'idle';
  return (
    <Screen
      title="New Reel"
      footer={<PrimaryButton title={busy ? `${STAGE_LABEL[stage]}${stage === 'uploading-video' ? ` ${Math.round(progress * 100)}%` : ''}` : 'Upload Reel'} disabled={!file || busy} loading={busy && stage !== 'uploading-video'} onPress={upload} />}
    >
      <View style={styles.preview}>
        {url ? (
          <video ref={videoRef} src={url} controls playsInline muted onLoadedMetadata={onLoaded} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
        ) : (
          <Pressable onPress={() => inputRef.current?.click()} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="videocam-outline" size={40} color="rgba(136, 73, 82, 0.45)" />
            <Text style={styles.link}>Choose a vertical MP4 video</Text>
          </Pressable>
        )}
      </View>
      <input ref={inputRef} type="file" accept="video/mp4" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {url && !busy && (
        <Pressable onPress={() => inputRef.current?.click()} style={{ alignSelf: 'center', margin: '10px 0' }}>
          <Text style={styles.link}>Choose a different video</Text>
        </Pressable>
      )}
      <View style={{ marginTop: 12 }}>
        <TextField label="CAPTION" value={caption} onChange={setCaption} multiline maxLength={300} placeholder="Describe the look, products, occasion…" disabled={busy} />
      </View>
    </Screen>
  );
}

// ─── Reviews and replies ─────────────────────────────────────────────────────
function useMyReviews() {
  const { data: me } = useMyArtistProfile();
  return useQuery({
    queryKey: ['reviews', me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const raw = (await reviewsApi.list(me!.id, 1)).data as unknown as { items?: Review[]; reviews?: Review[] } | Review[];
      return Array.isArray(raw) ? raw : raw.items ?? raw.reviews ?? [];
    },
  });
}

export function MyReviewsScreen() {
  const navigate = useNavigate();
  const { data = [], isLoading, error, refetch } = useMyReviews();
  return (
    <Screen title="Reviews">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load reviews" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} empty={data.length === 0} emptyTitle="No reviews yet" emptyMessage="Reviews from your clients show up here." emptyIcon="star-outline">
        {data.map((r) => (
          <ReviewCard
            key={r.id}
            review={r}
            footer={
              !r.artistResponse && (
                <Pressable onPress={() => navigate(`/partner/reviews/${r.id}/reply`)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                  <Text style={styles.link}>Reply</Text>
                </Pressable>
              )
            }
          />
        ))}
      </QueryState>
    </Screen>
  );
}

export function ReviewReplyScreen() {
  const navigate = useNavigate();
  const { reviewId = '' } = useParams();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const { data = [] } = useMyReviews();
  const review = data.find((r) => r.id === reviewId);
  const [text, setText] = useState('');
  const submit = useMutation({
    mutationFn: () => reviewsApi.respond(reviewId, text.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      showToast('Reply posted', 'success');
      navigate(-1);
    },
    onError: (e) => showToast(getErrorMessage(e, 'Could not post your reply'), 'error'),
  });
  return (
    <Screen title="Reply to Review" footer={<PrimaryButton title="Post Reply" disabled={text.trim().length < 2} loading={submit.isPending} onPress={() => submit.mutate()} />}>
      {review && <ReviewCard review={review} />}
      <TextField label="YOUR REPLY" value={text} onChange={setText} multiline maxLength={500} placeholder="Thank your client…" />
      <Text style={{ ...styles.sub, marginTop: 10 }}>Your response will be visible publicly under the client's review. Maintain a professional and courteous tone.</Text>
    </Screen>
  );
}

const styles = sheet({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 8px' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, color: '#1e1b18' },
  dot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#884952' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarLg: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cam: { position: 'absolute', right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#884952', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' as unknown as number },
  name: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13.5, color: '#857374', lineHeight: 19 },
  stat: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18' },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, color: '#857374', textTransform: 'uppercase' },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginTop: 10, width: '100%' },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#ba1a1a' },
  reelTile: { position: 'relative', aspectRatio: 9 / 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#efe6e2' },
  reelStats: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, pointerEvents: 'none' },
  reelStatText: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  reelDelete: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', maxWidth: 300, aspectRatio: 9 / 16, alignSelf: 'center', borderRadius: 20, overflow: 'hidden', backgroundColor: '#f5ebe6', borderWidth: 1, borderColor: '#efe6e2' },
});
