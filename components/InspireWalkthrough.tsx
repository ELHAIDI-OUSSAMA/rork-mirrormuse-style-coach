import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react-native';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  showSimilar?: boolean;
};

function Row({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

export function InspireWalkthrough({ visible, onDismiss, showSimilar = true }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onDismiss} />
        <View style={styles.card}>
          <Text style={styles.title}>Quick guide</Text>

          <View style={styles.rows}>
            <Row icon={<ArrowRight size={16} color={palette.ink} />} text="Swipe right to Like" />
            <Row icon={<ArrowLeft size={16} color={palette.ink} />} text="Swipe left to Pass" />
            <Row icon={<ArrowUp size={16} color={palette.ink} />} text="Swipe up to Save" />
            {showSimilar ? (
              <Row icon={<ArrowDown size={16} color={palette.ink} />} text="Swipe down for Similar" />
            ) : null}
          </View>

          <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 24, 22, 0.45)',
  },
  card: {
    width: '86%',
    backgroundColor: palette.warmWhite,
    borderRadius: radius.lg,
    padding: space.lg,
    ...shadow.card,
  },
  title: {
    ...typo.sectionHeader,
    color: palette.ink,
    marginBottom: space.md,
  },
  rows: {
    gap: 10,
    marginBottom: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.warmWhiteDark,
  },
  rowText: {
    ...typo.bodyMedium,
    color: palette.inkLight,
  },
  button: {
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  buttonText: {
    ...typo.button,
    color: palette.white,
  },
});

