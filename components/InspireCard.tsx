import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { InspirationCard as InspirationCardModel } from '@/types/inspiration';
import { palette, shadow, space, type as typo } from '@/constants/theme';

type Props = {
  card: InspirationCardModel;
  muted?: boolean;
  onPress: (card: InspirationCardModel) => void;
};

function InspireCardBase({ card, muted = false, onPress }: Props) {
  const title = `${card.tags?.[0] || 'Editorial'}${card.occasion ? ` • ${card.occasion}` : ''}`;
  return (
    <Pressable style={[styles.card, muted && styles.mutedCard]} onPress={() => onPress(card)}>
      <Image
        source={{ uri: card.imageUrl }}
        placeholder={card.thumbnailUrl ? { uri: card.thumbnailUrl } : undefined}
        style={styles.image}
        contentFit="cover"
      />
      <LinearGradient colors={['transparent', 'rgba(24,24,24,0.56)']} style={styles.overlay} />
      <View style={styles.meta}>
        <Text style={styles.metaTop}>{title}</Text>
        <Text style={styles.metaSub}>Tap to see why this works</Text>
      </View>
    </Pressable>
  );
}

export const InspireCard = React.memo(InspireCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: palette.white,
    ...shadow.card,
  },
  mutedCard: {
    shadowOpacity: 0.04,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: palette.warmWhiteDark,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
  meta: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xl,
    gap: 4,
  },
  metaTop: {
    ...typo.sectionHeader,
    color: palette.white,
    fontWeight: '600',
  },
  metaSub: {
    ...typo.caption,
    color: 'rgba(255,255,255,0.88)',
  },
});
