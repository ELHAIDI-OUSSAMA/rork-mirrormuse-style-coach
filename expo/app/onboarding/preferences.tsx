import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, ArrowLeft, Shield } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';
import { MODESTY_LEVELS, BUDGET_LEVELS, TONE_PREFERENCES } from '@/types';

export default function PreferencesScreen() {
  const router = useRouter();
  const { preferences, setModestyLevel, setBudgetLevel, setTone, completeOnboarding } = useApp();

  const handleComplete = () => {
    completeOnboarding();
    router.replace('/(tabs)/home' as any);
  };

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
              <View style={[styles.progressDot, { backgroundColor: palette.warmWhiteDark }]} />
              <View style={[styles.progressDot, { backgroundColor: palette.warmWhiteDark }]} />
              <View style={[styles.progressDot, styles.progressActive, { backgroundColor: palette.accent }]} />
            </View>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: palette.accentLight }]}>
              <Settings size={28} color={palette.accent} />
            </View>
            <Text style={[styles.step, { color: palette.inkLight }]}>Step 4 of 4</Text>
            <Text style={[styles.title, { color: palette.ink }]}>Fine-tune your style</Text>
            <Text style={[styles.subtitle, { color: palette.inkLight }]}>
              These help us personalize your suggestions.
              You can change these anytime.
            </Text>
          </View>

          <Card
            style={[styles.section, { backgroundColor: palette.white }, shadow.soft]}
            variant="flat"
          >
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>Modesty Level</Text>
            <Text style={[styles.sectionDesc, { color: palette.inkMuted }]}>How covered do you prefer to be?</Text>
            <View style={styles.options}>
              {MODESTY_LEVELS.map((level) => (
                <Chip
                  key={level}
                  label={level}
                  selected={preferences.modestyLevel === level}
                  onPress={() => setModestyLevel(level)}
                  size="medium"
                />
              ))}
            </View>
          </Card>

          <Card
            style={[styles.section, { backgroundColor: palette.white }, shadow.soft]}
            variant="flat"
          >
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>Budget Range</Text>
            <Text style={[styles.sectionDesc, { color: palette.inkMuted }]}>For shopping suggestions</Text>
            <View style={styles.options}>
              {BUDGET_LEVELS.map((level) => (
                <Chip
                  key={level}
                  label={level}
                  selected={preferences.budgetLevel === level}
                  onPress={() => setBudgetLevel(level)}
                  size="medium"
                />
              ))}
            </View>
          </Card>

          <Card
            style={[styles.section, { backgroundColor: palette.white }, shadow.soft]}
            variant="flat"
          >
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>Feedback Tone</Text>
            <Text style={[styles.sectionDesc, { color: palette.inkMuted }]}>How should we talk to you?</Text>
            <View style={styles.options}>
              {TONE_PREFERENCES.map((tone) => (
                <Chip
                  key={tone}
                  label={tone}
                  selected={preferences.tone === tone}
                  onPress={() => setTone(tone)}
                  size="medium"
                />
              ))}
            </View>
          </Card>

          <View style={[styles.consent, { backgroundColor: palette.warmWhiteDark, borderRadius: radius.lg }]}>
            <Shield size={20} color={palette.inkMuted} />
            <Text style={[styles.consentText, { color: palette.inkMuted }]}>
              AI analyzes photos only for outfit suggestions.
              Your photos stay on your device unless you choose to share.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Start Styling"
            onPress={handleComplete}
            variant="primary"
            size="large"
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
    paddingBottom: space.xl,
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
    marginBottom: space.lg,
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
  section: {
    marginBottom: space.md,
    borderRadius: radius.card,
  },
  sectionTitle: {
    ...typo.bodyMedium,
  },
  sectionDesc: {
    ...typo.caption,
    marginBottom: 12,
  },
  options: {
    flexDirection: 'row',
    gap: 10,
  },
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: space.md,
    marginTop: space.sm,
  },
  consentText: {
    flex: 1,
    marginLeft: 12,
    ...typo.caption,
  },
  footer: {
    padding: space.xl,
    paddingTop: 12,
  },
});
