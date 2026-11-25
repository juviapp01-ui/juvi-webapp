import { sheet } from '@/lib/rn';
import { Img, Text, View } from '@/components/ui';
import { LOGO } from '@/config/constants';

// Shown instead of the site when required settings are missing from .env,
// so a fresh checkout says what to fill in rather than failing with a blank
// page or a confusing network error. Lists names only, never values.
export default function MissingEnvScreen({ missing }: { missing: string[] }) {
  return (
    <View style={styles.safe}>
      <Img src={LOGO} fit="contain" lazy={false} alt="JUVI" style={{ width: 96, height: 96, margin: '0 auto 16px' }} />
      <Text style={styles.title}>Website settings missing</Text>
      <Text style={styles.message}>
        Copy <Text style={styles.code}>.env.example</Text> to <Text style={styles.code}>.env</Text> in the web folder, fill in these
        values, then restart the dev server:
      </Text>
      <View style={styles.list}>
        {missing.map((name) => (
          <Text key={name} style={styles.item}>
            {name}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = sheet({
  safe: { flex: 1, minHeight: '100vh', backgroundColor: '#fff8f5', paddingHorizontal: 28, paddingTop: 56 },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 24, color: '#1e1b18', textAlign: 'center', marginBottom: 12 },
  message: { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, color: '#524344', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  code: { fontFamily: 'Inter_600SemiBold', color: '#884952' },
  list: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#efe6e2', borderRadius: 12, padding: 16, gap: 8 },
  item: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#1e1b18' },
});
