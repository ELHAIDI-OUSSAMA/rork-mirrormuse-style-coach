import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

export default function AITwinManageScreen() {
  const router = useRouter();
  const { avatarProfile, virtualTryOnRenders, deleteDigitalTwin } = useApp();

  const onDelete = () => {
    Alert.alert('Delete AI Twin', 'This removes your twin and all linked try-on renders.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDigitalTwin();
          router.replace('/ai-twin/setup' as any);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>AI Twin</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
            <Trash2 size={18} color={palette.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!avatarProfile || avatarProfile.status === 'none' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No Twin yet</Text>
              <Text style={styles.cardSubtitle}>Create your digital twin to preview outfits on yourself.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/ai-twin/setup' as any)}>
                <Text style={styles.primaryBtnText}>Create AI Twin</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {avatarProfile ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status: {avatarProfile.status}</Text>
              <Text style={styles.cardSubtitle}>Try-on renders: {virtualTryOnRenders.length}</Text>
              <Image
                source={{ uri: avatarProfile.twinImageUri || avatarProfile.bodyImageUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
              <View style={styles.row}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/ai-twin/setup' as any)}>
                  <Text style={styles.secondaryBtnText}>Update photos</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/ai-twin/status' as any)}>
                  <Text style={styles.primaryBtnText}>Open status</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
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
  title: { ...typo.sectionHeader, color: palette.ink },
  content: { paddingHorizontal: space.screen, paddingBottom: 120 },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.soft,
  },
  cardTitle: { ...typo.bodyMedium, color: palette.ink },
  cardSubtitle: { ...typo.caption, color: palette.inkMuted, marginTop: 4 },
  previewImage: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
    marginTop: space.sm,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: space.md },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  primaryBtnText: { ...typo.button, color: '#FFF' },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.warmWhiteDark,
  },
  secondaryBtnText: { ...typo.button, color: palette.ink },
});
