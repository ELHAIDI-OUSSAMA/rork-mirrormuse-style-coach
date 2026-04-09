import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, ImagePlus } from 'lucide-react-native';
import { palette, radius, shadow, space, type as typo } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';

function PhotoCard({
  title,
  subtitle,
  uri,
  onCamera,
  onLibrary,
}: {
  title: string;
  subtitle: string;
  uri: string | null;
  onCamera: () => void;
  onLibrary: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.previewBox}>
        {uri ? <Image source={{ uri }} style={styles.preview} contentFit="cover" /> : <Text style={styles.previewHint}>No photo yet</Text>}
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onCamera}>
          <Camera size={16} color={palette.ink} />
          <Text style={styles.secondaryBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onLibrary}>
          <ImagePlus size={16} color={palette.ink} />
          <Text style={styles.secondaryBtnText}>Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AITwinSetupScreen() {
  const router = useRouter();
  const { createDigitalTwin } = useApp();
  const [step, setStep] = useState(1);
  const [faceUri, setFaceUri] = useState<string | null>(null);
  const [bodyUri, setBodyUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const progressLabel = useMemo(() => `Step ${step} of 3`, [step]);

  const pickPhoto = async (kind: 'face' | 'body', source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const cameraPerm = await ImagePicker.getCameraPermissionsAsync();
        const granted = cameraPerm.granted
          ? cameraPerm.granted
          : (await ImagePicker.requestCameraPermissionsAsync()).granted;
        if (!granted) {
          Alert.alert('Camera permission needed', 'Please allow camera access in Settings, or use Photo Library.');
          return;
        }
      } else {
        const libraryPerm = await ImagePicker.getMediaLibraryPermissionsAsync();
        const granted = libraryPerm.granted
          ? libraryPerm.granted
          : (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;
        if (!granted) {
          Alert.alert('Photo access needed', 'Please allow photo access in Settings.');
          return;
        }
      }

      const launcher = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await launcher({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if ((asset.width || 0) < 700 || (asset.height || 0) < 700) {
        Alert.alert('Try another photo', 'This image may be blurry or too low resolution. You can continue, but a clearer photo usually works better.');
      }

      if (kind === 'face') setFaceUri(asset.uri);
      if (kind === 'body') setBodyUri(asset.uri);
    } catch (error) {
      console.log('[AI Twin] image picker failed:', error);
      Alert.alert(
        'Could not open camera',
        source === 'camera'
          ? 'Camera is unavailable on this device right now. Please use Photo Library.'
          : 'Could not open your photo library.'
      );
    }
  };

  const onContinueStep1 = () => {
    if (!faceUri) {
      Alert.alert('Face photo required', 'Please add a clear face photo first.');
      return;
    }
    setStep(2);
  };

  const onContinueStep2 = () => {
    if (!bodyUri) {
      Alert.alert('Full-body photo required', 'Please add a full-body photo first.');
      return;
    }
    setStep(3);
  };

  const onCreateTwin = async () => {
    if (!faceUri || !bodyUri || busy) return;
    setBusy(true);
    try {
      await createDigitalTwin(faceUri, bodyUri);
      router.replace('/ai-twin/status' as any);
    } catch (error) {
      Alert.alert('Could not create Twin', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={palette.ink} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>AI Twin Setup</Text>
            <Text style={styles.progress}>{progressLabel}</Text>
          </View>
          <View style={styles.iconBtnGhost} />
        </View>

        <View style={styles.content}>
          {step === 1 ? (
            <PhotoCard
              title="Add a clear face photo"
              subtitle="Front-facing, good lighting, no sunglasses, no filters."
              uri={faceUri}
              onCamera={() => pickPhoto('face', 'camera')}
              onLibrary={() => pickPhoto('face', 'library')}
            />
          ) : null}

          {step === 2 ? (
            <PhotoCard
              title="Add a full-body photo"
              subtitle="Stand straight, full outfit visible, simple background."
              uri={bodyUri}
              onCamera={() => pickPhoto('body', 'camera')}
              onLibrary={() => pickPhoto('body', 'library')}
            />
          ) : null}

          {step === 3 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Review & create</Text>
              <Text style={styles.cardSubtitle}>We use these photos to generate your AI Twin and try-on previews. You can delete your Twin anytime.</Text>
              <View style={styles.reviewRow}>
                <Image source={{ uri: faceUri || '' }} style={styles.reviewImage} contentFit="cover" />
                <Image source={{ uri: bodyUri || '' }} style={styles.reviewImage} contentFit="cover" />
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          {step === 1 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onContinueStep1}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          ) : null}
          {step === 2 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={onContinueStep2}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          ) : null}
          {step === 3 ? (
            <TouchableOpacity style={[styles.primaryBtn, busy && styles.disabled]} onPress={onCreateTwin} disabled={busy}>
              <Text style={styles.primaryBtnText}>{busy ? 'Creating…' : 'Create my Twin'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
  iconBtnGhost: { width: 38, height: 38 },
  title: { ...typo.sectionHeader, color: palette.ink, textAlign: 'center' },
  progress: { ...typo.caption, color: palette.inkMuted, textAlign: 'center', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: space.screen },
  card: {
    backgroundColor: palette.white,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.soft,
  },
  cardTitle: { ...typo.bodyMedium, color: palette.ink },
  cardSubtitle: { ...typo.caption, color: palette.inkMuted, marginTop: 6 },
  previewBox: {
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: palette.borderLight,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  previewHint: { ...typo.body, color: palette.inkMuted },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: space.sm },
  secondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtnText: { ...typo.bodyMedium, color: palette.ink },
  reviewRow: { flexDirection: 'row', gap: 10, marginTop: space.sm },
  reviewImage: {
    flex: 1,
    aspectRatio: 0.75,
    borderRadius: radius.md,
    backgroundColor: palette.warmWhiteDark,
  },
  footer: { paddingHorizontal: space.screen, paddingBottom: space.lg },
  primaryBtn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  primaryBtnText: { ...typo.button, color: '#FFF' },
  disabled: { opacity: 0.5 },
});
