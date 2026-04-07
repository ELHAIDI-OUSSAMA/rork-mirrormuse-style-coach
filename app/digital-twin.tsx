import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ArrowLeft, Trash2, UserRound } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';

export default function DigitalTwinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ outfitId?: string; closetItemIds?: string }>();
  const { avatarProfile, virtualTryOnRenders, createDigitalTwin, renderDigitalTryOn, deleteDigitalTwin } = useApp();
  const [faceUri, setFaceUri] = useState<string | null>(null);
  const [bodyUri, setBodyUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const latestRender = virtualTryOnRenders[0];
  const parsedClosetItemIds = useMemo(
    () => (params.closetItemIds ? String(params.closetItemIds).split(',').filter(Boolean) : []),
    [params.closetItemIds]
  );

  const pickImage = async (kind: 'face' | 'body') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    if (kind === 'face') setFaceUri(result.assets[0].uri);
    if (kind === 'body') setBodyUri(result.assets[0].uri);
  };

  const onCreateAvatar = async () => {
    if (!faceUri || !bodyUri || busy) return;
    setBusy(true);
    try {
      await createDigitalTwin(faceUri, bodyUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Digital Twin failed', error instanceof Error ? error.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const onRenderTryOn = async () => {
    if (!avatarProfile || avatarProfile.status !== 'ready' || busy) return;
    setBusy(true);
    try {
      await renderDigitalTryOn({
        source: params.outfitId ? 'fit_check' : 'outfit_builder',
        outfitId: params.outfitId ? String(params.outfitId) : undefined,
        closetItemIds: parsedClosetItemIds.length > 0 ? parsedClosetItemIds : undefined,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Try-on failed', error instanceof Error ? error.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const onDeleteAvatar = () => {
    Alert.alert(
      'Delete Digital Twin',
      'This removes avatar photos and generated try-on renders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDigitalTwin();
            setFaceUri(null);
            setBodyUri(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Digital Twin</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={onDeleteAvatar}>
            <Trash2 size={18} color={palette.error} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Photos are used only to generate avatar-based try-on previews. No body critique or scoring.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 1: Face photo</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('face')}>
              {faceUri ? (
                <Image source={{ uri: faceUri }} style={styles.uploadPreview} contentFit="cover" />
              ) : (
                <Text style={styles.uploadLabel}>Upload face photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 2: Full-body photo</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('body')}>
              {bodyUri ? (
                <Image source={{ uri: bodyUri }} style={styles.uploadPreview} contentFit="cover" />
              ) : (
                <Text style={styles.uploadLabel}>Upload full-body photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!faceUri || !bodyUri || busy) && styles.btnDisabled]}
            onPress={onCreateAvatar}
            disabled={!faceUri || !bodyUri || busy}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? 'Creating…' : avatarProfile?.status === 'ready' ? 'Recreate Twin' : 'Create Digital Twin'}
            </Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Virtual Try-On</Text>
            <Text style={styles.subtle}>
              {avatarProfile?.status === 'ready'
                ? 'Your twin is ready. Generate an outfit preview.'
                : 'Create your Digital Twin first.'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, avatarProfile?.status !== 'ready' && styles.btnDisabled]}
              onPress={onRenderTryOn}
              disabled={avatarProfile?.status !== 'ready' || busy}
            >
              <UserRound size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Try on with my Twin</Text>
            </TouchableOpacity>
          </View>

          {latestRender ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Latest Render</Text>
              <Image source={{ uri: latestRender.renderImageUri }} style={styles.renderImage} contentFit="cover" />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: {
    paddingHorizontal: space.screen,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  content: { paddingHorizontal: space.screen, paddingBottom: 120, gap: space.md },
  notice: {
    borderRadius: radius.md,
    backgroundColor: palette.infoLight,
    padding: space.md,
  },
  noticeText: { ...typo.caption, color: palette.inkLight },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.soft,
  },
  cardTitle: { ...typo.bodyMedium, color: palette.ink },
  subtle: { ...typo.caption, color: palette.inkMuted, marginTop: 4 },
  uploadBox: {
    marginTop: space.sm,
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadLabel: { ...typo.body, color: palette.inkMuted },
  uploadPreview: { width: '100%', height: '100%' },
  primaryBtn: {
    marginTop: space.md,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { ...typo.button, color: '#FFF' },
  renderImage: {
    marginTop: space.sm,
    width: '100%',
    height: 300,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
  },
});
