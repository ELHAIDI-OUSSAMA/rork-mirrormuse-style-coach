import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, HeartHandshake } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';

export default function DonateItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ closetItemId?: string }>();
  const { getClosetItemById, updateClosetItem } = useApp();
  const item = params.closetItemId ? getClosetItemById(params.closetItemId) : undefined;

  if (!item) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          </View>
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Item not found</Text>
          </Card>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <Text style={styles.title}>Donate Item</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.content}>
          <Card style={styles.itemCard}>
            <Image source={{ uri: item.stickerPngUri || item.imageUri }} style={styles.image} contentFit="cover" />
            <Text style={styles.itemTitle}>{item.color} {item.category}</Text>
            <Text style={styles.itemMeta}>Condition summary: gently used ({item.usageCount || 0} wears)</Text>
            <View style={styles.promptRow}>
              <HeartHandshake size={16} color={palette.accentDark} />
              <Text style={styles.promptText}>This item could have a second life.</Text>
            </View>
          </Card>

          <Button
            title="Confirm donation"
            variant="secondary"
            size="large"
            onPress={() => {
              updateClosetItem(item.id, {
                status: 'donated',
                donationIntent: true,
                estimatedDonationValue: item.estimatedDonationValue ?? Math.max(8, Math.round((item.price || 20) * 0.25)),
                cleanupDismissedUntil: undefined,
                lifecycleUpdatedAt: new Date().toISOString(),
              });
              router.replace('/closet-cleanup' as any);
            }}
          />
          <Button
            title="Maybe later"
            variant="outline"
            size="large"
            onPress={() => {
              updateClosetItem(item.id, {
                donationIntent: false,
                status: 'cleanup_candidate',
                cleanupDismissedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                lifecycleUpdatedAt: new Date().toISOString(),
              });
              router.back();
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingBottom: space.md,
  },
  title: { ...typo.sectionHeader, color: palette.ink },
  content: { paddingHorizontal: space.screen, gap: space.md },
  itemCard: { alignItems: 'center', gap: space.sm },
  image: {
    width: '100%',
    height: 290,
    borderRadius: radius.lg,
    backgroundColor: palette.warmWhiteDark,
  },
  itemTitle: { ...typo.sectionHeader, color: palette.ink, textTransform: 'capitalize' },
  itemMeta: { ...typo.body, color: palette.inkMuted, textAlign: 'center' },
  promptRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.accentLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promptText: { ...typo.caption, color: palette.accentDark },
  emptyCard: { margin: space.screen },
  emptyTitle: { ...typo.bodyMedium, color: palette.ink },
});
