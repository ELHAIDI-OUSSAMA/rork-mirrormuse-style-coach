import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { space, radius, palette, type as typo } from '@/constants/theme';
import { OCCASIONS, Occasion } from '@/types';

export default function OccasionsScreen() {
  const router = useRouter();
  const { preferences, setOccasions } = useApp();

  const toggleOccasion = (occasion: Occasion) => {
    const current = preferences.occasions;
    if (current.includes(occasion)) {
      setOccasions(current.filter(o => o !== occasion));
    } else {
      setOccasions([...current, occasion]);
    }
  };

  const canContinue = preferences.occasions.length >= 1;

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
              <View style={[styles.progressDot, styles.progressActive, { backgroundColor: palette.accent }]} />
              <View style={[styles.progressDot, { backgroundColor: palette.warmWhiteDark }]} />
            </View>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: palette.secondaryLight }]}>
              <Calendar size={28} color={palette.secondary} />
            </View>
            <Text style={[styles.step, { color: palette.inkLight }]}>Step 3 of 4</Text>
            <Text style={[styles.title, { color: palette.ink }]}>Your typical days</Text>
            <Text style={[styles.subtitle, { color: palette.inkLight }]}>
              What occasions do you usually dress for?
              Select all that apply.
            </Text>
          </View>

          <View style={styles.chips}>
            {OCCASIONS.map((occasion) => (
              <Chip
                key={occasion}
                label={occasion}
                selected={preferences.occasions.includes(occasion)}
                onPress={() => toggleOccasion(occasion)}
                size="large"
                style={styles.chip}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Continue"
            onPress={() => router.push('/onboarding/preferences' as any)}
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
  footer: {
    padding: space.xl,
    paddingTop: 12,
  },
});
