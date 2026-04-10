import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { space, radius, palette, type as typo } from '@/constants/theme';
import { FEMALE_STYLE_VIBES, MALE_STYLE_VIBES, StyleVibe } from '@/types';

export default function VibesScreen() {
  const router = useRouter();
  const { preferences, setVibes } = useApp();

  const styleVibes = preferences.gender === 'male' ? MALE_STYLE_VIBES : FEMALE_STYLE_VIBES;

  const toggleVibe = (vibe: StyleVibe) => {
    const current = preferences.vibes;
    if (current.includes(vibe)) {
      setVibes(current.filter(v => v !== vibe));
    } else if (current.length < 3) {
      setVibes([...current, vibe]);
    }
  };

  const canContinue = preferences.vibes.length >= 1;

  return (
    <View style={[styles.container, { backgroundColor: palette.warmWhite }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <IconButton
              icon={<ArrowLeft size={20} color={palette.ink} />}
              onPress={() => router.back()}
              size={40}
            />
            <View style={styles.progress}>
              <View style={[styles.progressDot, { backgroundColor: palette.warmWhiteDark }]} />
              <View style={[styles.progressDot, styles.progressActive, { backgroundColor: palette.accent }]} />
              <View style={[styles.progressDot, { backgroundColor: palette.warmWhiteDark }]} />
              <View style={[styles.progressDot, { backgroundColor: palette.warmWhiteDark }]} />
            </View>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: palette.accentLight }]}>
              <Sparkles size={28} color={palette.accent} />
            </View>
            <Text style={[styles.step, { color: palette.inkLight }]}>Step 2 of 4</Text>
            <Text style={[styles.title, { color: palette.ink }]}>What's your vibe?</Text>
            <Text style={[styles.subtitle, { color: palette.inkLight }]}>
              Pick up to 3 style aesthetics that resonate with you.
              This helps us tailor suggestions to your taste.
            </Text>
          </View>

          <View style={styles.chips}>
            {styleVibes.map((vibe) => (
              <Chip
                key={vibe}
                label={vibe}
                selected={preferences.vibes.includes(vibe)}
                onPress={() => toggleVibe(vibe)}
                size="large"
                style={styles.chip}
              />
            ))}
          </View>

          <Text style={[styles.hint, { color: palette.inkMuted }]}>
            {preferences.vibes.length}/3 selected
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => router.push('/onboarding/occasions' as any)}
            variant="primary"
            size="large"
            disabled={!canContinue}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xl,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressActive: {
    width: 24,
  },
  placeholder: {
    width: 40,
  },
  header: {
    marginBottom: space.xl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  step: {
    ...typo.caption,
    marginBottom: space.sm,
  },
  title: {
    ...typo.screenTitle,
    fontSize: 28,
    marginBottom: space.sm,
  },
  subtitle: {
    ...typo.body,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    marginBottom: 0,
  },
  hint: {
    ...typo.caption,
    textAlign: 'center',
    marginTop: space.xl,
  },
  footer: {
    padding: space.xl,
    paddingTop: 12,
  },
});
