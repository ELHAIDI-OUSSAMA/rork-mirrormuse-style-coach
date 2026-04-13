import React, { useState, useEffect, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Image as ImageIcon, Sparkles, ChevronRight, CalendarClock, Flame, ArrowRight, HeartHandshake, BellRing, Wallet, TrendingUp, Link2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { space, radius, palette, type as typo } from '@/constants/theme';
import { AppHeader } from '@/components/AppHeader';
import { OCCASIONS, FEMALE_STYLE_VIBES, MALE_STYLE_VIBES, Occasion, StyleVibe, WeatherSnapshot } from '@/types';
import { getLiveWeatherForDate } from '@/utils/weather';
import { getXpProgress } from '@/utils/gamification';
import { easings, useReduceMotion } from '@/lib/motion';
import { trackSocialImportEvent } from '@/lib/socialImportEntry';

function GroupedSection({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.groupedSection, style]}>{children}</View>;
}

function GroupedRow({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
  showChevron = true,
  rightElement,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.groupedRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[styles.groupedRowIcon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={styles.groupedRowContent}>
        <View style={styles.groupedRowText}>
          <Text style={styles.groupedRowTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.groupedRowSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {rightElement}
        {showChevron && onPress ? <ChevronRight size={17} color={palette.inkFaint} /> : null}
      </View>
    </TouchableOpacity>
  );
}

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

  const getWeatherIcon = () => {
    if (!weather) return '📍';
    switch (weather.condition) {
      case 'sunny': return '☀️';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      case 'snowy': return '❄️';
      case 'windy': return '💨';
      default: return '☀️';
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
            title="Home"
            subtitle={preferences.gender === 'male' ? 'Ready for your fit check?' : 'Ready for your fit check?'}
            right={
              <View style={styles.weatherBadge}>
                <Text style={styles.weatherEmoji}>{getWeatherIcon()}</Text>
                <Text style={styles.weatherTemp}>{weather ? `${weather.temperature}°` : '--°'}</Text>
              </View>
            }
          />

          <GroupedSection>
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <Sparkles size={28} color={themeColors.primary} />
              </View>
              <Text style={styles.heroTitle}>Get outfit suggestions</Text>
              <Text style={styles.heroDesc}>
                Take a mirror selfie or upload a photo to get personalized styling tips
              </Text>
              <View style={styles.heroButtons}>
                <TouchableOpacity
                  style={[styles.heroBtn, { backgroundColor: themeColors.primary }]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <Camera size={18} color="#FFFFFF" />
                  <Text style={styles.heroBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.heroBtn, styles.heroBtnOutline]}
                  onPress={handleUploadPhoto}
                  activeOpacity={0.7}
                >
                  <ImageIcon size={18} color={themeColors.primary} />
                  <Text style={[styles.heroBtnText, { color: themeColors.primary }]}>Upload</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GroupedSection>

          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <GroupedSection>
            <GroupedRow
              icon={<Link2 size={17} color="#FFFFFF" />}
              iconBg="#5856D6"
              title="Import from social media"
              subtitle="Instagram, TikTok, Pinterest"
              onPress={() => {
                trackSocialImportEvent('import_social_home_cta_tapped');
                router.push('/import-social' as any);
              }}
            />
            <View style={styles.rowSeparator} />
            <GroupedRow
              icon={<CalendarClock size={17} color="#FFFFFF" />}
              iconBg="#FF9500"
              title="Plan your outfit"
              subtitle={closetItems.length > 0 ? `Use your ${closetItems.length} closet items` : 'Add items to your closet first'}
              onPress={closetItems.length >= 2 ? handlePlanOutfit : undefined}
            />
            <View style={styles.rowSeparator} />
            <GroupedRow
              icon={<HeartHandshake size={17} color="#FFFFFF" />}
              iconBg="#34C759"
              title="Closet cleanup"
              subtitle={cleanupCandidates.length > 0 ? `${cleanupCandidates.length} items to review` : 'Sell or donate unused items'}
              onPress={() => router.push('/closet-cleanup' as any)}
            />
          </GroupedSection>

          {topDemandAlert ? (
            <>
              <Text style={styles.sectionLabel}>ALERTS</Text>
              <GroupedSection>
                <GroupedRow
                  icon={<BellRing size={17} color="#FFFFFF" />}
                  iconBg="#FF3B30"
                  title="High demand alert"
                  subtitle={topDemandAlert.message}
                  onPress={() => {
                    const closetItem = getClosetItemById(topDemandAlert.closetItemId);
                    markDemandNotificationSeen(topDemandAlert.id);
                    if (!closetItem) return;
                    router.push({ pathname: '/marketplace/create-listing', params: { closetItemId: closetItem.id } } as any);
                  }}
                />
              </GroupedSection>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>INSIGHTS</Text>
          <GroupedSection>
            <GroupedRow
              icon={<TrendingUp size={17} color="#FFFFFF" />}
              iconBg="#FF9500"
              title="Sell what's in demand"
              subtitle={`${highDemandSellOpportunities.length} high demand items`}
              onPress={() => router.push('/sell-opportunities' as any)}
            />
            <View style={styles.rowSeparator} />
            <GroupedRow
              icon={<Sparkles size={17} color="#FFFFFF" />}
              iconBg="#AF52DE"
              title="Style personality"
              subtitle={stylePersonalityInsights.personality}
              onPress={() => router.push('/style-personality' as any)}
            />
            <View style={styles.rowSeparator} />
            <GroupedRow
              icon={<Wallet size={17} color="#FFFFFF" />}
              iconBg="#007AFF"
              title="Closet value"
              subtitle={`Estimated $${closetValueInsights.totalClosetValue.toLocaleString()}`}
              onPress={() => router.push('/closet-value' as any)}
            />
          </GroupedSection>

          <Text style={styles.sectionLabel}>PROGRESS</Text>
          <GroupedSection>
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <View>
                  <Text style={styles.progressLabel}>Style Level {gamificationState.level}</Text>
                  <Text style={styles.progressXp}>
                    {xpProgress.current} / {xpProgress.needed} XP
                  </Text>
                </View>
                <View style={styles.streakPill}>
                  <Animated.View style={{ transform: [{ scale: streakScale }] }}>
                    <Flame size={14} color="#FF9500" />
                  </Animated.View>
                  <Text style={styles.streakText}>{currentStreak} day</Text>
                </View>
              </View>
              <View style={styles.xpTrack}>
                <View
                  style={[
                    styles.xpFill,
                    {
                      width: `${Math.max(4, xpProgress.pct * 100)}%`,
                      backgroundColor: themeColors.primary,
                    },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.progressCta}
                onPress={handleViewProgress}
                activeOpacity={0.6}
              >
                <Text style={[styles.progressCtaText, { color: themeColors.primary }]}>View Progress</Text>
                <ArrowRight size={15} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
          </GroupedSection>

          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <GroupedSection style={{ marginBottom: 40 }}>
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6}>
              <Text style={styles.settingLabel}>Occasion</Text>
              <View style={styles.settingValueRow}>
                <Text style={styles.settingValue}>{selectedOccasion}</Text>
                <ChevronRight size={15} color={palette.inkFaint} />
              </View>
            </TouchableOpacity>
            <View style={styles.rowSeparator} />
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.6}>
              <Text style={styles.settingLabel}>Style Vibe</Text>
              <View style={styles.settingValueRow}>
                <Text style={styles.settingValue}>{selectedVibe}</Text>
                <ChevronRight size={15} color={palette.inkFaint} />
              </View>
            </TouchableOpacity>
          </GroupedSection>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.systemGroupedBg,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space.xxl,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.secondarySystemGroupedBg,
    gap: 4,
  },
  weatherEmoji: {
    fontSize: 16,
  },
  weatherTemp: {
    ...typo.caption,
    fontWeight: '600' as const,
    color: palette.ink,
  },
  sectionLabel: {
    ...typo.footnote,
    color: palette.inkMuted,
    marginLeft: space.screen + 16,
    marginBottom: 6,
    marginTop: 24,
    letterSpacing: 0.5,
  },
  groupedSection: {
    marginHorizontal: space.screen,
    backgroundColor: palette.secondarySystemGroupedBg,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  groupedRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  groupedRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupedRowText: {
    flex: 1,
  },
  groupedRowTitle: {
    ...typo.bodyMedium,
    color: palette.ink,
    fontSize: 16,
  },
  groupedRowSubtitle: {
    ...typo.caption,
    color: palette.inkMuted,
    marginTop: 1,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.separator,
    marginLeft: 62,
  },
  heroCard: {
    padding: 20,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentLight,
    marginBottom: 16,
  },
  heroTitle: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  heroDesc: {
    ...typo.body,
    color: palette.inkMuted,
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 20,
  },
  heroButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  heroBtn: {
    flex: 1,
    height: 50,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.separator,
  },
  heroBtnText: {
    ...typo.button,
    color: '#FFFFFF',
    fontSize: 16,
  },
  progressCard: {
    padding: 16,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    ...typo.headline,
    color: palette.ink,
  },
  progressXp: {
    ...typo.caption,
    color: palette.inkMuted,
    marginTop: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: '#FFF4E6',
  },
  streakText: {
    ...typo.caption,
    fontWeight: '600' as const,
    color: '#CC7700',
  },
  xpTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(118, 118, 128, 0.12)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  progressCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
    gap: 4,
  },
  progressCtaText: {
    ...typo.bodyMedium,
    fontSize: 15,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingLabel: {
    ...typo.body,
    color: palette.ink,
    fontSize: 16,
  },
  settingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    ...typo.body,
    color: palette.inkMuted,
    fontSize: 16,
  },
});
