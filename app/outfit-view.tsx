import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';

const { width, height } = Dimensions.get('window');
const CANVAS_HEIGHT = height * 0.5;

export default function OutfitViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const {
    composedOutfits,
    getClosetItemById,
    removeComposedOutfit,
    preferences,
    themeColors,
  } = useApp();

  const outfit = useMemo(
    () => composedOutfits.find((o) => o.id === id),
    [composedOutfits, id]
  );

  if (!outfit) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={[styles.errorText, { color: themeColors.error }]}>
            Outfit not found
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to delete this outfit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeComposedOutfit(outfit.id);
            router.back();
          },
        },
      ]
    );
  };

  const sortedStickers = useMemo(
    () => [...outfit.stickers].sort((a, b) => a.zIndex - b.zIndex),
    [outfit.stickers]
  );

  const gradientColors =
    preferences.gender === 'male'
      ? (['#FAFAFA', '#F0F0F0'] as const)
      : (['#FDF8F6', '#F5EDE8'] as const);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: themeColors.card }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {outfit.name || 'Untitled Outfit'}
          </Text>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: themeColors.error + '15' }]}
            onPress={handleDelete}
          >
            <Trash2 size={18} color={themeColors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.canvas,
              { backgroundColor: themeColors.backgroundSecondary },
            ]}
          >
            {sortedStickers.map((sticker, idx) => {
              const item = getClosetItemById(sticker.closetItemId);
              if (!item?.stickerPngUri) return null;

              return (
                <View
                  key={`${outfit.id}-${sticker.closetItemId}-${idx}`}
                  style={[
                    styles.canvasSticker,
                    {
                      left: sticker.x,
                      top: sticker.y,
                      zIndex: sticker.zIndex,
                      transform: [
                        { rotate: `${sticker.rotation}deg` },
                        { scale: sticker.scale },
                      ],
                    },
                  ]}
                >
                  <View style={styles.stickerOutline}>
                    <Image
                      source={{ uri: item.stickerPngUri }}
                      style={styles.canvasStickerImage}
                      contentFit="contain"
                    />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.infoCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.infoRow}>
              <Calendar size={16} color={themeColors.textLight} />
              <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
                Created {new Date(outfit.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
              {outfit.stickers.length} items
            </Text>
          </View>

          {outfit.aiReview && (
            <View style={[styles.reviewCard, { backgroundColor: themeColors.card }]}>
              <View style={styles.reviewHeader}>
                <Sparkles size={20} color={themeColors.primary} />
                <Text style={[styles.reviewTitle, { color: themeColors.text }]}>
                  AI Review
                </Text>
              </View>

              <View style={[styles.scoreCard, { backgroundColor: themeColors.primary + '15' }]}>
                <Text style={[styles.scoreValue, { color: themeColors.primary }]}>
                  {outfit.aiReview.overallScore}/10
                </Text>
                <Text style={[styles.scoreSummary, { color: themeColors.text }]}>
                  {outfit.aiReview.summary}
                </Text>
              </View>

              {outfit.aiReview.whatWorks.length > 0 && (
                <View style={styles.reviewSection}>
                  <View style={styles.sectionHeader}>
                    <CheckCircle2 size={16} color={themeColors.success} />
                    <Text style={[styles.sectionTitle, { color: themeColors.success }]}>
                      What Works
                    </Text>
                  </View>
                  {outfit.aiReview.whatWorks.map((point, i) => (
                    <Text key={i} style={[styles.bulletPoint, { color: themeColors.text }]}>
                      • {point}
                    </Text>
                  ))}
                </View>
              )}

              {outfit.aiReview.improvements.length > 0 && (
                <View style={styles.reviewSection}>
                  <View style={styles.sectionHeader}>
                    <AlertCircle size={16} color={themeColors.warning} />
                    <Text style={[styles.sectionTitle, { color: themeColors.warning }]}>
                      Improvements
                    </Text>
                  </View>
                  {outfit.aiReview.improvements.map((point, i) => (
                    <Text key={i} style={[styles.bulletPoint, { color: themeColors.text }]}>
                      • {point}
                    </Text>
                  ))}
                </View>
              )}

              {outfit.aiReview.styleDirection.length > 0 && (
                <View style={styles.reviewSection}>
                  <View style={styles.sectionHeader}>
                    <TrendingUp size={16} color={themeColors.secondary} />
                    <Text style={[styles.sectionTitle, { color: themeColors.secondary }]}>
                      Style Tips
                    </Text>
                  </View>
                  {outfit.aiReview.styleDirection.map((point, i) => (
                    <Text key={i} style={[styles.bulletPoint, { color: themeColors.text }]}>
                      • {point}
                    </Text>
                  ))}
                </View>
              )}

              {outfit.aiReview.occasionFit.bestOccasions.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Best For
                  </Text>
                  <Text style={[styles.occasionText, { color: themeColors.textSecondary }]}>
                    {outfit.aiReview.occasionFit.bestOccasions.join(', ')}
                  </Text>
                </View>
              )}

              {outfit.aiReview.occasionFit.avoidOccasions.length > 0 && (
                <View style={styles.reviewSection}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Avoid For
                  </Text>
                  <Text style={[styles.occasionText, { color: themeColors.textSecondary }]}>
                    {outfit.aiReview.occasionFit.avoidOccasions.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  canvas: {
    height: CANVAS_HEIGHT,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  canvasSticker: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  stickerOutline: {
    width: '100%',
    height: '100%',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 0,
  },
  canvasStickerImage: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  scoreCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  scoreSummary: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  reviewSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  occasionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
