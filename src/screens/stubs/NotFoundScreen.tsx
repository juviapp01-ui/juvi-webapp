import { useNavigate } from 'react-router-dom';
import { sheet } from '@/lib/rn';
import { Button, Img, Text, View } from '@/components/ui';
import { LOGO } from '@/config/constants';

// 404 — a link that doesn't lead anywhere on the site.
export default function NotFoundScreen() {
  const navigate = useNavigate();
  return (
    <View style={styles.safe}>
      <Img src={LOGO} fit="contain" lazy={false} alt="JUVI" style={{ width: 96, height: 96, margin: '0 auto 20px' }} />
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>This page doesn't exist</Text>
      <Text style={styles.message}>The link may be old or mistyped.</Text>
      <View style={{ width: 200, alignSelf: 'center' }}>
        <Button title="Go to JUVI" onPress={() => navigate('/', { replace: true })} />
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5', paddingHorizontal: 28, paddingTop: 80, alignItems: 'center' },
  code: { fontFamily: 'PlayfairDisplay_500Medium_Italic', fontSize: 48, color: '#884952', textAlign: 'center' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#1e1b18', textAlign: 'center', marginBottom: 8 },
  message: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#857374', textAlign: 'center', marginBottom: 24 },
});
