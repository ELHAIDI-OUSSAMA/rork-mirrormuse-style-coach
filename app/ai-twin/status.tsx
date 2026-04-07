import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

export default function AITwinStatusScreen() {
  const router = useRouter();
  const { avatarProfile, virtualTryOnRenders, renderDigitalTryOn } = useApp();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const latestRender = virtualTryOnRenders[0];
  const avatarReady = avatarProfile?.status === 'ready';
  const isCreating = avatarProfile?.status === 'creating';
  const isRenderProcessing = latestRender?.status === 'processing';

  const steps = useMemo(() => {
    if (isRenderProcessing) {
      return ['Preparing outfit', 'Generating try-on', 'Final touches'];
    }
    return ['Preparing photos', 'Building your Twin', 'Final touches'];
  }, [isRenderProcessing]);

  const handleTryAnotherVersion = async () => {
    if (!latestRender) return;
    try {
      await renderDigitalTryOn({
        source: latestRender.source,
        outfitId: latestRender.outfitId,
        closetItemIds: latestRender.closetItemIds,
      });
    } catch {
      // keep status UI stable; user can retry from entry points
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>AI Twin Status</Text>
          <View style={styles.iconGhost} />
        </View>

        <View style={styles.content}>
          {(isCreating || isRenderProcessing) && (
            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.loader,
                  {
                    transform: [
                      {
                        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
                      },
                    ],
                  },
                ]}
              >
                <Sparkles size={22} color={palette.accent} />
              </Animated.View>
              <Text style={styles.cardTitle}>{isRenderProcessing ? 'Creating your try-on…' : 'Building your Twin…'}</Text>
              <Text style={styles.cardSubtitle}>You can keep using the app. We will keep processing in the background.</Text>
              <View style={styles.steps}>
                {steps.map((label, idx) => (
                  <View key={label} style={styles.stepRow}>
                    <View style={[styles.stepDot, idx === 0 && styles.stepDotActive]} />
                    <Text style={styles.stepText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {avatarReady && !isRenderProcessing && !latestRender?.renderImageUri ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Twin is ready</Text>
              <Text style={styles.cardSubtitle}>Start trying outfits from Results or Outfit Builder.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)/home' as any)}>
                <Text style={styles.primaryBtnText}>Try on an outfit</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {latestRender?.status === 'ready' && latestRender.renderImageUri ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Try-on preview</Text>
              <Image source={{ uri: latestRender.renderImageUri }} style={styles.renderImage} contentFit="cover" />
              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/saved' as any)}>
                  <Text style={styles.secondaryBtnText}>Save to Looks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleTryAnotherVersion}>
                  <Text style={styles.primaryBtnText}>Try another version</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.actions, { marginTop: 10 }]}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {avatarProfile?.status === 'error' || latestRender?.status === 'error' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Something went wrong</Text>
              <Text style={styles.cardSubtitle}>{avatarProfile?.errorMessage || latestRender?.errorMessage || 'Please retry from AI Twin setup.'}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/ai-twin/setup' as any)}>
                <Text style={styles.primaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },
  header: {
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  iconGhost: { width: 38, height: 38 },
  title: { ...typo.sectionHeader, color: palette.ink },
  content: { paddingHorizontal: space.screen, gap: space.md },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.soft,
  },
  loader: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: palette.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { ...typo.bodyMedium, color: palette.ink },
  cardSubtitle: { ...typo.caption, color: palette.inkMuted, marginTop: 6 },
  steps: { marginTop: space.md, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.border },
  stepDotActive: { backgroundColor: palette.accent },
  stepText: { ...typo.caption, color: palette.inkLight },
  renderImage: {
    marginTop: space.sm,
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: space.md },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { ...typo.button, color: '#FFF' },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...typo.button, color: palette.ink },
});
