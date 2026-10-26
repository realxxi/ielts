import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen, palette } from '../components/ui';
import TeacherCoursesScreen from './TeacherCoursesScreen';
import TeacherTestsScreen from './TeacherTestsScreen';

type Section = 'courses' | 'tests';

export default function TeacherManagementScreen() {
  const [section, setSection] = useState<Section>('courses');
  return <AppScreen style={styles.screen}>
    <View style={styles.switcher}>
      <SwitchButton title="Kurslarim" selected={section === 'courses'} onPress={() => setSection('courses')} />
      <SwitchButton title="Testlarim" selected={section === 'tests'} onPress={() => setSection('tests')} />
    </View>
    <View style={styles.content}>{section === 'courses' ? <TeacherCoursesScreen /> : <TeacherTestsScreen />}</View>
  </AppScreen>;
}

function SwitchButton({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.button, selected && styles.selected]}><Text style={[styles.text, selected && styles.selectedText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 }, switcher: { flexDirection: 'row', gap: 9, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#dce6de', backgroundColor: '#fff' },
  button: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#dce6de' }, selected: { backgroundColor: palette.green, borderColor: palette.green }, text: { color: palette.ink, fontWeight: '700', fontSize: 13 }, selectedText: { color: '#fff' }, content: { flex: 1 },
});
