import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  ChevronRight,
  RefreshCw,
  Bookmark,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';

import { Card } from '@/components/Card';
import { 
  PLANNING_OCCASIONS, 
  PlanningOccasion, 
  PlannedOutfit,
  WeatherSnapshot,
} from '@/types';
import { generatePlannedOutfit } from '@/utils/mockAnalysis';
import { getLiveWeatherForDate } from '@/utils/weather';

type Step = 'occasion' | 'date' | 'weather' | 'generating' | 'result';

export default function PlanOutfitScreen() {
  const router = useRouter();
  const { preferences, themeColors, closetItems, addPlannedOutfit, currentWeather } = useApp();
  
  const [step, setStep] = useState<Step>('occasion');
  const [selectedOccasion, setSelectedOccasion] = useState<PlanningOccasion>('Casual');
  const [customOccasion, setCustomOccasion] = useState('');
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [plannedOutfit, setPlannedOutfit] = useState<PlannedOutfit | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const gradientColors = preferences.gender === 'male' 
    ? ['#FAFAFA', '#F0F0F0'] as const
    : ['#FDF8F6', '#F5EDE8'] as const;

  const getTargetDateString = useCallback(() => {
    if (selectedDate === 'tomorrow') {
      return new Date(Date.now() + 86400000).toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }, [selectedDate]);

  const loadWeatherForSelectedDate = useCallback(async () => {
    const dateStr = getTargetDateString();
    setIsWeatherLoading(true);
    setWeatherError(null);

    if (currentWeather && currentWeather.date === dateStr) {
      setWeather(currentWeather);
      setIsWeatherLoading(false);
      return;
    }

    try {
      const liveWeather = await getLiveWeatherForDate(dateStr);
      setWeather(liveWeather);
    } catch (error) {
      console.log('[PlanOutfit] Weather fetch failed:', error);
      setWeather(null);
      setWeatherError('Could not fetch live weather. You can continue without weather.');
    } finally {
      setIsWeatherLoading(false);
    }
  }, [currentWeather, getTargetDateString]);

  useEffect(() => {
    if (step === 'weather') {
      loadWeatherForSelectedDate();
    }
  }, [step, selectedDate, loadWeatherForSelectedDate]);

  useEffect(() => {
    if (step === 'generating') {
      const timer = setTimeout(() => {
        const outfit = generatePlannedOutfit(
          closetItems,
          selectedOccasion,
          selectedOccasion === 'Custom' ? customOccasion : undefined,
          weather ?? undefined
        );
        if (outfit) {
          setPlannedOutfit(outfit);
          setStep('result');
        } else {
          Alert.alert(
            'Not enough items',
            'Add more items to your closet to generate outfit plans.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, closetItems, selectedOccasion, customOccasion, weather, router]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'occasion') {
      setStep('date');
    } else if (step === 'date') {
      setStep('weather');
    } else if (step === 'weather') {
      setStep('generating');
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step === 'date') {
      setStep('occasion');
    } else if (step === 'weather') {
      setStep('date');
    } else if (step === 'result') {
      setStep('weather');
    } else {
      router.back();
    }
  }, [step, router]);

  const handleSave = useCallback(() => {
    if (plannedOutfit && !isSaved) {
      addPlannedOutfit(plannedOutfit);
      setIsSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [plannedOutfit, addPlannedOutfit, isSaved]);

  const handleRegenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaved(false);
    setStep('generating');
  }, []);

  const getWeatherIcon = () => {
    if (!weather) return '☀️';
    switch (weather.condition) {
      case 'sunny': return '☀️';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      case 'snowy': return '❄️';
      case 'windy': return '💨';
      default: return '☀️';
    }
  };

  const renderOccasionStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        What is the occasion?
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        Select what you are dressing for
      </Text>
      
      <View style={styles.occasionGrid}>
        {PLANNING_OCCASIONS.map((occasion) => (
          <TouchableOpacity
            key={occasion}
            style={[
              styles.occasionCard,
              { 
                backgroundColor: themeColors.card,
                borderColor: selectedOccasion === occasion ? themeColors.primary : themeColors.border,
                borderWidth: selectedOccasion === occasion ? 2 : 1,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedOccasion(occasion);
            }}
          >
            <Text style={[
              styles.occasionText, 
              { color: selectedOccasion === occasion ? themeColors.primary : themeColors.text }
            ]}>
              {occasion}
            </Text>
            {selectedOccasion === occasion && (
              <Check size={16} color={themeColors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedOccasion === 'Custom' && (
        <TextInput
          style={[
            styles.customInput,
            { 
              backgroundColor: themeColors.card, 
              color: themeColors.text,
              borderColor: themeColors.border,
            }
          ]}
          placeholder="Describe your occasion..."
          placeholderTextColor={themeColors.textLight}
          value={customOccasion}
          onChangeText={setCustomOccasion}
        />
      )}

      <Button
        title="Continue"
        onPress={handleNext}
        variant="primary"
        size="large"
        disabled={selectedOccasion === 'Custom' && !customOccasion.trim()}
        icon={<ChevronRight size={20} color={themeColors.textInverse} />}
        style={styles.nextBtn}
      />
    </View>
  );

  const renderDateStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        When is it?
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        Select the date for your outfit
      </Text>

      <View style={styles.dateOptions}>
        {(['today', 'tomorrow'] as const).map((date) => (
          <TouchableOpacity
            key={date}
            style={[
              styles.dateCard,
              { 
                backgroundColor: themeColors.card,
                borderColor: selectedDate === date ? themeColors.primary : themeColors.border,
                borderWidth: selectedDate === date ? 2 : 1,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedDate(date);
            }}
          >
            <Calendar size={24} color={selectedDate === date ? themeColors.primary : themeColors.textSecondary} />
            <Text style={[
              styles.dateText,
              { color: selectedDate === date ? themeColors.primary : themeColors.text }
            ]}>
              {date.charAt(0).toUpperCase() + date.slice(1)}
            </Text>
            {selectedDate === date && (
              <Check size={16} color={themeColors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Continue"
        onPress={handleNext}
        variant="primary"
        size="large"
        icon={<ChevronRight size={20} color={themeColors.textInverse} />}
        style={styles.nextBtn}
      />
    </View>
  );

  const renderWeatherStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: themeColors.text }]}>
        Weather forecast
      </Text>
      <Text style={[styles.stepSubtitle, { color: themeColors.textSecondary }]}>
        This will be factored into your outfit
      </Text>

      {weather && (
        <Card style={[styles.weatherCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.weatherMain}>
            <Text style={styles.weatherEmoji}>{getWeatherIcon()}</Text>
            <View>
              <Text style={[styles.weatherTemp, { color: themeColors.text }]}>
                {weather.temperature}°C
              </Text>
              <Text style={[styles.weatherCondition, { color: themeColors.textSecondary }]}>
                {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
                {weather.location ? ` • ${weather.location}` : ''}
              </Text>
            </View>
          </View>
          {weather.rainProbability > 30 && (
            <View style={[styles.rainBadge, { backgroundColor: themeColors.info + '20' }]}>
              <Text style={[styles.rainText, { color: themeColors.info }]}>
                🌧️ {weather.rainProbability}% chance of rain
              </Text>
            </View>
          )}
        </Card>
      )}

      {isWeatherLoading && (
        <Card style={[styles.weatherCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.weatherLoading}>
            <ActivityIndicator size="small" color={themeColors.primary} />
            <Text style={[styles.weatherLoadingText, { color: themeColors.textSecondary }]}>
              Fetching live forecast...
            </Text>
          </View>
        </Card>
      )}

      {!isWeatherLoading && weatherError && (
        <Card style={[styles.weatherCard, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.weatherErrorText, { color: themeColors.error }]}>
            {weatherError}
          </Text>
          <Button
            title="Retry Weather"
            onPress={loadWeatherForSelectedDate}
            variant="outline"
            size="small"
            icon={<RefreshCw size={16} color={themeColors.primary} />}
            style={styles.retryWeatherBtn}
          />
        </Card>
      )}

      <Button
        title="Generate Outfit"
        onPress={handleNext}
        variant="primary"
        size="large"
        icon={<Sparkles size={20} color={themeColors.textInverse} />}
        style={styles.nextBtn}
        disabled={isWeatherLoading}
      />
    </View>
  );

  const renderGeneratingStep = () => (
    <View style={styles.generatingContent}>
      <View style={[styles.generatingIcon, { backgroundColor: themeColors.primary + '20' }]}>
        <Sparkles size={40} color={themeColors.primary} />
      </View>
      <Text style={[styles.generatingTitle, { color: themeColors.text }]}>
        Creating your outfit
      </Text>
      <Text style={[styles.generatingSubtitle, { color: themeColors.textSecondary }]}>
        Analyzing your closet for the perfect combination
      </Text>
      <ActivityIndicator size="large" color={themeColors.primary} style={styles.loader} />
    </View>
  );

  const renderResultStep = () => (
    <ScrollView 
      style={styles.resultScroll}
      contentContainerStyle={styles.resultContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.resultHeader}>
        <Text style={[styles.resultTitle, { color: themeColors.text }]}>
          Your Planned Outfit
        </Text>
        <View style={[styles.confidenceBadge, { backgroundColor: themeColors.success + '20' }]}>
          <Text style={[styles.confidenceText, { color: themeColors.success }]}>
            {plannedOutfit?.confidenceScore}% match
          </Text>
        </View>
      </View>

      <View style={styles.outfitInfo}>
        <View style={[styles.infoTag, { backgroundColor: themeColors.primary + '15' }]}>
          <Text style={[styles.infoTagText, { color: themeColors.primary }]}>
            {selectedOccasion === 'Custom' ? customOccasion : selectedOccasion}
          </Text>
        </View>
        {weather && (
          <View style={[styles.infoTag, { backgroundColor: themeColors.info + '15' }]}>
            <Text style={[styles.infoTagText, { color: themeColors.info }]}>
              {getWeatherIcon()} {weather.temperature}°C
            </Text>
          </View>
        )}
      </View>

      <Card style={[styles.itemsCard, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.itemsTitle, { color: themeColors.text }]}>Selected Items</Text>
        <View style={styles.itemsGrid}>
          {plannedOutfit?.items.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <View style={[styles.itemImage, { backgroundColor: themeColors.backgroundSecondary }]}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.itemImageInner}
                  contentFit="cover"
                />
              </View>
              <Text style={[styles.itemCategory, { color: themeColors.text }]} numberOfLines={1}>
                {item.category}
              </Text>
              <Text style={[styles.itemColor, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {item.color}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={[styles.whyCard, { backgroundColor: themeColors.secondary + '10' }]}>
        <Text style={[styles.whyTitle, { color: themeColors.text }]}>Why it works</Text>
        <Text style={[styles.whyText, { color: themeColors.textSecondary }]}>
          {plannedOutfit?.whyItWorks}
        </Text>
      </Card>

      <View style={styles.resultActions}>
        <Button
          title={isSaved ? "Saved!" : "Save Outfit"}
          onPress={handleSave}
          variant={isSaved ? "outline" : "primary"}
          size="large"
          icon={<Bookmark size={20} color={isSaved ? themeColors.primary : themeColors.textInverse} fill={isSaved ? themeColors.primary : 'transparent'} />}
          style={styles.actionBtn}
          disabled={isSaved}
        />
        <Button
          title="Regenerate"
          onPress={handleRegenerate}
          variant="outline"
          size="large"
          icon={<RefreshCw size={20} color={themeColors.primary} />}
          style={styles.actionBtn}
        />
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: themeColors.card }]}
            onPress={handleBack}
          >
            <ArrowLeft size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            Plan Outfit
          </Text>
          <View style={styles.placeholder} />
        </View>

        {step !== 'generating' && step !== 'result' && (
          <View style={styles.progress}>
            {['occasion', 'date', 'weather'].map((s, i) => (
              <View 
                key={s}
                style={[
                  styles.progressDot,
                  { 
                    backgroundColor: 
                      s === step ? themeColors.primary : 
                      ['occasion', 'date', 'weather'].indexOf(step) > i 
                        ? themeColors.primary 
                        : themeColors.border 
                  }
                ]}
              />
            ))}
          </View>
        )}

        {step === 'occasion' && renderOccasionStep()}
        {step === 'date' && renderDateStep()}
        {step === 'weather' && renderWeatherStep()}
        {step === 'generating' && renderGeneratingStep()}
        {step === 'result' && renderResultStep()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  placeholder: {
    width: 40,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  occasionGrid: {
    gap: 12,
  },
  occasionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  occasionText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  customInput: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  dateOptions: {
    gap: 12,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500' as const,
  },
  weatherCard: {
    padding: 24,
    marginBottom: 24,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  weatherEmoji: {
    fontSize: 48,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  weatherCondition: {
    fontSize: 16,
  },
  weatherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weatherLoadingText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  weatherErrorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  retryWeatherBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  rainBadge: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  rainText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  nextBtn: {
    marginTop: 'auto',
    marginBottom: 24,
  },
  generatingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  generatingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  generatingTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  generatingSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  outfitInfo: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  infoTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoTagText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  itemsCard: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemContainer: {
    width: '30%',
    alignItems: 'center',
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  itemImageInner: {
    width: '100%',
    height: '100%',
  },
  itemCategory: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  itemColor: {
    fontSize: 11,
  },
  whyCard: {
    marginBottom: 24,
    borderWidth: 0,
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  whyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultActions: {
    gap: 12,
  },
  actionBtn: {
    marginBottom: 0,
  },
});
