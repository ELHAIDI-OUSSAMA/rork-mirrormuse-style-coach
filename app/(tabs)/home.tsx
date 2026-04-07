import React, { useState, useEffect, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Sparkles, ChevronDown, CalendarClock, Flame, ArrowRight, HeartHandshake, BellRing, Wallet, TrendingUp, Link2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Card } from '@/components/Card';
import { OCCASIONS, FEMALE_STYLE_VIBES, MALE_STYLE_VIBES, Occasion, StyleVibe, WeatherSnapshot } from '@/types';
import { getLiveWeatherForDate } from '@/utils/weather';
import { getXpProgress } from '@/utils/gamification';
import { easings, useReduceMotion } from '@/lib/motion';
import { trackSocialImportEvent } from '@/lib/socialImportEntry';

export default function HomeScreen() {
  const router = useRouter();
  const {
    preferences,
    themeColors,
    closetItems,
    cleanupCandidates,
    demandNotifications,
    getClosetItemById,
    markDemandNotificationSeen,
    closetValueInsights,
    stylePersonalityInsights,
    gamificationState,
    setCurrentWeather,
    sellOpportunities,
    highDemandSellOpportunities,
  } = useApp();

  const styleVibes = preferences.gender === 'male' ? MALE_STYLE_VIBES : FEMALE_STYLE_VIBES;

  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>(
    preferences.occasions[0] || 'Casual'
  );
  const [selectedVibe, setSelectedVibe] = useState<StyleVibe>(
    preferences.vibes[0] || styleVibes[0]
  );
  const [showOccasions, setShowOccasions] = useState(false);
  const [showVibes, setShowVibes] = useState(false);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const currentStreak = gamificationState.streak.current;
  const xpProgress = getXpProgress(gamificationState.xp, gamificationState.level);
  const reduceMotion = useReduceMotion();
  const streakScale = React.useRef(new Animated.Value(1)).current;
  const previousStreakRef = React.useRef(currentStreak);

  const loadWeather = useCallback(async () => {
    try {
      const liveWeather = await getLiveWeatherForDate();
      setWeather(liveWeather);
      setCurrentWeather(liveWeather);
    } catch (error) {
      console.log('[Home] Live weather unavailable:', error);
      setWeather(null);
    }
  }, [setCurrentWeather]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  useEffect(() => {
    const prev = previousStreakRef.current;
    const next = currentStreak;
    if (next > prev && !reduceMotion) {
      Animated.sequence([
        Animated.timing(streakScale, {
          toValue: 1.08,
          duration: 120,
          easing: easings.outCubic,
          useNativeDriver: true,
        }),
        Animated.spring(streakScale, {
          toValue: 1,
          tension: 180,
          friction: 16,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousStreakRef.current = next;
  }, [currentStreak, reduceMotion, streakScale]);

  const handleTakePhoto = () => {
    router.push({
      pathname: '/camera' as any,
      params: { occasion: selectedOccasion, vibe: selectedVibe },
    });
  };

  const handleUploadPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: '/loading' as any,
        params: {
          imageUri: result.assets[0].uri,
          occasion: selectedOccasion,
          vibe: selectedVibe,
        },
      });
    }
  };

  const handlePlanOutfit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (weather) {
      setCurrentWeather(weather);
    }
    router.push('/plan-outfit' as any);
  };

  const handleViewProgress = () => {
    router.push('/progress' as any);
  };

  const subtitle =
    preferences.gender === 'male'
      ? 'Ready for your fit check?'
      : 'Ready for your fit check? ✨';

  const getWeatherIcon = () => {
    if (!weather) return '📍';
    switch (weather.condition) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'snowy':
        return '❄️';
      case 'windy':
        return '💨';
      default:
        return '☀️';
    }
  };

  const topDemandAlert = demandNotifications.find((item) => !item.seen) || demandNotifications[0];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <AppHeader
            title="Fit Check"
            subtitle={subtitle}
            right={
              <View style={styles.weatherBadge}>
                <Text style={styles.weatherEmoji}>{getWeatherIcon()}</Text>
                <Text style={styles.weatherTemp}>{weather ? `${weather.temperature}°` : '--°'}</Text>
              </View>
            }
          />

          <Card style={styles.mainCard} padding="large" variant="elevated">
            <View style={styles.iconBlock}>
              <View style={styles.mainIcon}>
                <Sparkles size={32} color={palette.accent} />
              </View>
            </View>
            <Text style={styles.cardTitle}>Get outfit suggestions</Text>
            <Text style={styles.cardDesc}>
              Take a mirror selfie or upload a photo to get personalized styling tips
            </Text>

            <View style={styles.buttons}>
              <Button
                title="Take Photo"
                onPress={handleTakePhoto}
                variant="primary"
                size="large"
                icon={<Camera size={20} color="#FFFFFF" />}
                style={styles.primaryBtn}
              />
              <Button
                title="Upload Photo"
                onPress={handleUploadPhoto}
                variant="outline"
                size="large"
                icon={<ImageIcon size={20} color={themeColors.primary} />}
              />
            </View>
          </Card>

          <Card style={styles.importCard} padding="medium" variant="elevated">
            <View style={styles.planHeader}>
              <View style={styles.importIcon}>
                <Link2 size={20} color={palette.accentDark} />
              </View>
              <View style={styles.planText}>
                <Text style={styles.planTitle}>Import from social media</Text>
                <Text style={styles.planSubtitle}>
                  Turn online outfit inspiration into saved looks, closet items, and outfit ideas
                </Text>
              </View>
            </View>
            <Text style={styles.importSources}>Instagram • TikTok • Pinterest • Safari</Text>
            <Button
              title="Import outfit"
              onPress={() => {
                trackSocialImportEvent('import_social_home_cta_tapped');
                router.push('/import-social' as any);
              }}
              variant="secondary"
              size="medium"
              icon={<ArrowRight size={18} color="#FFFFFF" />}
            />
          </Card>

          {topDemandAlert ? (
            <Card style={styles.demandCard} padding="medium" variant="outlined">
              <View style={styles.planHeader}>
                <View style={styles.demandIcon}>
                  <BellRing size={20} color={palette.secondary} />
                </View>
                <View style={styles.planText}>
                  <Text style={styles.planTitle}>High demand alert</Text>
                  <Text style={styles.planSubtitle}>{topDemandAlert.message}</Text>
                </View>
              </View>
              <Text style={styles.demandMeta}>
                Demand: {topDemandAlert.demandLevel.toUpperCase()} · Est. resale value: ${topDemandAlert.estimatedResaleValue}
              </Text>
              <Button
                title="List this item"
                onPress={() => {
                  const closetItem = getClosetItemById(topDemandAlert.closetItemId);
                  markDemandNotificationSeen(topDemandAlert.id);
                  if (!closetItem) return;
                  router.push({ pathname: '/marketplace/create-listing', params: { closetItemId: closetItem.id } } as any);
                }}
                variant="secondary"
                size="medium"
                icon={<ArrowRight size={18} color="#FFFFFF" />}
              />
            </Card>
          ) : null}

          <Card style={styles.quickInsightCard} padding="medium" variant="outlined">
            <View style={styles.planHeader}>
              <View style={styles.quickInsightIcon}>
                <TrendingUp size={20} color={palette.secondaryDark} />
              </View>
              <View style={styles.planText}>
                <Text style={styles.planTitle}>Sell what&apos;s in demand</Text>
                <Text style={styles.planSubtitle}>
                  Some items in your closet could sell quickly ({highDemandSellOpportunities.length} high demand)
                </Text>
              </View>
            </View>
            <Button
              title={sellOpportunities.length > 0 ? 'Review opportunities' : 'View sell opportunities'}
              onPress={() => router.push('/sell-opportunities' as any)}
              variant="outline"
              size="medium"
              icon={<ArrowRight size={16} color={themeColors.primary} />}
            />
          </Card>

          <Card style={styles.planCard} padding="medium" variant="flat">
            <View style={styles.planHeader}>
              <View style={styles.planIcon}>
                <CalendarClock size={24} color={palette.secondary} />
              </View>
              <View style={styles.planText}>
                <Text style={styles.planTitle}>Plan your outfit</Text>
                <Text style={styles.planSubtitle}>
                  {closetItems.length > 0
                    ? `Use your ${closetItems.length} closet items`
                    : 'Add items to your closet first'}
                </Text>
              </View>
            </View>
            <Button
              title="Plan Outfit"
              onPress={handlePlanOutfit}
              variant="secondary"
              size="medium"
              icon={<Sparkles size={18} color="#FFFFFF" />}
              disabled={closetItems.length < 2}
            />
          </Card>

          <Card style={styles.cleanupCard} padding="medium" variant="elevated">
            <View style={styles.planHeader}>
              <View style={styles.cleanupIcon}>
                <HeartHandshake size={22} color={palette.accentDark} />
              </View>
              <View style={styles.planText}>
                <Text style={styles.planTitle}>Give your clothes a second life</Text>
                <Text style={styles.planSubtitle}>
                  Sell or donate what you no longer wear
                </Text>
              </View>
            </View>
            <Button
              title={cleanupCandidates.length > 0 ? `Review ${cleanupCandidates.length} item${cleanupCandidates.length > 1 ? 's' : ''}` : 'Open Closet Cleanup'}
              onPress={() => router.push('/closet-cleanup' as any)}
              variant="secondary"
              size="medium"
              icon={<ArrowRight size={18} color="#FFFFFF" />}
            />
          </Card>

          <Card style={styles.quickInsightCard} padding="medium" variant="outlined">
            <View style={styles.planHeader}>
              <View style={styles.quickInsightIcon}>
                <Sparkles size={20} color={palette.accentDark} />
              </View>
              <View style={styles.planText}>
                <Text style={styles.planTitle}>Discover your fashion identity</Text>
                <Text style={styles.planSubtitle}>{stylePersonalityInsights.personality}</Text>
              </View>
            </View>
            <Button
              title="Open Style Personality"
              onPress={() => router.push('/style-personality' as any)}
              variant="outline"
              size="medium"
              icon={<ArrowRight size={16} color={themeColors.primary} />}
            />
          </Card>

          <Card style={styles.quickInsightCard} padding="medium" variant="outlined">
            <View style={styles.planHeader}>
              <View style={styles.quickInsightIcon}>
                <Wallet size={20} color={palette.secondary} />
              </View>
              <View style={styles.planText}>
                <Text style={styles.planTitle}>How much is your closet worth?</Text>
                <Text style={styles.planSubtitle}>Estimated value ${closetValueInsights.totalClosetValue.toLocaleString()}</Text>
              </View>
            </View>
            <Button
              title="Open Closet Value"
              onPress={() => router.push('/closet-value' as any)}
              variant="outline"
              size="medium"
              icon={<ArrowRight size={16} color={themeColors.primary} />}
            />
          </Card>

          <Card style={styles.progressCard} padding="medium" variant="outlined">
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressLevel}>Style Level {gamificationState.level}</Text>
              </View>
              <View style={styles.streakPill}>
                <Animated.View style={{ transform: [{ scale: streakScale }] }}>
                  <Flame size={14} color={palette.secondary} />
                </Animated.View>
                <Text style={styles.streakText}>
                  {gamificationState.streak.current}-day streak
                </Text>
              </View>
            </View>

            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.max(4, xpProgress.pct * 100)}%` }]} />
            </View>
            <Text style={styles.xpMeta}>
              {xpProgress.current} / {xpProgress.needed} XP
            </Text>

            <TouchableOpacity style={styles.progressCta} onPress={handleViewProgress} activeOpacity={0.8}>
              <Text style={styles.progressCtaText}>View Progress</Text>
              <ArrowRight size={16} color={palette.inkLight} />
            </TouchableOpacity>
          </Card>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Settings</Text>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowOccasions(!showOccasions)}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.dropdownLabel}>Occasion</Text>
                <Text style={styles.dropdownValue}>{selectedOccasion}</Text>
              </View>
              <ChevronDown
                size={20}
                color={palette.inkMuted}
                style={{ transform: [{ rotate: showOccasions ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showOccasions && (
              <View style={styles.chipGrid}>
                {OCCASIONS.map((occ) => (
                  <Chip
                    key={occ}
                    label={occ}
                    selected={selectedOccasion === occ}
                    onPress={() => {
                      setSelectedOccasion(occ);
                      setShowOccasions(false);
                    }}
                    size="small"
                  />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowVibes(!showVibes)}
              activeOpacity={0.8}
            >
              <View>
                <Text style={styles.dropdownLabel}>Style Vibe</Text>
                <Text style={styles.dropdownValue}>{selectedVibe}</Text>
              </View>
              <ChevronDown
                size={20}
                color={palette.inkMuted}
                style={{ transform: [{ rotate: showVibes ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showVibes && (
              <View style={styles.chipGrid}>
                {styleVibes.map((vibe) => (
                  <Chip
                    key={vibe}
                    label={vibe}
                    selected={selectedVibe === vibe}
                    onPress={() => {
                      setSelectedVibe(vibe);
                      setShowVibes(false);
                    }}
                    size="small"
                  />
                ))}
              </View>
            )}
          </View>

          <Card style={styles.tipCard} padding="medium" variant="flat">
            <Text style={styles.tipTitle}>💡 Pro tip</Text>
            <Text style={styles.tipText}>
              Stand back so your full outfit fits in frame. Good lighting helps get better
              suggestions!
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.warmWhite,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.screen,
    paddingTop: space.sm,
    paddingBottom: space.xl,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    gap: space.xs,
    ...shadow.soft,
  },
  weatherEmoji: {
    fontSize: 18,
  },
  weatherTemp: {
    ...typo.bodyMedium,
    color: palette.ink,
  },
  mainCard: {
    marginBottom: space.xl,
    alignItems: 'center',
  },
  iconBlock: {
    marginBottom: space.lg,
  },
  mainIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentLight,
  },
  cardTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  cardDesc: {
    ...typo.body,
    color: palette.inkMuted,
    textAlign: 'center',
    marginBottom: space.lg,
    paddingHorizontal: space.sm,
  },
  buttons: {
    width: '100%',
  },
  primaryBtn: {
    marginBottom: space.sm,
  },
  planCard: {
    marginBottom: space.xl,
    backgroundColor: palette.secondaryLight,
    borderWidth: 0,
  },
  cleanupCard: {
    marginBottom: space.xl,
    backgroundColor: palette.white,
  },
  importCard: {
    marginBottom: space.xl,
    backgroundColor: palette.white,
  },
  importIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    backgroundColor: palette.accentLight,
  },
  importSources: {
    ...typo.small,
    color: palette.inkMuted,
    marginBottom: space.md,
  },
  cleanupIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    backgroundColor: palette.accentLight,
  },
  demandCard: {
    marginBottom: space.xl,
    borderColor: palette.secondary + '40',
  },
  demandIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    backgroundColor: palette.secondaryLight,
  },
  demandMeta: {
    ...typo.caption,
    color: palette.inkMuted,
    marginBottom: space.md,
  },
  quickInsightCard: {
    marginBottom: space.xl,
    borderColor: palette.borderLight,
  },
  quickInsightIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    backgroundColor: palette.warmWhiteDark,
  },
  progressCard: {
    marginBottom: space.xl,
    backgroundColor: palette.white,
    borderColor: palette.border,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  progressLabel: {
    ...typo.small,
    color: palette.inkMuted,
    marginBottom: 2,
  },
  progressLevel: {
    ...typo.sectionHeader,
    color: palette.ink,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.secondaryLight,
  },
  streakText: {
    ...typo.caption,
    color: palette.inkLight,
  },
  xpTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.borderLight,
    overflow: 'hidden',
    marginBottom: space.xs,
  },
  xpFill: {
    height: '100%',
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
  },
  xpMeta: {
    ...typo.small,
    color: palette.inkMuted,
    marginBottom: space.md,
  },
  progressCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: palette.borderLight,
  },
  progressCtaText: {
    ...typo.bodyMedium,
    color: palette.ink,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    backgroundColor: palette.secondary + '25',
  },
  planText: {
    flex: 1,
  },
  planTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginBottom: 2,
  },
  planSubtitle: {
    ...typo.caption,
    color: palette.inkMuted,
  },
  section: {
    marginBottom: space.xl,
  },
  sectionTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginBottom: space.md,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: space.lg,
    borderRadius: radius.lg,
    marginBottom: space.sm,
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  dropdownLabel: {
    ...typo.small,
    color: palette.inkMuted,
    marginBottom: 2,
  },
  dropdownValue: {
    ...typo.bodyMedium,
    color: palette.ink,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: palette.warmWhiteDark,
  },
  tipCard: {
    backgroundColor: palette.accentLight,
    borderWidth: 0,
  },
  tipTitle: {
    ...typo.caption,
    fontWeight: '600',
    color: palette.ink,
    marginBottom: space.xs,
  },
  tipText: {
    ...typo.small,
    lineHeight: 18,
    color: palette.inkMuted,
  },
});
