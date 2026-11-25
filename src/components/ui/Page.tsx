import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { sheet } from '@/lib/rn';
import { Button } from './index';
import { Icon } from './Icon';
import { Text, View } from './primitives';

// Sets the browser tab title for a page: "Home · JUVI".
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · JUVI` : 'JUVI — Luxury Beauty on Demand';
  }, [title]);
}

export function Page({ title, children }: { title?: string; children: ReactNode }) {
  useTitle(title);
  return <>{children}</>;
}

// Catches a crash in one page and offers a way back, instead of a blank screen.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <Icon name="alert-circle-outline" size={40} color="#C0392B" />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>Please reload the page. If it keeps happening, try again in a few minutes.</Text>
        <View style={{ width: 192 }}>
          <Button title="Reload" onPress={() => window.location.reload()} />
        </View>
      </View>
    );
  }
}

const styles = sheet({
  wrap: { flex: 1, minHeight: '100vh', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#fff8f5' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(136, 73, 82, 0.06)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'HankenGrotesk_700Bold', color: '#1e1b18', marginBottom: 6, textAlign: 'center' },
  message: { fontSize: 14, fontFamily: 'HankenGrotesk_400Regular', color: '#857374', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
});
