import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Sparkles } from 'lucide-react-native';
import { generateMockAnalysis, loadingTips } from '@/utils/mockAnalysis';
import { detectItemsInOutfitImage } from '@/utils/closetExtraction';
import { useApp } from '@/contexts/AppContext';
import { StyleVibe, Occasion, LookAnalysis } from '@/types';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';

export default function LoadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri: string; occasion: string; vibe: string }>();
  const { preferences, themeColors, closetItems } = useApp();
  const [currentTip, setCurrentTip] = useState(0);
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setCurrentTip((prev) => (prev + 1) % loadingTips.length);
    }, 2000);
    return () => clearInterval(tipInterval);
  }, [fadeAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: 100, duration: 5000, useNativeDriver: false }).start();

    const progressListener = progressAnim.addListener(({ value }) => setProgress(Math.round(value)));

    const vibe = (params.vibe || preferences.vibes[0] || 'Minimal') as StyleVibe;
    const occasion = (params.occasion || preferences.occasions[0] || 'Casual') as Occasion;

    const analyzeOutfit = async () => {
      const detectedItems = await detectItemsInOutfitImage(params.imageUri || '');
      const results = generateMockAnalysis(
        vibe, occasion, preferences.budgetLevel,
        closetItems.map(item => ({ category: item.category, color: item.color }))
      );
      results.detectedClothingItems = detectedItems;

      const analysis: LookAnalysis = {
        id: `look_${Date.now()}`,
        imageUri: params.imageUri || '',
        createdAt: new Date().toISOString(),
        occasion, vibe, results,
      };

      router.replace({
        pathname: '/results' as any,
        params: { analysisId: analysis.id, analysisData: JSON.stringify(analysis) },
      });
    };

    const timeout = setTimeout(analyzeOutfit, 1000);
    return () => { clearTimeout(timeout); progressAnim.removeListener(progressListener); };
  }, [params.imageUri, params.occasion, params.vibe, preferences.vibes, preferences.occasions, preferences.budgetLevel, closetItems, progressAnim, router]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.content}>
        {params.imageUri && (
          <View style={s.imageWrap}>
            <Image source={{ uri: params.imageUri }} style={s.image} contentFit="cover" />
          </View>
        )}

        <Animated.View style={[s.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <Sparkles size={36} color={palette.accent} />
        </Animated.View>

        <Text style={s.title}>Analyzing your look...</Text>

        <Animated.Text style={[s.tip, { opacity: fadeAnim }]}>
          {loadingTips[currentTip]}
        </Animated.Text>

        <View style={s.progressRow}>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={s.progressPct}>{progress}%</Text>
        </View>

        <View style={s.tags}>
          <View style={s.tag}>
            <Text style={s.tagText}>{params.vibe || preferences.vibes[0]}</Text>
          </View>
          <View style={s.tag}>
            <Text style={s.tagText}>{params.occasion || preferences.occasions[0]}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.warmWhite, paddingHorizontal: space.xl,
  },
  content: { alignItems: 'center', width: '100%' },
  imageWrap: {
    width: 140, height: 180, borderRadius: radius.xl, overflow: 'hidden',
    marginBottom: space.xxl, ...shadow.card,
  },
  image: { width: '100%', height: '100%' },
  iconWrap: {
    width: 76, height: 76, borderRadius: radius.lg,
    backgroundColor: palette.accentLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: space.lg,
  },
  title: { ...typo.sectionHeader, fontSize: 22, color: palette.ink, marginBottom: 10 },
  tip: { ...typo.body, color: palette.inkMuted, marginBottom: space.xl, height: 24, textAlign: 'center' },
  progressRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: space.lg },
  progressTrack: {
    flex: 1, height: 6, borderRadius: 3, backgroundColor: palette.warmWhiteDark, overflow: 'hidden', marginRight: 12,
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: palette.accent },
  progressPct: { ...typo.caption, fontWeight: '600', color: palette.inkMuted, width: 40, textAlign: 'right' },
  tags: { flexDirection: 'row', gap: 8 },
  tag: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
    backgroundColor: palette.white, ...shadow.soft,
  },
  tagText: { ...typo.caption, fontWeight: '600', color: palette.inkLight },
});
