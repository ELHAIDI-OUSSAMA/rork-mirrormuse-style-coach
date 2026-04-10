import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Camera,
  Image as ImageIcon,
  Lightbulb,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useApp } from '@/contexts/AppContext';
import { ClosetItem } from '@/types';
import { addImageToClosetPipeline } from '@/lib/closetPipeline';
import { Toast } from '@/components/Toast';

const GUIDANCE_TIPS = [
  'Place item on plain background (bed/sheet/wall)',
  'Make sure item is fully in frame',
  'Good lighting helps quality',
  'Avoid heavy shadows',
  'For outfit photos: auto-extracts individual items',
];

export default function AddClothingScreen() {
  const router = useRouter();
  const { addClosetItem, removeClosetItem, themeColors, preferences } = useApp();
  const [busy, setBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<'info' | 'success' | 'warning'>('info');

  const showToast = (message: string, tone: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastTone(tone);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (busy) return;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to add clothing items.');
        return;
      }
    }

    const pickerResult =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });

    if (pickerResult.canceled || !pickerResult.assets[0]) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const imageUri = pickerResult.assets[0].uri;

    setBusy(true);
    setBusyMessage('Scanning...');

    const stagingId = `closet_scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const stagingItem: ClosetItem = {
      id: stagingId,
      imageUri,
      category: 'T-shirt',
      color: 'Unknown',
      styleTags: [],
      createdAt: new Date().toISOString(),
      source: 'manual',
      position: {
        x: Math.random() * 220 + 16,
        y: Math.random() * 300,
        rotation: (Math.random() - 0.5) * 16,
        scale: 0.85 + Math.random() * 0.25,
      },
      usageCount: 0,
      outlineEnabled: true,
      isProcessing: true,
      processingStatus: 'queued',
      processingStep: 'adding',
    };
    addClosetItem(stagingItem);

    // Non-blocking UX: go back to closet immediately while pipeline continues in background.
    router.replace('/(tabs)/closet' as any);
    setBusy(false);
    setBusyMessage('');

    void (async () => {
      try {
      const pipelineResult = await addImageToClosetPipeline({
        source: source === 'camera' ? 'closet_camera' : 'closet_upload',
        imageUri,
        addClosetItem,
        onProgress: ({ message }) => {
          setBusyMessage(message);
        },
      });

      // Remove temporary staging row once real placeholders/results have been created.
      removeClosetItem(stagingId);

      if (pipelineResult.addedCount === 0) {
        const detected = pipelineResult.detectedItems?.length || 0;
        if (detected === 0 && pipelineResult.classification.type !== 'single_item') {
          console.log('[AddClothing] No pieces detected from uploaded image');
        } else if (pipelineResult.duplicateCount > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast('Already added: detected pieces are already in your closet.', 'warning');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast('Items detected but could not be added. Try again.', 'warning');
        }
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const count = pipelineResult.addedCount;
      const partial = pipelineResult.failedCount > 0
        ? ` (${pipelineResult.failedCount} couldn't be extracted)`
        : '';
      showToast(`Added ${count} item${count > 1 ? 's' : ''} - stickers processing in background${partial}`, 'success');
      } catch (error) {
        console.log('[AddClothing] closet pipeline failed:', error);
        removeClosetItem(stagingId);
      }
    })();
  };

  const gradientColors = preferences.gender === 'male'
    ? (['#FAFAFA', '#F0F0F0'] as const)
    : (['#FDF8F6', '#F5EDE8'] as const);

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: themeColors.card }]}
            onPress={() => router.back()}
          >
            <X size={20} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            Add Clothing
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.guideContainer}>
            <View style={[styles.guideCard, { backgroundColor: themeColors.card }]}>
              <Lightbulb size={32} color={themeColors.primary} />
              <Text style={[styles.guideTitle, { color: themeColors.text }]}>
                Tips for Best Results
              </Text>
              <View style={styles.guideTips}>
                {GUIDANCE_TIPS.map((tip, index) => (
                  <View key={index} style={styles.guideTipRow}>
                    <View style={[styles.guideDot, { backgroundColor: themeColors.primary }]} />
                    <Text style={[styles.guideTipText, { color: themeColors.textSecondary }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.captureButtons}>
              <TouchableOpacity
                style={[styles.captureButton, { backgroundColor: themeColors.primary, opacity: busy ? 0.6 : 1 }]}
                onPress={() => pickImage('camera')}
                disabled={busy}
              >
                <Camera size={24} color="#FFF" />
                <Text style={styles.captureButtonText}>
                  {busy ? busyMessage || 'Scanning...' : 'Take Photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, { backgroundColor: themeColors.secondary, opacity: busy ? 0.6 : 1 }]}
                onPress={() => pickImage('gallery')}
                disabled={busy}
              >
                <ImageIcon size={24} color="#FFF" />
                <Text style={styles.captureButtonText}>
                  {busy ? busyMessage || 'Scanning...' : 'Upload from Gallery'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
      <Toast visible={toastVisible} message={toastMessage} tone={toastTone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  guideContainer: { flex: 1, justifyContent: 'center' },
  guideCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  guideTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 16, marginBottom: 20 },
  guideTips: { width: '100%', gap: 12 },
  guideTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  guideDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  guideTipText: { flex: 1, fontSize: 15, lineHeight: 22 },
  captureButtons: { marginTop: 24, gap: 12 },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  captureButtonText: { fontSize: 16, fontWeight: '600' as const, color: '#FFF' },
});
