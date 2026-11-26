import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Icon, Img, Pressable, Spinner, Text, View } from '@/components/ui';
import { Card, PrimaryButton, QueryState, Screen, SectionLabel, TextField } from '@/components/ui/kit';
import { artistApplicationApi, artistsApi, onboardingApi, portfolioApi, profileApi, servicesApi } from '@/api';
import { useServiceCategories } from '@/hooks';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { SERVICE_CATEGORIES } from '@/config/constants';
import { getErrorMessage } from '@/utils/errors';
import { imageContentType, putToSignedUrl } from '@/utils/upload';

// Ports of the app's ApplicationStatus and the partner onboarding steps
// (Profile → Services → Portfolio → Studio, then submit for review). For an
// approved artist the same Services / Portfolio / Studio pages edit the live
// profile, like the app's edit mode.

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function uploadImage(file: File, presign: (type: string) => Promise<{ data: { uploadUrl: string; fileUrl: string } }>) {
  const type = imageContentType(file);
  const { data } = await presign(type);
  await putToSignedUrl(data.uploadUrl, file, { 'Content-Type': type });
  return data.fileUrl;
}

function StepHeader({ step, badge, heading }: { step: number; badge: string; heading: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={styles.stepLabel}>STEP {String(step).padStart(2, '0')} OF 04</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      </View>
      <View style={styles.progress}>
        <View style={{ ...styles.progressFill, width: `${step * 25}%` }} />
      </View>
      <Text style={styles.heading}>{heading}</Text>
    </View>
  );
}

// ─── Application status ──────────────────────────────────────────────────────
export function ApplicationStatusScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { logout, setUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['artist-application-status'], queryFn: () => artistApplicationApi.getApplicationStatus().then((r) => r.data) });
  const status = String(data?.status ?? 'none').toLowerCase();

  const refreshAccess = async () => {
    setRefreshing(true);
    try {
      const { data: d } = await profileApi.get();
      setUser(d.user);
      if (d.user.role === 'ARTIST') {
        showToast('Welcome, Artist! Your account now has artist access.', 'success');
        navigate('/partner', { replace: true });
      } else showToast('Not approved yet — your application is still pending review.', 'info');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not refresh access. Please log out and back in instead.'), 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const view = (icon: 'brush-outline' | 'create-outline' | 'hourglass-outline' | 'checkmark-circle-outline' | 'close-circle', tint: string, title: string, message: string, actions: ReactNode) => (
    <View style={{ alignItems: 'center', textAlign: 'center', gap: 12, padding: '32px 8px' }}>
      <View style={{ ...styles.iconBadge, backgroundColor: `${tint}14` }}>
        <Icon name={icon} size={36} color={tint} />
      </View>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={{ width: '100%', gap: 10, marginTop: 8 }}>{actions}</View>
    </View>
  );

  return (
    <Screen title="Become an Artist" onBack={() => navigate('/profile')}>
      <QueryState isLoading={isLoading} error={error} errorTitle="Could not load status" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} skeleton={2}>
        {status === 'none' &&
          view('brush-outline', '#884952', 'Become a JUVI Artist', 'Apply to join our network of makeup artists. Our team will review your application before you get artist access.', <PrimaryButton title="Apply Now" onPress={() => navigate('/partner/apply/profile')} />)}
        {status === 'pending' &&
          view('create-outline', '#685c56', 'Application In Progress', data?.message || "You've started your application but haven't submitted it yet. Finish the remaining steps to send it for review.", <PrimaryButton title="Continue Application" onPress={() => navigate('/partner/apply/profile')} />)}
        {status === 'under_review' &&
          view('hourglass-outline', '#685c56', 'Application Under Review', data?.message || 'Thanks for applying! Our team is reviewing your profile. This usually takes 1–2 working days.', <PrimaryButton title="Refresh Status" tone="ink" onPress={() => refetch()} />)}
        {status === 'approved' &&
          view(
            'checkmark-circle-outline',
            '#2E7D32',
            "You're Approved!",
            'Congratulations — your artist application has been approved. Refresh your access to open the partner area.',
            <>
              <PrimaryButton title="Refresh Access" loading={refreshing} onPress={refreshAccess} />
              <PrimaryButton
                title="Log Out Instead"
                tone="ink"
                onPress={() => {
                  logout();
                  qc.clear();
                  navigate('/login', { replace: true });
                }}
              />
            </>
          )}
        {status === 'rejected' &&
          view('close-circle', '#ba1a1a', 'Application Rejected', data?.message || 'Unfortunately your application was not approved this time.', <PrimaryButton title="Contact Support" onPress={() => (window.location.href = 'mailto:support@juviapp.com')} />)}
        {!['none', 'pending', 'under_review', 'approved', 'rejected'].includes(status) &&
          view('alert-circle-outline' as never, '#685c56', 'Unknown Status', `We received an unknown status: ${status}. Please refresh.`, <PrimaryButton title="Refresh Status" tone="ink" onPress={() => refetch()} />)}
      </QueryState>
    </Screen>
  );
}

// ─── Step 1: profile ─────────────────────────────────────────────────────────
function ImagePick({ label, url, busy, onPick }: { label: string; url?: string; busy?: boolean; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Pressable onPress={() => ref.current?.click()} style={styles.docPick} ariaLabel={label}>
      {url ? <Img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : busy ? <Spinner /> : <Icon name="camera-outline" size={22} color="#884952" />}
      {!url && !busy && <Text style={styles.docLabel}>{label}</Text>}
      <input ref={ref} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </Pressable>
  );
}

export function OnboardingProfileScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState((user?.phone ?? '').replace(/^\+?91/, ''));
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(user?.profileImage);
  const [aadhaar, setAadhaar] = useState('');
  const [front, setFront] = useState<string>();
  const [back, setBack] = useState<string>();
  const [uploading, setUploading] = useState<'front' | 'back' | null>(null);
  const [saving, setSaving] = useState(false);
  // Aadhaar is only required the first time (the backend's rule) — an
  // application already started keeps the one on file.
  const [hasProfile, setHasProfile] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    artistsApi
      .getMyProfile()
      .then(({ data }) => {
        if (data?.id) setHasProfile(true);
        if (data.title) setTitle(data.title);
        if (data.bio) setBio(data.bio);
        if (data.aadhaarNumber) setAadhaar(data.aadhaarNumber);
        if (data.aadhaarPhotoUrl) setFront(data.aadhaarPhotoUrl);
      })
      .catch(() => {});
  }, []);

  const uploadSide = async (side: 'front' | 'back', f: File) => {
    setUploading(side);
    try {
      const url = await uploadImage(f, (t) => onboardingApi.presignAadhaar(t));
      (side === 'front' ? setFront : setBack)(url);
    } catch (e) {
      showToast(getErrorMessage(e, `Could not upload Aadhaar ${side} photo`), 'error');
    } finally {
      setUploading(null);
    }
  };

  const phoneValid = /^\d{10}$/.test(phone);
  const aadhaarOk = hasProfile ? !aadhaar || aadhaar.length === 12 : aadhaar.length === 12 && !!front && !!back;
  const ok = !!name.trim() && phoneValid && isEmail(email.trim()) && aadhaarOk && !uploading;

  const onContinue = async () => {
    if (!ok) return showToast('Fill in your name, a valid email and phone, your 12-digit Aadhaar and both Aadhaar photos.', 'error');
    setSaving(true);
    try {
      let finalPhoto = photoUrl;
      if (photo) finalPhoto = await uploadImage(photo, (t) => profileApi.presignUpload(t));
      await onboardingApi.saveStep(1, { name: name.trim(), email: email.trim(), title: title.trim(), bio: bio.trim(), photoUrl: finalPhoto, phone, ...(aadhaar ? { aadhaarNumber: aadhaar } : {}), ...(front ? { aadhaarFrontUrl: front } : {}), ...(back ? { aadhaarBackUrl: back } : {}) });
      navigate('/partner/apply/services');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save your profile'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Partner Application" footer={<PrimaryButton title="Continue →" loading={saving} disabled={!ok} onPress={onContinue} />}>
      <StepHeader step={1} badge="PROFILE" heading="Build Your Professional Identity" />
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Pressable onPress={() => photoRef.current?.click()} style={styles.avatar} ariaLabel="Profile photo">
          {photoUrl ? <Img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="camera-outline" size={28} color="#884952" />}
        </Pressable>
        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setPhoto(f);
            setPhotoUrl(URL.createObjectURL(f));
          }}
        />
      </View>
      <View style={{ gap: 14 }}>
        <TextField label="FULL NAME" value={name} onChange={setName} placeholder="E.g. Julieanna Viviano" autoComplete="name" />
        <TextField label="EMAIL" value={email} onChange={setEmail} placeholder="julieanna@example.com" type="email" autoComplete="email" />
        <TextField label="PROFESSIONAL TITLE" value={title} onChange={setTitle} placeholder="E.g. Master Bridal Stylist" maxLength={60} />
        <TextField label="BIO" value={bio} onChange={setBio} multiline maxLength={600} placeholder="Briefly describe your artistry, experience, and the unique value you bring to elite clients..." />
        <TextField label="PHONE" value={phone} onChange={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel-national" />
        <TextField label="AADHAAR NUMBER" value={aadhaar} onChange={(v) => setAadhaar(v.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit Aadhaar number" inputMode="numeric" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <ImagePick label="Aadhaar front" url={front} busy={uploading === 'front'} onPick={(f) => uploadSide('front', f)} />
          <ImagePick label="Aadhaar back" url={back} busy={uploading === 'back'} onPick={(f) => uploadSide('back', f)} />
        </View>
        <Text style={styles.message}>Your Aadhaar is only used to verify your identity and is never shown to clients.</Text>
      </View>
    </Screen>
  );
}

// ─── Step 2: services ────────────────────────────────────────────────────────
const DURATIONS: [string, number][] = [
  ['30 min', 30],
  ['45 min', 45],
  ['1 hr', 60],
  ['1 hr 30 min', 90],
  ['2 hr', 120],
  ['2 hr 30 min', 150],
  ['3 hr', 180],
];
type CatalogService = { id: string; name: string; price: string; duration: number; description: string; category: string; visibleTo: 'ALL' | 'FEMALE' | 'MALE'; saved?: boolean };

export function OnboardingServicesScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = useAuthStore((s) => s.user?.role === 'ARTIST');
  const showToast = useUIStore((s) => s.showToast);
  const { data: cats } = useServiceCategories();
  const categories: string[] = cats?.length ? cats.map((c: { title: string }) => c.title) : [...SERVICE_CATEGORIES];
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CatalogService | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    artistsApi
      .getMyProfile()
      .then(({ data }) =>
        setCatalog(
          (data.services ?? []).map((s: any) => ({ id: s.id, name: s.title, price: String(s.price), duration: s.durationMin ?? 60, description: s.description ?? '', category: s.category ?? '', visibleTo: s.visibleTo ?? 'ALL', saved: true }))
        )
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveForm = () => {
    if (!form) return;
    if (!form.name.trim() || !Number(form.price) || !form.category) return showToast('Add a name, a price and a category.', 'error');
    setCatalog((c) => (c.some((s) => s.id === form.id) ? c.map((s) => (s.id === form.id ? form : s)) : [...c, form]));
    setForm(null);
  };
  const remove = async (s: CatalogService) => {
    if (isEdit && s.saved) {
      if (!window.confirm(`Remove "${s.name}"? Clients won't be able to book it.`)) return;
      try {
        await servicesApi.delete(s.id);
      } catch (e) {
        return showToast(getErrorMessage(e, 'Could not remove that service'), 'error');
      }
    }
    setCatalog((c) => c.filter((x) => x.id !== s.id));
  };
  const onContinue = async () => {
    if (catalog.length === 0) return showToast('Add at least one service', 'error');
    setSaving(true);
    try {
      const { data } = await onboardingApi.saveStep(3, {
        services: catalog.map(({ saved, ...s }) => ({ ...s, id: saved ? s.id : undefined, name: s.name.trim(), price: Number(s.price), duration: s.duration })),
      });
      const back = (data as { services?: { id: string }[] })?.services;
      if (Array.isArray(back) && back.length === catalog.length) setCatalog((c) => c.map((s, i) => ({ ...s, id: back[i].id, saved: true })));
      if (isEdit) {
        qc.invalidateQueries({ queryKey: ['artist', 'me'] });
        showToast('Services updated', 'success');
        navigate(-1);
      } else navigate('/partner/apply/portfolio');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save your services'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof CatalogService>(k: K) => (v: CatalogService[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <Screen title={isEdit ? 'Service Catalog' : 'Partner Application'} footer={!form ? <PrimaryButton title={isEdit ? 'Save Services' : 'Continue →'} loading={saving} onPress={onContinue} /> : undefined}>
      {!isEdit && <StepHeader step={2} badge="SERVICES" heading="Service Catalog" />}
      <QueryState isLoading={loading} skeleton={2}>
        {catalog.map((s) => (
          <Card key={s.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.label}>{s.name}</Text>
                <Text style={styles.message}>
                  ₹{s.price} · {DURATIONS.find(([, m]) => m === s.duration)?.[0] ?? `${s.duration} min`} · {s.category}
                </Text>
              </View>
              <Pressable onPress={() => setForm(s)}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => remove(s)}>
                <Text style={{ ...styles.link, color: '#ba1a1a' }}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        ))}
        {form ? (
          <Card>
            <View style={{ gap: 12 }}>
              <TextField label="SERVICE NAME" value={form.name} onChange={set('name')} placeholder="e.g. Red Carpet Masterclass" maxLength={80} />
              <TextField label="PRICE (₹)" value={form.price} onChange={(v) => set('price')(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="250" />
              <View>
                <Text style={styles.fieldLabel}>DURATION</Text>
                <select value={form.duration} onChange={(e) => set('duration')(Number(e.target.value))} style={selectStyle} aria-label="Duration">
                  {DURATIONS.map(([l, m]) => (
                    <option key={m} value={m}>{l}</option>
                  ))}
                </select>
              </View>
              <View>
                <Text style={styles.fieldLabel}>CATEGORY</Text>
                <select value={form.category} onChange={(e) => set('category')(e.target.value)} style={selectStyle} aria-label="Category">
                  <option value="" disabled>Choose category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </View>
              <View>
                <Text style={styles.fieldLabel}>OFFERED TO</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['ALL', 'FEMALE', 'MALE'] as const).map((v) => (
                    <Pressable key={v} onPress={() => set('visibleTo')(v)} style={cx(styles.choice, form.visibleTo === v && styles.choiceOn)}>
                      <Text style={cx(styles.choiceText, form.visibleTo === v && { color: '#FFFFFF' })}>{v === 'ALL' ? 'Everyone' : v === 'FEMALE' ? 'Women' : 'Men'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <TextField label="DESCRIPTION" value={form.description} onChange={set('description')} multiline maxLength={400} placeholder="Briefly describe the experience and products used..." />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Cancel" tone="ink" onPress={() => setForm(null)} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton title="Save Service" onPress={saveForm} />
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Pressable onPress={() => setForm({ id: `new-${Date.now()}`, name: '', price: '', duration: 45, description: '', category: '', visibleTo: 'ALL' })} style={styles.addBtn}>
            <Icon name="add-circle-outline" size={20} color="#884952" />
            <Text style={styles.link}>Add a service</Text>
          </Pressable>
        )}
      </QueryState>
    </Screen>
  );
}

// ─── Step 3: portfolio ───────────────────────────────────────────────────────
type PortfolioImage = { id?: string; url: string; file?: File; category: string | null; savedCategory?: string | null };

export function OnboardingPortfolioScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = useAuthStore((s) => s.user?.role === 'ARTIST');
  const showToast = useUIStore((s) => s.showToast);
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    artistsApi
      .getMyProfile()
      .then(async ({ data }) => {
        setCategories(Array.from(new Set((data.services ?? []).map((s: any) => s.category).filter(Boolean))) as string[]);
        const { data: items } = await artistsApi.portfolio(data.id);
        setImages(items.map((p) => ({ id: p.id, url: p.imageUrl, category: p.category ?? null, savedCategory: p.category ?? null })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const remove = async (i: number) => {
    const item = images[i];
    if (isEdit && item.id) {
      try {
        await portfolioApi.delete(item.id);
      } catch (e) {
        return showToast(getErrorMessage(e, 'Could not remove that photo'), 'error');
      }
    }
    setImages((prev) => prev.filter((_, x) => x !== i));
  };

  const onComplete = async () => {
    if (images.length === 0) return showToast('Add at least one portfolio image before submitting', 'error');
    if (categories.length > 0 && images.some((img) => !img.category)) return showToast('Tag every photo with the service it shows', 'error');
    setSaving(true);
    try {
      const uploaded = await Promise.all(images.map(async (img) => (img.file ? { ...img, url: await uploadImage(img.file, (t) => onboardingApi.presignPortfolio('image', t)), file: undefined } : img)));
      if (isEdit) {
        for (const img of uploaded) {
          if (!img.id) await portfolioApi.add({ imageUrl: img.url, category: img.category });
          else if ((img.category ?? null) !== (img.savedCategory ?? null)) await portfolioApi.update(img.id, { category: img.category });
        }
        qc.invalidateQueries({ queryKey: ['artist', 'me'] });
        showToast('Portfolio updated', 'success');
        navigate(-1);
        return;
      }
      setImages(uploaded);
      await onboardingApi.saveStep(4, { images: uploaded.map((img) => ({ imageUrl: img.url, category: img.category })), reels: [] });
      navigate('/partner/apply/studio');
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save your portfolio'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={isEdit ? 'Portfolio' : 'Partner Application'} footer={<PrimaryButton title={isEdit ? 'Save Portfolio' : 'Continue →'} loading={saving} onPress={onComplete} />}>
      {!isEdit && <StepHeader step={3} badge="PORTFOLIO" heading="Curate Your Artistry" />}
      <QueryState isLoading={loading} skeleton={2}>
        <SectionLabel>IMAGE PORTFOLIO</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {images.map((img, i) => (
            <View key={img.id ?? img.url} style={styles.tile}>
              <Img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <Pressable onPress={() => remove(i)} style={styles.tileRemove} ariaLabel="Remove photo">
                <Icon name="close" size={14} color="#FFFFFF" />
              </Pressable>
              {categories.length > 0 && (
                <select
                  value={img.category ?? ''}
                  onChange={(e) => setImages((prev) => prev.map((p, x) => (x === i ? { ...p, category: e.target.value || null } : p)))}
                  aria-label="Service shown"
                  style={{ position: 'absolute', left: 6, right: 6, bottom: 6, padding: '6px 8px', borderRadius: 999, border: 0, background: img.category ? 'rgba(136,73,82,0.92)' : 'rgba(0,0,0,0.6)', color: '#FFFFFF', fontSize: 11.5, fontFamily: 'Inter, sans-serif' }}
                >
                  <option value="">Choose category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </View>
          ))}
          <Pressable onPress={() => fileRef.current?.click()} style={{ ...styles.tile, alignItems: 'center', justifyContent: 'center', gap: 6, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#d7c1c3' }}>
            <Icon name="add" size={28} color="#884952" />
            <Text style={styles.link}>Add photos</Text>
          </Pressable>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).filter((f) => f.size <= 10 * 1024 * 1024);
            setImages((prev) => [...prev, ...files.map((f) => ({ url: URL.createObjectURL(f), file: f, category: null }))]);
            e.target.value = '';
          }}
        />
      </QueryState>
    </Screen>
  );
}

// ─── Step 4: studio & location ───────────────────────────────────────────────
// The app drops a pin on a map. The website uses the browser's location
// instead (no maps key needed): the artist stands at their studio/base or
// keeps the location already saved.
export function OnboardingStudioScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = useAuthStore((s) => s.user?.role === 'ARTIST');
  const showToast = useUIStore((s) => s.showToast);
  const [hasStudio, setHasStudio] = useState<boolean | null>(null);
  const [homeService, setHomeService] = useState(true);
  const [flat, setFlat] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressText, setAddressText] = useState('');
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    artistsApi
      .getMyProfile()
      .then(({ data }) => {
        if (data.latitude != null && data.longitude != null) setPin({ latitude: data.latitude, longitude: data.longitude });
        if (data.studioAddress) {
          setHasStudio(true);
          setAddressText(data.studioAddress);
        } else if (isEdit) setHasStudio(false);
        if (typeof data.offersHomeService === 'boolean') setHomeService(data.offersHomeService);
      })
      .catch(() => {});
  }, [isEdit]);

  const locate = () => {
    if (!navigator.geolocation) return showToast('This browser can’t share its location.', 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        showToast('Allow location access in your browser to set your location.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const fullAddress = [flat.trim(), area.trim(), landmark.trim() ? `Near ${landmark.trim()}` : '', city.trim(), pincode.trim()].filter(Boolean).join(', ');
  const addressValid = !!flat.trim() && !!area.trim() && !!city.trim() && /^[1-9][0-9]{5}$/.test(pincode.trim());
  const useTextAddress = isEdit && !!addressText;

  const onContinue = async () => {
    if (hasStudio === null) return showToast('Let us know if you have a studio', 'error');
    if (!pin) return showToast(hasStudio ? 'Set your studio location' : 'Set your base location', 'error');
    setSaving(true);
    try {
      if (isEdit) {
        if (hasStudio && !(useTextAddress ? addressText.trim() : addressValid)) {
          setSaving(false);
          return showToast('Enter your studio address', 'error');
        }
        await artistsApi.updateProfile({ studioAddress: hasStudio ? (useTextAddress ? addressText.trim() : fullAddress) : '', latitude: pin.latitude, longitude: pin.longitude, offersHomeService: hasStudio ? homeService : true });
        await qc.invalidateQueries({ queryKey: ['artist', 'me'] });
        showToast('Studio & location updated', 'success');
        navigate(-1);
        return;
      }
      if (hasStudio && !addressValid) {
        setSaving(false);
        return showToast('Fill in your flat/building, area, city and a valid 6-digit pincode', 'error');
      }
      await onboardingApi.saveStep(5, { hasStudio, ...(hasStudio && { studioAddress: fullAddress }), latitude: pin.latitude, longitude: pin.longitude, offersHomeService: hasStudio ? homeService : true });
      await onboardingApi.submit();
      qc.invalidateQueries({ queryKey: ['artist-application-status'] });
      showToast('Your application has been submitted for review', 'success');
      navigate('/partner', { replace: true });
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not complete setup'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={isEdit ? 'Studio & Location' : 'Partner Application'} footer={<PrimaryButton title={isEdit ? 'Save' : 'Submit Application'} loading={saving} onPress={onContinue} />}>
      {!isEdit && <StepHeader step={4} badge="WHERE YOU WORK" heading="Where Clients Find You" />}
      <SectionLabel>Do you have a studio?</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[
          [true, 'Yes, I have a studio'],
          [false, 'Home visits only'],
        ].map(([v, l]) => (
          <Pressable key={String(v)} onPress={() => setHasStudio(v as boolean)} style={cx(styles.choice, hasStudio === v && styles.choiceOn)}>
            <Text style={cx(styles.choiceText, hasStudio === v && { color: '#FFFFFF' })}>{l as string}</Text>
          </Pressable>
        ))}
      </View>
      {hasStudio && (
        <Card>
          {useTextAddress ? (
            <TextField label="STUDIO ADDRESS" value={addressText} onChange={setAddressText} multiline placeholder="Flat/building, area, landmark, city, pincode" />
          ) : (
            <View style={{ gap: 12 }}>
              <TextField label="FLAT / BUILDING" value={flat} onChange={setFlat} placeholder="E.g. B-402, Sunrise Apartments" />
              <TextField label="AREA / LOCALITY" value={area} onChange={setArea} placeholder="E.g. Near City Mall, MG Road" />
              <TextField label="LANDMARK (OPTIONAL)" value={landmark} onChange={setLandmark} placeholder="E.g. Opposite HDFC Bank" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextField label="CITY" value={city} onChange={setCity} placeholder="City" />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label="PINCODE" value={pincode} onChange={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" />
                </View>
              </View>
            </View>
          )}
          <Pressable onPress={() => setHomeService(!homeService)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <Icon name={homeService ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={homeService ? '#884952' : '#827378'} />
            <Text style={styles.label}>I also do home visits</Text>
          </Pressable>
        </Card>
      )}
      <SectionLabel>{hasStudio ? 'Studio location' : 'Your base location'}</SectionLabel>
      <Card>
        <Text style={styles.message}>
          {pin ? `Location set (${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}). Clients nearby will see you.` : 'Used to show you to clients nearby and to work out travel distance.'}
        </Text>
        <View style={{ marginTop: 12 }}>
          <PrimaryButton title={pin ? 'Update to my current location' : 'Use my current location'} tone="ink" loading={locating} onPress={locate} />
        </View>
      </Card>
    </Screen>
  );
}

const selectStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 12, border: '1px solid #e8dcd8', background: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: 14 };

const styles = sheet({
  stepLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: '#857374' },
  badge: { backgroundColor: '#fbf2ed', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, color: '#884952' },
  progress: { height: 4, borderRadius: 2, backgroundColor: '#efe6e2', overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: 4, backgroundColor: '#884952' },
  heading: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#1e1b18', lineHeight: 32 },
  message: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#857374', lineHeight: 20 },
  label: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: '#524344', letterSpacing: 1.5, marginBottom: 8 },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#884952' },
  iconBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#f5ebe6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  docPick: { flex: 1, height: 110, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d7c1c3', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 6, overflow: 'hidden' },
  docLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#857374' },
  choice: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: '#d7c1c3', alignItems: 'center', backgroundColor: '#FFFFFF' },
  choiceOn: { backgroundColor: '#884952', borderColor: '#884952' },
  choiceText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#524344', textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#d7c1c3', width: '100%' },
  tile: { position: 'relative', aspectRatio: 4 / 5, borderRadius: 14, overflow: 'hidden', backgroundColor: '#f5ebe6' },
  tileRemove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
