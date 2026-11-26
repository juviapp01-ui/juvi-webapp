import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheet, cx } from '@/lib/rn';
import { Icon, Pressable, Text, View } from '@/components/ui';
import { Card, InfoRow, PrimaryButton, QueryState, Screen, SectionLabel, TextField, kit } from '@/components/ui/kit';
import { walletApi } from '@/api';
import { useUIStore } from '@/store/uiStore';
import { formatPrice } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import { istDayjs } from '@/utils/ist';
import { transactionStatusInfo } from '@/utils/transactionStatus';
import { isValidIfsc, isValidUpi } from '@/utils/validation';
import type { Transaction, WalletSummary } from '@/types';

// Ports of the app's WalletScreen ("Earnings" tab), PayoutHistory and
// BankAccount. Withdrawals are requests JUVI's team pays out by bank/UPI
// transfer — there's no payment gateway involved here.

function TxRow({ t, last }: { t: Transaction; last?: boolean }) {
  const info = transactionStatusInfo(t);
  const out = t.type === 'withdrawal';
  return (
    <View style={cx(styles.txRow, last && { borderBottomWidth: 0 })}>
      <View style={cx(styles.txIcon, info.tone === 'rejected' && { backgroundColor: 'rgba(186,26,26,0.08)' })}>
        <Icon name={out ? 'arrow-up' : 'arrow-down'} size={16} color={info.tone === 'rejected' ? '#ba1a1a' : '#884952'} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.txTitle}>{out ? 'Transfer to Bank' : t.type === 'earning' ? 'Service Payment' : 'Refund'}</Text>
        <Text style={styles.sub}>
          {istDayjs(t.createdAt).format('D MMM YYYY')} · {info.label}
        </Text>
        {info.tone === 'rejected' && t.rejectionReason && <Text style={{ ...styles.sub, color: '#ba1a1a' }}>{t.rejectionReason}</Text>}
        {t.transactionRef && <Text style={styles.sub}>Ref. {t.transactionRef}</Text>}
      </View>
      <Text style={cx(styles.txAmount, out && { color: '#1e1b18' })}>
        {out ? '-' : '+'}
        {formatPrice(t.amount)}
      </Text>
    </View>
  );
}

export function WalletScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const { data: summary, isLoading, error, refetch } = useQuery<WalletSummary>({ queryKey: ['wallet'], queryFn: () => walletApi.summary().then((r) => r.data) });
  const { data: txs } = useQuery({ queryKey: ['wallet', 'transactions'], queryFn: () => walletApi.transactions(1, 10).then((r) => r.data) });
  const withdraw = useMutation({
    mutationFn: (amount: number) => walletApi.withdraw(amount),
    onSuccess: () => {
      showToast('Withdrawal requested — JUVI will transfer it soon', 'success');
      qc.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (e) => showToast(getErrorMessage(e, 'Could not process withdrawal'), 'error'),
  });
  const balance = summary?.available ?? 0;
  const hasOpenRequest = summary?.hasOpenRequest ?? false;
  const items = (txs?.items ?? []) as Transaction[];

  const onWithdraw = () => {
    if (!summary?.bankDetails && !summary?.upiId) return showToast('Add a bank account or UPI ID before requesting a withdrawal', 'error');
    if (hasOpenRequest) return showToast('You already have a withdrawal awaiting transfer', 'error');
    if (!window.confirm(`Withdraw ${formatPrice(balance)} to your ${summary?.preferredPayoutMethod === 'UPI' ? 'UPI ID' : 'bank account'}?`)) return;
    withdraw.mutate(balance);
  };

  return (
    <View style={kit.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>
      <View style={{ ...kit.content, paddingTop: 0, paddingBottom: 110 }}>
        <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load your earnings" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} skeleton={2}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <Text style={styles.balance}>{formatPrice(balance)}</Text>
            {!!summary?.pending && <Text style={styles.balanceSub}>{formatPrice(summary.pending)} on its way to your bank</Text>}
            <Pressable onPress={onWithdraw} disabled={withdraw.isPending || balance <= 0 || hasOpenRequest} style={cx(styles.withdrawBtn, (withdraw.isPending || balance <= 0 || hasOpenRequest) && { opacity: 0.5 })}>
              <Text style={styles.withdrawText}>{withdraw.isPending ? 'Requesting...' : hasOpenRequest ? 'Request Pending' : 'Withdraw Funds'}</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
            <Card style={{ flex: 1, marginBottom: 0 }}>
              <Text style={styles.statLabel}>TOTAL EARNED</Text>
              <Text style={styles.stat}>{formatPrice(summary?.total ?? 0)}</Text>
            </Card>
            <Card style={{ flex: 1, marginBottom: 0 }}>
              <Text style={styles.statLabel}>WITHDRAWN</Text>
              <Text style={styles.stat}>{formatPrice(summary?.withdrawn ?? 0)}</Text>
            </Card>
          </View>
          {summary && summary.gross > 0 && (
            <Card>
              <InfoRow label="Clients paid" value={formatPrice(summary.gross)} />
              <InfoRow label="JUVI commission" value={`-${formatPrice(summary.commission)}`} />
              <InfoRow label="Your earnings" value={formatPrice(summary.total)} strong />
            </Card>
          )}

          <Card style={{ padding: 0 }}>
            <MenuLink icon="business-outline" label="Payout details" sub={summary?.bankDetails ? `${summary.bankDetails.bankName ?? 'Bank'} ••${summary.bankDetails.accountNumber.slice(-4)}` : summary?.upiId ?? 'Add a bank account or UPI ID'} onPress={() => navigate('/partner/earnings/bank')} />
            <MenuLink icon="receipt-outline" label="Payout history" onPress={() => navigate('/partner/earnings/payouts')} last />
          </Card>

          <SectionLabel>Recent activity</SectionLabel>
          {items.length === 0 ? (
            <Text style={styles.sub}>Your completed bookings and withdrawals will show up here.</Text>
          ) : (
            <Card style={{ padding: 0 }}>
              {items.map((t, i) => (
                <TxRow key={t.id} t={t} last={i === items.length - 1} />
              ))}
            </Card>
          )}
        </QueryState>
      </View>
    </View>
  );
}

function MenuLink({ icon, label, sub, onPress, last }: { icon: 'business-outline' | 'receipt-outline'; label: string; sub?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={cx(styles.txRow, last && { borderBottomWidth: 0 })}>
      <View style={styles.txIcon}>
        <Icon name={icon} size={16} color="#884952" />
      </View>
      <View style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Text style={styles.txTitle}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <Icon name="chevron-forward" size={16} color="#d7c1c3" />
    </Pressable>
  );
}

export function PayoutHistoryScreen() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['wallet', 'transactions', 'all'], queryFn: () => walletApi.transactions(1, 100).then((r) => r.data) });
  const items = ((data?.items ?? []) as Transaction[]).filter((t) => t.type === 'withdrawal');
  return (
    <Screen title="Payout History">
      <QueryState isLoading={isLoading} error={error} errorTitle="Couldn't load payouts" errorMessage={getErrorMessage(error)} onRetry={() => refetch()} empty={items.length === 0} emptyTitle="No payouts yet" emptyMessage="Withdrawals you request show up here." emptyIcon="wallet-outline">
        <Card style={{ padding: 0 }}>
          {items.map((t, i) => (
            <TxRow key={t.id} t={t} last={i === items.length - 1} />
          ))}
        </Card>
      </QueryState>
    </Screen>
  );
}

type IfscState = { status: 'idle' | 'checking' | 'notFound' | 'unavailable' } | { status: 'found'; bank: string | null; branch: string | null; city: string | null; state: string | null };

export function BankAccountScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useBank, setUseBank] = useState(true);
  const [useUpi, setUseUpi] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [ifscInfo, setIfscInfo] = useState<IfscState>({ status: 'idle' });
  const [upiId, setUpiId] = useState('');
  const [preferred, setPreferred] = useState<'BANK' | 'UPI'>('BANK');
  const [confirmed, setConfirmed] = useState(false);
  const savedNumber = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    walletApi
      .summary()
      .then(({ data }) => {
        if (cancelled) return;
        if (data.bankDetails) {
          setUseBank(true);
          setAccountName(data.bankDetails.accountName ?? '');
          setAccountNumber(data.bankDetails.accountNumber ?? '');
          setConfirmAccount(data.bankDetails.accountNumber ?? '');
          savedNumber.current = data.bankDetails.accountNumber ?? null;
          setIfsc(data.bankDetails.ifsc ?? '');
        } else if (data.upiId) setUseBank(false);
        if (data.upiId) {
          setUseUpi(true);
          setUpiId(data.upiId);
        }
        if (data.preferredPayoutMethod) setPreferred(data.preferredPayoutMethod);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isValidIfsc(ifsc)) return setIfscInfo({ status: 'idle' });
    let cancelled = false;
    setIfscInfo({ status: 'checking' });
    walletApi
      .ifsc(ifsc)
      .then(({ data }) => !cancelled && setIfscInfo({ status: 'found', bank: data.bank, branch: data.branch, city: data.city, state: data.state }))
      .catch((e) => !cancelled && setIfscInfo(e?.response?.status === 404 ? { status: 'notFound' } : { status: 'unavailable' }));
    return () => {
      cancelled = true;
    };
  }, [ifsc]);

  const edited = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setConfirmed(false);
  };
  const numberChanged = accountNumber !== savedNumber.current;

  const save = async () => {
    if (!useBank && !useUpi) return showToast('Add a bank account, a UPI ID, or both.', 'error');
    if (useBank) {
      if (!accountName.trim() || !accountNumber || !ifsc) return showToast('Fill in the account holder name, account number and IFSC.', 'error');
      if (!/^\d{9,18}$/.test(accountNumber)) return showToast('Account number should be 9 to 18 digits.', 'error');
      if (numberChanged && accountNumber !== confirmAccount) return showToast('The two account numbers don’t match.', 'error');
      if (!isValidIfsc(ifsc) || ifscInfo.status === 'notFound') return showToast('That IFSC code isn’t valid — check your passbook or cheque book.', 'error');
    }
    if (useUpi && !isValidUpi(upiId.trim())) return showToast('That doesn’t look like a UPI ID. It should look like name@bank, e.g. 9876543210@ybl.', 'error');
    if (!confirmed) return showToast('Tick the box to confirm these details are correct and in your name.', 'error');
    setSaving(true);
    try {
      await walletApi.saveBankDetails({
        ...(useBank ? { accountName: accountName.trim(), accountNumber, ifsc } : {}),
        ...(useUpi ? { upiId: upiId.trim() } : {}),
        preferredMethod: useBank && useUpi ? preferred : useUpi ? 'UPI' : 'BANK',
        confirmed: true,
      });
      qc.invalidateQueries({ queryKey: ['wallet'] });
      showToast('Your payout details are saved.', 'success');
      navigate(-1);
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not save your payout details. Please try again.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (on: boolean, label: string, set: (v: boolean) => void) => (
    <Pressable onPress={() => { set(!on); setConfirmed(false); }} style={styles.check}>
      <Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? '#884952' : '#827378'} />
      <Text style={styles.txTitle}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen title="Payout Details" footer={<PrimaryButton title="Save Details" disabled={!confirmed} loading={saving} onPress={save} />}>
      <QueryState isLoading={loading} skeleton={2}>
        <Text style={{ ...styles.sub, marginBottom: 12 }}>Where JUVI sends your withdrawals. Details must be in your own name.</Text>
        <Card>
          {toggle(useBank, 'Bank account', setUseBank)}
          {useBank && (
            <View style={{ gap: 12, marginTop: 12 }}>
              <TextField label="ACCOUNT HOLDER NAME" value={accountName} onChange={edited(setAccountName)} autoComplete="name" />
              <TextField label="ACCOUNT NUMBER" value={accountNumber} onChange={edited((v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 18)))} inputMode="numeric" />
              {numberChanged && <TextField label="CONFIRM ACCOUNT NUMBER" value={confirmAccount} onChange={edited((v) => setConfirmAccount(v.replace(/\D/g, '').slice(0, 18)))} inputMode="numeric" />}
              <TextField label="IFSC" value={ifsc} onChange={edited((v) => setIfsc(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)))} maxLength={11} />
              {ifscInfo.status === 'checking' && <Text style={styles.sub}>Checking IFSC…</Text>}
              {ifscInfo.status === 'found' && (
                <Text style={{ ...styles.sub, color: '#2E7D32' }}>
                  {[ifscInfo.bank, ifscInfo.branch, ifscInfo.city].filter(Boolean).join(' · ')}
                </Text>
              )}
              {ifscInfo.status === 'notFound' && <Text style={{ ...styles.sub, color: '#ba1a1a' }}>No bank branch has that IFSC.</Text>}
              {ifscInfo.status === 'unavailable' && <Text style={styles.sub}>Couldn’t check the IFSC right now — you can still save.</Text>}
            </View>
          )}
        </Card>
        <Card>
          {toggle(useUpi, 'UPI ID', setUseUpi)}
          {useUpi && (
            <View style={{ marginTop: 12 }}>
              <TextField label="UPI ID" value={upiId} onChange={edited(setUpiId)} placeholder="9876543210@ybl" />
            </View>
          )}
        </Card>
        {useBank && useUpi && (
          <Card>
            <Text style={styles.statLabel}>SEND PAYOUTS TO</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['BANK', 'UPI'] as const).map((m) => (
                <Pressable key={m} onPress={() => { setPreferred(m); setConfirmed(false); }} style={cx(styles.choice, preferred === m && styles.choiceOn)}>
                  <Text style={cx(styles.choiceText, preferred === m && { color: '#FFFFFF' })}>{m === 'BANK' ? 'Bank account' : 'UPI'}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}
        <Pressable onPress={() => setConfirmed(!confirmed)} style={styles.check}>
          <Icon name={confirmed ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={confirmed ? '#884952' : '#827378'} />
          <Text style={{ ...styles.sub, color: '#1e1b18', flex: 1 }}>I confirm these details are correct and in my name.</Text>
        </Pressable>
      </QueryState>
    </Screen>
  );
}

const styles = sheet({
  header: { padding: '20px 20px 12px' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, color: '#1e1b18' },
  sub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: '#857374', lineHeight: 19 },
  balanceCard: { backgroundColor: '#350B22', borderRadius: 24, padding: 24, gap: 6, marginBottom: 14 },
  balanceLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)' },
  balance: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 40, color: '#FFFFFF' },
  balanceSub: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  withdrawBtn: { marginTop: 12, backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  withdrawText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: '#350B22' },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10.5, letterSpacing: 1.2, color: '#857374' },
  stat: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#1e1b18', marginTop: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#f3ece8', width: '100%' },
  txIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fbf2ed', alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, color: '#1e1b18' },
  txAmount: { fontFamily: 'HankenGrotesk_700Bold', fontSize: 15, color: '#2E7D32' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  choice: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#d7c1c3', alignItems: 'center' },
  choiceOn: { backgroundColor: '#884952', borderColor: '#884952' },
  choiceText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#524344' },
});
