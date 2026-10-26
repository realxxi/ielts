import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const palette = {
  background: '#f3f7f2',
  surface: '#ffffff',
  ink: '#18392a',
  muted: '#68766d',
  green: '#1b6d48',
  border: '#dce6de',
  error: '#b42318',
  warning: '#9a5d0a',
};

export function AppScreen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }, style]}>{children}</View>;
}

export function AppButton({ title, onPress, loading = false, disabled = false, variant = 'primary' }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger';
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={loading || disabled} style={[styles.button, styles[`button_${variant}`], (loading || disabled) && styles.disabled]}>
    {loading ? <ActivityIndicator color={variant === 'secondary' ? palette.green : '#fff'} /> : <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText]}>{title}</Text>}
  </Pressable>;
}

export function AppInput({ label, error, style, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#89958d" style={[styles.input, style]} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.titleBlock}><Text style={styles.screenTitle}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>;
}

export function Feedback({ message, variant = 'error' }: { message: string; variant?: 'error' | 'success' | 'warning' }) {
  if (!message) return null;
  const variantStyle = variant === 'success' ? styles.feedback_success : variant === 'warning' ? styles.feedback_warning : styles.feedback_error;
  return <Text accessibilityRole={variant === 'error' ? 'alert' : 'text'} style={[styles.feedback, variantStyle]}>{message}</Text>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <View style={styles.empty}><Text style={styles.emptyTitle}>{title}</Text>{detail ? <Text style={styles.subtitle}>{detail}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background, paddingHorizontal: 18 },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  button_primary: { backgroundColor: palette.green }, button_secondary: { backgroundColor: '#edf5ef', borderWidth: 1, borderColor: '#cbdccf' }, button_danger: { backgroundColor: '#a52a2a' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 }, secondaryText: { color: palette.green }, disabled: { opacity: 0.55 },
  field: { marginBottom: 14 }, label: { color: '#293a30', fontSize: 14, fontWeight: '600', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, borderRadius: 11, paddingHorizontal: 13, color: palette.ink, fontSize: 16 },
  card: { backgroundColor: palette.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: palette.border, marginBottom: 12 },
  titleBlock: { marginTop: 8, marginBottom: 16 }, screenTitle: { color: palette.ink, fontSize: 27, lineHeight: 34, fontWeight: '700' }, subtitle: { color: palette.muted, fontSize: 14, lineHeight: 20, marginTop: 5 },
  feedback: { fontSize: 14, lineHeight: 20, marginVertical: 8 }, feedback_error: { color: palette.error }, feedback_success: { color: palette.green }, feedback_warning: { color: palette.warning },
  empty: { padding: 24, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center' }, emptyTitle: { color: palette.ink, fontWeight: '700', fontSize: 16, textAlign: 'center' },
});
