import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { Gender } from '@/types';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';

export default function GenderScreen() {
  const router = useRouter();
  const { preferences, setGender } = useApp();

  const handleSelectGender = (gender: Gender) => setGender(gender);
  const canContinue = !!preferences.gender;

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe}>
        <View style={s.content}>
          <View style={s.progress}>
            <View style={[s.dot, s.dotActive]} />
            <View style={s.dot} />
            <View style={s.dot} />
            <View style={s.dot} />
          </View>

          <View style={s.header}>
            <View style={s.iconWrap}>
              <User size={30} color={palette.accent} />
            </View>
            <Text style={s.step}>Step 1 of 4</Text>
            <Text style={s.title}>Welcome to MirrorMuse</Text>
            <Text style={s.subtitle}>
              Help us personalize your experience by telling us a bit about yourself.
            </Text>
          </View>

          <View style={s.options}>
            <TouchableOpacity
              style={[s.option, preferences.gender === 'female' && s.optionSelected]}
              onPress={() => handleSelectGender('female')}
              activeOpacity={0.85}
            >
              <Text style={s.emoji}>👩</Text>
              <Text style={s.optionTitle}>Woman</Text>
              <Text style={s.optionDesc}>Soft, elegant, supportive styling</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.option, preferences.gender === 'male' && s.optionSelected]}
              onPress={() => handleSelectGender('male')}
              activeOpacity={0.85}
            >
              <Text style={s.emoji}>👨</Text>
              <Text style={s.optionTitle}>Man</Text>
              <Text style={s.optionDesc}>Clean, confident, practical styling</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.footer}>
          <Button
            title="Continue"
            onPress={() => router.push('/onboarding/vibes' as any)}
            variant="primary"
            size="large"
            disabled={!canContinue}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.lg },

  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: space.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.warmWhiteDark },
  dotActive: { backgroundColor: palette.accent, width: 24 },

  header: { marginBottom: space.xxl },
  iconWrap: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: palette.accentLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
  },
  step: { ...typo.caption, color: palette.inkMuted, marginBottom: 6 },
  title: { ...typo.screenTitle, fontSize: 28, color: palette.ink, marginBottom: 8 },
  subtitle: { ...typo.body, color: palette.inkLight, lineHeight: 24 },

  options: { gap: space.lg },
  option: {
    padding: space.xl, borderRadius: radius.card,
    backgroundColor: palette.white, alignItems: 'center',
    borderWidth: 2, borderColor: palette.borderLight,
    ...shadow.soft,
  },
  optionSelected: { borderColor: palette.accent, backgroundColor: palette.accentLight },
  emoji: { fontSize: 44, marginBottom: 10 },
  optionTitle: { ...typo.sectionHeader, color: palette.ink, marginBottom: 4 },
  optionDesc: { ...typo.caption, color: palette.inkMuted, textAlign: 'center' },

  footer: { padding: space.xl, paddingTop: space.md },
});
