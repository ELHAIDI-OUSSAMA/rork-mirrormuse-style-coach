import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Palette,
  Shield,
  Trash2,
  ChevronRight,
  Crown,
  HelpCircle,
  FileText,
  Shirt,
  UserCircle,
  Bell,
  Sparkles,
  CloudSun,
  Calendar,
  Heart,
  HandHeart,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Chip } from '@/components/Chip';
import { AppHeader } from '@/components/AppHeader';
import { MODESTY_LEVELS, BUDGET_LEVELS, TONE_PREFERENCES } from '@/types';
import { space, radius, palette, type as typo } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    preferences,
    setModestyLevel,
    setBudgetLevel,
    setTone,
    setGender,
    clearAllData,
    clearCloset,
    savedLooks,
    closetItems,
    plannedOutfits,
    cleanupCandidates,
    isGuest,
    themeColors,
    notificationSettings,
    updateNotificationSetting,
    creatorSettings,
    toggleCreatorMode,
    avatarProfile,
    virtualTryOnRenders,
    deleteDigitalTwin,
  } = useApp();
  const [showPrefs, setShowPrefs] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleDeleteData = () => {
    Alert.alert(
      'Delete all data?',
      'This will permanently remove everything. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleClearCloset = () => {
    Alert.alert(
      'Clear closet?',
      `This will remove all ${closetItems.length} items. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearCloset();
            Alert.alert('Done', 'Your closet has been cleared.');
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon, iconBg, title, subtitle, onPress, danger = false, showArrow = true, rightElement,
  }: {
    icon: React.ReactNode; iconBg?: string; title: string; subtitle?: string;
    onPress?: () => void; danger?: boolean; showArrow?: boolean; rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={[s.rowIcon, { backgroundColor: danger ? palette.error : (iconBg || palette.inkMuted) }]}>
        {icon}
      </View>
      <View style={s.rowContent}>
        <View style={s.rowText}>
          <Text style={[typo.body, { color: danger ? palette.error : palette.ink, fontSize: 16 }]}>{title}</Text>
          {subtitle && <Text style={[typo.caption, { color: palette.inkMuted, marginTop: 1 }]}>{subtitle}</Text>}
        </View>
        {rightElement}
        {showArrow && onPress && !rightElement && (
          <ChevronRight size={17} color={palette.inkFaint} />
        )}
      </View>
    </TouchableOpacity>
  );

  const ToggleRow = ({
    icon, iconBg, title, subtitle, value, onValueChange,
  }: {
    icon: React.ReactNode; iconBg?: string; title: string; subtitle?: string;
    value: boolean; onValueChange: (v: boolean) => void;
  }) => (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: iconBg || palette.inkMuted }]}>{icon}</View>
      <View style={s.rowContent}>
        <View style={s.rowText}>
          <Text style={[typo.body, { color: palette.ink, fontSize: 16 }]}>{title}</Text>
          {subtitle && <Text style={[typo.caption, { color: palette.inkMuted, marginTop: 1 }]}>{subtitle}</Text>}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.borderLight, true: themeColors.primary }}
          thumbColor="#FFF"
        />
      </View>
    </View>
  );

  const Separator = () => <View style={s.separator} />;

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <AppHeader title="Settings" />

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.proCard}>
            <View style={s.proHeader}>
              <View style={s.proBadge}>
                <Crown size={18} color="#FF9500" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.headline, { color: palette.ink }]}>MirrorMuse Pro</Text>
                <Text style={[typo.caption, { color: palette.inkMuted, marginTop: 2 }]}>
                  Unlimited scans, weather mode & more
                </Text>
              </View>
              <View style={s.proBtn}>
                <Text style={s.proBtnText}>Coming Soon</Text>
              </View>
            </View>
          </View>

          <Text style={s.sectionLabel}>DIGITAL TWIN</Text>
          <View style={s.section}>
            <SettingRow
              icon={<User size={16} color="#FFF" />}
              iconBg="#5856D6"
              title={
                avatarProfile?.status === 'creating'
                  ? 'Building your Twin'
                  : avatarProfile?.status === 'ready'
                    ? 'Twin ready'
                    : 'Set up Digital Twin'
              }
              subtitle={
                avatarProfile?.status === 'creating'
                  ? 'Generating your avatar in the background'
                  : avatarProfile?.status === 'ready'
                  ? `${virtualTryOnRenders.length} try-on render${virtualTryOnRenders.length === 1 ? '' : 's'}`
                  : 'Upload photos for virtual try-on'
              }
              onPress={() =>
                router.push(
                  (avatarProfile?.status === 'creating' ? '/ai-twin/status' : '/ai-twin') as any
                )
              }
            />
            {avatarProfile ? (
              <>
                <Separator />
                <SettingRow
                  icon={<Trash2 size={16} color="#FFF" />}
                  title="Delete Digital Twin"
                  subtitle="Remove avatar photos and renders"
                  danger
                  onPress={() => {
                    Alert.alert(
                      'Delete Digital Twin',
                      'This will remove your avatar photos and try-on renders.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteDigitalTwin() },
                      ]
                    );
                  }}
                />
              </>
            ) : null}
          </View>

          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.section}>
            <SettingRow
              icon={<User size={16} color="#FFF" />}
              iconBg="#8E8E93"
              title={isGuest ? 'Guest Account' : 'My Account'}
              subtitle={isGuest ? 'Sign in to sync your data' : 'Manage your account'}
            />
            <Separator />
            <TouchableOpacity style={s.row} onPress={() => setShowGender(!showGender)} activeOpacity={0.6}>
              <View style={[s.rowIcon, { backgroundColor: '#AF52DE' }]}>
                <UserCircle size={16} color="#FFF" />
              </View>
              <View style={s.rowContent}>
                <View style={s.rowText}>
                  <Text style={[typo.body, { color: palette.ink, fontSize: 16 }]}>Gender</Text>
                  <Text style={[typo.caption, { color: palette.inkMuted }]}>
                    {preferences.gender === 'male' ? 'Man' : preferences.gender === 'female' ? 'Woman' : 'Not set'}
                  </Text>
                </View>
                <ChevronRight
                  size={17} color={palette.inkFaint}
                  style={{ transform: [{ rotate: showGender ? '90deg' : '0deg' }] }}
                />
              </View>
            </TouchableOpacity>
            {showGender && (
              <View style={s.expanded}>
                <View style={s.chipRow}>
                  <Chip label="Woman" selected={preferences.gender === 'female'} onPress={() => setGender('female')} />
                  <Chip label="Man" selected={preferences.gender === 'male'} onPress={() => setGender('male')} />
                </View>
              </View>
            )}
          </View>

          <Text style={s.sectionLabel}>CREATOR MODE</Text>
          <View style={s.section}>
            <ToggleRow
              icon={<Sparkles size={16} color="#FFF" />}
              iconBg="#FF9500"
              title="Creator Mode"
              subtitle="Generate shareable outfit cards"
              value={creatorSettings.enabled}
              onValueChange={toggleCreatorMode}
            />
          </View>

          <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
          <View style={s.section}>
            <TouchableOpacity style={s.row} onPress={() => setShowNotifications(!showNotifications)} activeOpacity={0.6}>
              <View style={[s.rowIcon, { backgroundColor: '#FF3B30' }]}>
                <Bell size={16} color="#FFF" />
              </View>
              <View style={s.rowContent}>
                <View style={s.rowText}>
                  <Text style={[typo.body, { color: palette.ink, fontSize: 16 }]}>Smart Notifications</Text>
                  <Text style={[typo.caption, { color: palette.inkMuted }]}>Daily suggestions, weather alerts</Text>
                </View>
                <ChevronRight
                  size={17} color={palette.inkFaint}
                  style={{ transform: [{ rotate: showNotifications ? '90deg' : '0deg' }] }}
                />
              </View>
            </TouchableOpacity>
            {showNotifications && (
              <View style={s.expanded}>
                <ToggleRow
                  icon={<Calendar size={14} color="#FFF" />}
                  iconBg="#007AFF"
                  title="Daily Outfit Suggestion"
                  subtitle="Morning outfit ideas"
                  value={notificationSettings.dailySuggestionEnabled}
                  onValueChange={(v) => updateNotificationSetting('dailySuggestionEnabled', v)}
                />
                <View style={s.separatorInset} />
                <ToggleRow
                  icon={<CloudSun size={14} color="#FFF" />}
                  iconBg="#5AC8FA"
                  title="Weather Alerts"
                  subtitle="Dress for weather changes"
                  value={notificationSettings.weatherAlertsEnabled}
                  onValueChange={(v) => updateNotificationSetting('weatherAlertsEnabled', v)}
                />
                <View style={s.separatorInset} />
                <ToggleRow
                  icon={<Shirt size={14} color="#FFF" />}
                  iconBg="#FF9500"
                  title="Closet Reminders"
                  subtitle="Unused item suggestions"
                  value={notificationSettings.closetAlertsEnabled}
                  onValueChange={(v) => updateNotificationSetting('closetAlertsEnabled', v)}
                />
                <View style={s.separatorInset} />
                <ToggleRow
                  icon={<Heart size={14} color="#FFF" />}
                  iconBg="#FF2D55"
                  title="Inspiration Alerts"
                  subtitle="Recreate saved looks"
                  value={notificationSettings.inspirationAlertsEnabled}
                  onValueChange={(v) => updateNotificationSetting('inspirationAlertsEnabled', v)}
                />
              </View>
            )}
          </View>

          <Text style={s.sectionLabel}>STYLE PREFERENCES</Text>
          <View style={s.section}>
            <TouchableOpacity style={s.row} onPress={() => setShowPrefs(!showPrefs)} activeOpacity={0.6}>
              <View style={[s.rowIcon, { backgroundColor: '#AF52DE' }]}>
                <Palette size={16} color="#FFF" />
              </View>
              <View style={s.rowContent}>
                <View style={s.rowText}>
                  <Text style={[typo.body, { color: palette.ink, fontSize: 16 }]}>Preferences</Text>
                  <Text style={[typo.caption, { color: palette.inkMuted }]}>
                    {preferences.modestyLevel} · {preferences.budgetLevel} · {preferences.tone}
                  </Text>
                </View>
                <ChevronRight
                  size={17} color={palette.inkFaint}
                  style={{ transform: [{ rotate: showPrefs ? '90deg' : '0deg' }] }}
                />
              </View>
            </TouchableOpacity>
            {showPrefs && (
              <View style={s.expanded}>
                <View style={s.prefGroup}>
                  <Text style={[typo.caption, { color: palette.inkMuted, marginBottom: 8 }]}>Modesty Level</Text>
                  <View style={s.chipRow}>
                    {MODESTY_LEVELS.map((l) => (
                      <Chip key={l} label={l} selected={preferences.modestyLevel === l} onPress={() => setModestyLevel(l)} size="small" />
                    ))}
                  </View>
                </View>
                <View style={s.prefGroup}>
                  <Text style={[typo.caption, { color: palette.inkMuted, marginBottom: 8 }]}>Budget Range</Text>
                  <View style={s.chipRow}>
                    {BUDGET_LEVELS.map((l) => (
                      <Chip key={l} label={l} selected={preferences.budgetLevel === l} onPress={() => setBudgetLevel(l)} size="small" />
                    ))}
                  </View>
                </View>
                <View style={s.prefGroup}>
                  <Text style={[typo.caption, { color: palette.inkMuted, marginBottom: 8 }]}>Feedback Tone</Text>
                  <View style={s.chipRow}>
                    {TONE_PREFERENCES.map((t) => (
                      <Chip key={t} label={t} selected={preferences.tone === t} onPress={() => setTone(t)} size="small" />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          <Text style={s.sectionLabel}>CLOSET & OUTFITS</Text>
          <View style={s.section}>
            <SettingRow
              icon={<Shirt size={16} color="#FFF" />}
              iconBg="#34C759"
              title="Closet Items"
              subtitle={`${closetItems.length} ${closetItems.length === 1 ? 'piece' : 'pieces'}`}
              showArrow={false}
            />
            <Separator />
            <SettingRow
              icon={<Calendar size={16} color="#FFF" />}
              iconBg="#007AFF"
              title="Planned Outfits"
              subtitle={`${plannedOutfits.length} ${plannedOutfits.length === 1 ? 'outfit' : 'outfits'}`}
              showArrow={false}
            />
            <Separator />
            <SettingRow
              icon={<HandHeart size={16} color="#FFF" />}
              iconBg="#5AC8FA"
              title="Closet Cleanup"
              subtitle={
                cleanupCandidates.length > 0
                  ? `${cleanupCandidates.length} item${cleanupCandidates.length === 1 ? '' : 's'} to review`
                  : 'Review unused items'
              }
              onPress={() => router.push('/closet-cleanup' as any)}
            />
            {closetItems.length > 0 && (
              <>
                <Separator />
                <SettingRow
                  icon={<Trash2 size={16} color="#FFF" />}
                  title="Clear Closet"
                  subtitle="Remove all closet items"
                  onPress={handleClearCloset}
                  danger
                />
              </>
            )}
          </View>

          <Text style={s.sectionLabel}>PRIVACY & DATA</Text>
          <View style={s.section}>
            <SettingRow
              icon={<Shield size={16} color="#FFF" />}
              iconBg="#8E8E93"
              title="Privacy Policy"
            />
            <Separator />
            <SettingRow
              icon={<FileText size={16} color="#FFF" />}
              iconBg="#8E8E93"
              title="Saved Looks"
              subtitle={`${savedLooks.length} ${savedLooks.length === 1 ? 'look' : 'looks'} saved locally`}
              showArrow={false}
            />
            <Separator />
            <SettingRow
              icon={<Trash2 size={16} color="#FFF" />}
              title="Delete All Data"
              subtitle="This cannot be undone"
              onPress={handleDeleteData}
              danger
            />
          </View>

          <Text style={s.sectionLabel}>SUPPORT</Text>
          <View style={[s.section, { marginBottom: 32 }]}>
            <SettingRow icon={<HelpCircle size={16} color="#FFF" />} iconBg="#007AFF" title="Help & FAQ" />
          </View>

          <Text style={s.version}>MirrorMuse v2.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.systemGroupedBg },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  proCard: {
    marginHorizontal: space.screen,
    marginTop: 8,
    backgroundColor: palette.secondarySystemGroupedBg,
    borderRadius: radius.card,
    padding: 16,
  },
  proHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF4E6',
    alignItems: 'center', justifyContent: 'center',
  },
  proBtn: {
    backgroundColor: '#FF9500',
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: radius.button,
  },
  proBtnText: { ...typo.caption, fontWeight: '600' as const, color: '#FFF' },

  sectionLabel: {
    ...typo.footnote,
    color: palette.inkMuted,
    marginLeft: space.screen + 16,
    marginBottom: 6,
    marginTop: 24,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: space.screen,
    backgroundColor: palette.secondarySystemGroupedBg,
    borderRadius: radius.card,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  rowIcon: {
    width: 30, height: 30, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.separator,
    marginLeft: 60,
  },
  separatorInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.separator,
    marginLeft: 60,
  },

  expanded: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  prefGroup: { marginTop: 12 },

  version: { ...typo.caption, color: palette.inkFaint, textAlign: 'center', marginTop: 16, marginBottom: 20 },
});
