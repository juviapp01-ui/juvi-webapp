import { useNavigate } from 'react-router-dom';
import { sheet } from '@/lib/rn';
import { BackHeader, Button, Icon, Text, View } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/layouts/AppShell';

// A clearly-labelled placeholder for a page that isn't on the website yet.
// Says so plainly and points to the app, rather than a blank or broken page.
export default function ComingSoonScreen({ title, inTabs = false }: { title: string; inTabs?: boolean }) {
  const navigate = useNavigate();
  return (
    <View style={{ ...styles.safe, paddingBottom: inTabs ? TAB_BAR_SPACE : 0 }}>
      {inTabs ? <View style={{ height: 24 }} /> : <BackHeader title={title} onBack={() => navigate(-1)} />}
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Icon name="construct-outline" size={36} color="#884952" />
        </View>
        <Text style={styles.title}>{title} is coming to the website</Text>
        <Text style={styles.message}>This part of JUVI is in the app today. It will be here on the website soon.</Text>
        <View style={{ width: 200 }}>
          <Button title="Back to Home" variant="secondary" onPress={() => navigate('/home')} />
        </View>
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(136, 73, 82, 0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'HankenGrotesk_700Bold', color: '#1e1b18', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, fontFamily: 'HankenGrotesk_400Regular', color: '#857374', textAlign: 'center', marginBottom: 20, lineHeight: 20, maxWidth: 300 },
});
