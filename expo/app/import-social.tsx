import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Link2, Share2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { palette, radius, space, type as typo } from '@/constants/theme';
import { inferImportLinkSource, isValidImportLink } from '@/lib/importLinkValidation';
import { trackSocialImportEvent } from '@/lib/socialImportEntry';

export default function ImportSocialScreen() {
  const router = useRouter();
  const [link, setLink] = useState('');
  const [importingLink, setImportingLink] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    trackSocialImportEvent('import_social_hub_opened');
  }, []);

  const handleImportLink = () => {
    const trimmed = link.trim();
    trackSocialImportEvent('import_link_submitted', { source: inferImportLinkSource(trimmed) });
    if (!isValidImportLink(trimmed)) {
      Alert.alert('Invalid link', 'Please paste a valid Instagram, TikTok, Pinterest, or web link.');
      return;
    }
    setImportingLink(true);
    router.push({
      pathname: '/imported-outfit',
      params: {
        sourceUrl: trimmed,
        importSource: 'link',
      },
    } as any);
    setTimeout(() => setImportingLink(false), 400);
  };

  const handleUploadScreenshot = async () => {
    setUploading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.95,
      });
      if (result.canceled || !result.assets[0]) return;
      trackSocialImportEvent('import_screenshot_selected');
      router.push({
        pathname: '/imported-outfit',
        params: {
          sourceUrl: `file-upload://${Date.now()}`,
          mediaUrl: result.assets[0].uri,
          importSource: 'screenshot',
        },
      } as any);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={18} color={palette.ink} />} onPress={() => router.back()} size={38} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Import from social media</Text>
            <Text style={styles.subtitle}>Bring outfits you discover online into MirrorMuse</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.optionCard}>
            <View style={styles.optionHead}>
              <View style={styles.optionIcon}><Link2 size={16} color={palette.accentDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Paste a link</Text>
                <Text style={styles.optionSubtitle}>Import from Instagram, TikTok, Pinterest, or Safari</Text>
              </View>
            </View>
            <TextInput
              value={link}
              onChangeText={setLink}
              style={styles.input}
              placeholder="Paste post or page URL"
              placeholderTextColor={palette.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              title={importingLink ? 'Importing outfit…' : 'Import'}
              variant="secondary"
              onPress={handleImportLink}
              disabled={importingLink}
            />
          </Card>

          <Card style={styles.optionCard} variant="flat">
            <View style={styles.optionHead}>
              <View style={styles.optionIcon}><Share2 size={16} color={palette.secondaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Share to MirrorMuse</Text>
                <Text style={styles.optionSubtitle}>Use the share menu from your favorite apps</Text>
              </View>
            </View>
            <Text style={styles.steps}>1. Open Instagram, TikTok, or Pinterest</Text>
            <Text style={styles.steps}>2. Tap Share</Text>
            <Text style={styles.steps}>3. Select MirrorMuse</Text>
          </Card>

          <Card style={styles.optionCard}>
            <View style={styles.optionHead}>
              <View style={styles.optionIcon}><Camera size={16} color={palette.info} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Upload screenshot</Text>
                <Text style={styles.optionSubtitle}>Import an outfit screenshot and detect the pieces</Text>
              </View>
            </View>
            <Button
              title={uploading ? 'Analyzing outfit…' : 'Choose screenshot'}
              variant="outline"
              onPress={handleUploadScreenshot}
              disabled={uploading}
              icon={uploading ? <ActivityIndicator size="small" color={palette.accentDark} /> : undefined}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.screen, paddingBottom: space.sm },
  headerText: { flex: 1 },
  title: { ...typo.screenTitle, color: palette.ink, fontSize: 30, lineHeight: 36 },
  subtitle: { ...typo.caption, color: palette.inkMuted },
  content: { paddingHorizontal: space.screen, paddingBottom: 120, gap: space.md },
  optionCard: { gap: 10 },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { ...typo.bodyMedium, color: palette.ink },
  optionSubtitle: { ...typo.small, color: palette.inkMuted },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.borderLight,
    backgroundColor: palette.white,
    paddingHorizontal: 12,
    color: palette.ink,
    ...typo.body,
  },
  steps: { ...typo.body, color: palette.inkLight },
});
