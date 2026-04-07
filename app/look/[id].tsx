import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Trash2,
  Share2,
  RefreshCw,
  Calendar,
  Zap,
  TrendingUp,
  Shirt,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import appColors from '@/constants/Colors';
import { useApp } from '@/contexts/AppContext';
import { AlternativeLook } from '@/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ScoreDisplay } from '@/components/ScoreDisplay';
import { SuggestionCard } from '@/components/SuggestionCard';

export default function LookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getLookById, removeLook } = useApp();
  const look = getLookById(id || '');

  const handleDelete = () => {
    Alert.alert(
      'Delete Look',
      'Are you sure you want to delete this saved look?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (id) {
              removeLook(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!look) return;
    
    try {
      await Share.share({
        message: `My fit check from MirrorMuse:\n\n${look.results.summary}\n\nScore: ${look.results.fitScore}/5 ✨\n\nVibes: ${look.results.vibeTags.join(', ')}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleRescan = () => {
    router.push({
      pathname: '/loading' as any,
      params: {
        imageUri: look?.imageUri,
        occasion: look?.occasion,
        vibe: look?.vibe,
      },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!look) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.notFoundText}>Look not found</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="primary" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#FDF8F6', '#F5EDE8']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={appColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Look Details</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleDelete}>
            <Trash2 size={20} color={appColors.error} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageRow}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: look.imageUri }}
                style={styles.image}
                contentFit="cover"
              />
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.dateRow}>
                <Calendar size={14} color={appColors.textLight} />
                <Text style={styles.dateText}>{formatDate(look.createdAt)}</Text>
              </View>
              <View style={styles.vibeRow}>
                <Sparkles size={16} color={appColors.primary} />
                <Text style={styles.vibeLabel}>Your vibe</Text>
              </View>
              <ScoreDisplay score={look.results.fitScore} />
              <View style={styles.tags}>
                {look.results.vibeTags.slice(0, 3).map((tag, i) => (
                  <Chip
                    key={i}
                    label={tag}
                    selected={i === 0}
                    onPress={() => {}}
                    size="small"
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.metaTags}>
            <Chip label={look.vibe} selected onPress={() => {}} size="small" />
            <Chip label={look.occasion} selected={false} onPress={() => {}} size="small" />
          </View>

          <Card style={styles.summaryBox}>
            <Text style={styles.summary}>{look.results.summary}</Text>
          </Card>

          <SuggestionCard
            title="Quick Fixes (No Shopping)"
            icon={<Zap size={20} color={appColors.success} />}
            items={look.results.quickFixes}
            accentColor={appColors.success}
          />

          <SuggestionCard
            title="Upgrade Ideas"
            icon={<TrendingUp size={20} color={appColors.secondary} />}
            items={look.results.upgrades}
            accentColor={appColors.secondary}
          />

          <Text style={styles.sectionTitle}>Alternative Looks</Text>
          {look.results.alternativeLooks.map((altLook, index) => (
            <AlternativeLookCard key={index} look={altLook} />
          ))}

          {look.results.avoid.length > 0 && (
            <SuggestionCard
              title="Things to Avoid"
              icon={<AlertCircle size={20} color={appColors.error} />}
              items={look.results.avoid}
              accentColor={appColors.error}
            />
          )}

          <View style={styles.actions}>
            <Button
              title="Share"
              onPress={handleShare}
              variant="outline"
              size="medium"
              icon={<Share2 size={18} color={appColors.primary} />}
              style={styles.actionBtn}
            />
            <Button
              title="Re-analyze"
              onPress={handleRescan}
              variant="primary"
              size="medium"
              icon={<RefreshCw size={18} color={appColors.text} />}
              style={styles.actionBtn}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function AlternativeLookCard({ look }: { look: AlternativeLook }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.altLookCard}>
      <TouchableOpacity
        style={styles.altLookHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.altLookIcon}>
          <Shirt size={18} color={appColors.primary} />
        </View>
        <Text style={styles.altLookTitle}>{look.title}</Text>
        {expanded ? (
          <ChevronUp size={18} color={appColors.textSecondary} />
        ) : (
          <ChevronDown size={18} color={appColors.textSecondary} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={styles.altLookContent}>
          {look.items.map((item, i) => (
            <View key={i} style={styles.altLookItem}>
              <View style={styles.altLookBullet} />
              <Text style={styles.altLookItemText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.altLookWhy}>{look.whyItWorks}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: appColors.background,
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    color: appColors.textSecondary,
    marginBottom: 24,
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
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: appColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: appColors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  imageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageContainer: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  summaryCard: {
    flex: 1,
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: appColors.textLight,
    marginLeft: 6,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vibeLabel: {
    fontSize: 14,
    color: appColors.textSecondary,
    marginLeft: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  metaTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryBox: {
    marginBottom: 16,
    backgroundColor: appColors.primary + '15',
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: appColors.text,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: appColors.text,
    marginTop: 8,
    marginBottom: 12,
  },
  altLookCard: {
    marginBottom: 10,
  },
  altLookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  altLookIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: appColors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  altLookTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: appColors.text,
  },
  altLookContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: appColors.borderLight,
  },
  altLookItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  altLookBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: appColors.primary,
    marginTop: 6,
    marginRight: 10,
  },
  altLookItemText: {
    flex: 1,
    fontSize: 14,
    color: appColors.textSecondary,
    lineHeight: 20,
  },
  altLookWhy: {
    fontSize: 13,
    color: appColors.textLight,
    fontStyle: 'italic',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
  },
});
