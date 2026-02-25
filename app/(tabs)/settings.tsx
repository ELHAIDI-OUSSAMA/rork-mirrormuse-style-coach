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
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { AppHeader } from '@/components/AppHeader';
import { MODESTY_LEVELS, BUDGET_LEVELS, TONE_PREFERENCES } from '@/types';
import { space, radius, shadow, palette, type as typo } from '@/constants/theme';

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
    isGuest,
    themeColors,
    notificationSettings,
    updateNotificationSetting,
    creatorSettings,
    toggleCreatorMode,
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
    icon, title, subtitle, onPress, danger = false, showArrow = true, rightElement,
  }: {
    icon: React.ReactNode; title: string; subtitle?: string;
    onPress?: () => void; danger?: boolean; showArrow?: boolean; rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={[s.rowIcon, danger && { backgroundColor: palette.errorLight }]}>
        {icon}
      </View>
      <View style={s.rowText}>
        <Text style={[typo.bodyMedium, { color: danger ? palette.error : palette.ink }]}>{title}</Text>
        {subtitle && <Text style={[typo.small, { color: palette.inkMuted, marginTop: 1 }]}>{subtitle}</Text>}
      </View>
      {rightElement}
      {showArrow && onPress && !rightElement && (
        <ChevronRight size={18} color={palette.inkFaint} />
      )}
    </TouchableOpacity>
  );

  const ToggleRow = ({
    icon, title, subtitle, value, onValueChange,
  }: {
    icon: React.ReactNode; title: string; subtitle?: string;
    value: boolean; onValueChange: (v: boolean) => void;
  }) => (
    <View style={s.row}>
      <View style={s.rowIcon}>{icon}</View>
      <View style={s.rowText}>
        <Text style={[typo.bodyMedium, { color: palette.ink }]}>{title}</Text>
        {subtitle && <Text style={[typo.small, { color: palette.inkMuted, marginTop: 1 }]}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.border, true: themeColors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe} edges={['top']}>
        <AppHeader title="Settings" />

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pro card */}
          <Card style={s.proCard} variant="flat">
            <View style={s.proHeader}>
              <View style={s.proBadge}>
                <Crown size={20} color={palette.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typo.sectionHeader, { color: palette.ink }]}>MirrorMuse Pro</Text>
                <Text style={[typo.caption, { color: palette.inkMuted, marginTop: 2 }]}>
                  Unlimited scans, weather mode & more
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.proBtn}>
              <Text style={[typo.button, { color: '#FFF', fontSize: 14 }]}>Coming Soon</Text>
            </TouchableOpacity>
          </Card>

          {/* Account */}
          <Text style={s.sectionLabel}>Account</Text>
          <Card padding="none" style={s.section}>
            <SettingRow
              icon={<User size={18} color={palette.inkMuted} strokeWidth={1.8} />}
              title={isGuest ? 'Guest Account' : 'My Account'}
              subtitle={isGuest ? 'Sign in to sync your data' : 'Manage your account'}
            />
            <View style={s.divider} />
            <TouchableOpacity style={s.row} onPress={() => setShowGender(!showGender)} activeOpacity={0.7}>
              <View style={s.rowIcon}>
                <UserCircle size={18} color={palette.inkMuted} strokeWidth={1.8} />
              </View>
              <View style={s.rowText}>
                <Text style={[typo.bodyMedium, { color: palette.ink }]}>Gender</Text>
                <Text style={[typo.small, { color: palette.inkMuted }]}>
                  {preferences.gender === 'male' ? 'Man' : preferences.gender === 'female' ? 'Woman' : 'Not set'}
                </Text>
              </View>
              <ChevronRight
                size={18} color={palette.inkFaint}
                style={{ transform: [{ rotate: showGender ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showGender && (
              <View style={s.expanded}>
                <View style={s.chipRow}>
                  <Chip label="Woman" selected={preferences.gender === 'female'} onPress={() => setGender('female')} />
                  <Chip label="Man" selected={preferences.gender === 'male'} onPress={() => setGender('male')} />
                </View>
              </View>
            )}
          </Card>

          {/* Creator Mode */}
          <Text style={s.sectionLabel}>Creator Mode</Text>
          <Card padding="none" style={s.section}>
            <ToggleRow
              icon={<Sparkles size={18} color={palette.secondary} strokeWidth={1.8} />}
              title="Creator Mode"
              subtitle="Generate shareable outfit cards"
              value={creatorSettings.enabled}
              onValueChange={toggleCreatorMode}
            />
          </Card>

          {/* Notifications */}
          <Text style={s.sectionLabel}>Notifications</Text>
          <Card padding="none" style={s.section}>
            <TouchableOpacity style={s.row} onPress={() => setShowNotifications(!showNotifications)} activeOpacity={0.7}>
              <View style={s.rowIcon}>
                <Bell size={18} color={palette.inkMuted} strokeWidth={1.8} />
              </View>
              <View style={s.rowText}>
                <Text style={[typo.bodyMedium, { color: palette.ink }]}>Smart Notifications</Text>
                <Text style={[typo.small, { color: palette.inkMuted }]}>Daily suggestions, weather alerts</Text>
              </View>
              <ChevronRight
                size={18} color={palette.inkFaint}
                style={{ transform: [{ rotate: showNotifications ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showNotifications && (
              <View style={s.expanded}>
                <ToggleRow
                  icon={<Calendar size={16} color={themeColors.primary} />}
                  title="Daily Outfit Suggestion"
                  subtitle="Morning outfit ideas"
                  value={notificationSettings.dailySuggestionEnabled}
                  onValueChange={(v) => updateNotificationSetting('dailySuggestionEnabled', v)}
                />
                <View style={s.dividerSmall} />
                <ToggleRow
                  icon={<CloudSun size={16} color={palette.info} />}
                  title="Weather Alerts"
                  subtitle="Dress for weather changes"
                  value={notificationSettings.weatherAlertsEnabled}
                  onValueChange={(v) => updateNotificationSetting('weatherAlertsEnabled', v)}
                />
                <View style={s.dividerSmall} />
                <ToggleRow
                  icon={<Shirt size={16} color={palette.secondary} />}
                  title="Closet Reminders"
                  subtitle="Unused item suggestions"
                  value={notificationSettings.closetAlertsEnabled}
                  onValueChange={(v) => updateNotificationSetting('closetAlertsEnabled', v)}
                />
                <View style={s.dividerSmall} />
                <ToggleRow
                  icon={<Heart size={16} color={palette.error} />}
                  title="Inspiration Alerts"
                  subtitle="Recreate saved looks"
                  value={notificationSettings.inspirationAlertsEnabled}
                  onValueChange={(v) => updateNotificationSetting('inspirationAlertsEnabled', v)}
                />
              </View>
            )}
          </Card>

          {/* Style Preferences */}
          <Text style={s.sectionLabel}>Style Preferences</Text>
          <Card padding="none" style={s.section}>
            <TouchableOpacity style={s.row} onPress={() => setShowPrefs(!showPrefs)} activeOpacity={0.7}>
              <View style={s.rowIcon}>
                <Palette size={18} color={palette.inkMuted} strokeWidth={1.8} />
              </View>
              <View style={s.rowText}>
                <Text style={[typo.bodyMedium, { color: palette.ink }]}>Preferences</Text>
                <Text style={[typo.small, { color: palette.inkMuted }]}>
                  {preferences.modestyLevel} · {preferences.budgetLevel} · {preferences.tone}
                </Text>
              </View>
              <ChevronRight
                size={18} color={palette.inkFaint}
                style={{ transform: [{ rotate: showPrefs ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showPrefs && (
              <View style={s.expanded}>
                <View style={s.prefGroup}>
                  <Text style={[typo.caption, { color: palette.inkMuted }]}>Modesty Level</Text>
                  <View style={s.chipRow}>
                    {MODESTY_LEVELS.map((l) => (
                      <Chip key={l} label={l} selected={preferences.modestyLevel === l} onPress={() => setModestyLevel(l)} size="small" />
                    ))}
                  </View>
                </View>
                <View style={s.prefGroup}>
                  <Text style={[typo.caption, { color: palette.inkMuted }]}>Budget Range</Text>
                  <View style={s.chipRow}>
                    {BUDGET_LEVELS.map((l) => (
                      <Chip key={l} label={l} selected={preferences.budgetLevel === l} onPress={() => setBudgetLevel(l)} size="small" />
                    ))}
                  </View>
                </View>
                <View style={s.prefGroup}>
                  <Text style={[typo.caption, { color: palette.inkMuted }]}>Feedback Tone</Text>
                  <View style={s.chipRow}>
                    {TONE_PREFERENCES.map((t) => (
                      <Chip key={t} label={t} selected={preferences.tone === t} onPress={() => setTone(t)} size="small" />
                    ))}
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Closet & Outfits */}
          <Text style={s.sectionLabel}>Closet & Outfits</Text>
          <Card padding="none" style={s.section}>
            <SettingRow
              icon={<Shirt size={18} color={palette.inkMuted} strokeWidth={1.8} />}
              title="Closet Items"
              subtitle={`${closetItems.length} ${closetItems.length === 1 ? 'piece' : 'pieces'}`}
              showArrow={false}
            />
            <View style={s.divider} />
            <SettingRow
              icon={<Calendar size={18} color={palette.inkMuted} strokeWidth={1.8} />}
              title="Planned Outfits"
              subtitle={`${plannedOutfits.length} ${plannedOutfits.length === 1 ? 'outfit' : 'outfits'}`}
              showArrow={false}
            />
            {closetItems.length > 0 && (
              <>
                <View style={s.divider} />
                <SettingRow
                  icon={<Trash2 size={18} color={palette.error} strokeWidth={1.8} />}
                  title="Clear Closet"
                  subtitle="Remove all closet items"
                  onPress={handleClearCloset}
                  danger
                />
              </>
            )}
          </Card>

          {/* Privacy */}
          <Text style={s.sectionLabel}>Privacy & Data</Text>
          <Card padding="none" style={s.section}>
            <SettingRow
              icon={<Shield size={18} color={palette.inkMuted} strokeWidth={1.8} />}
              title="Privacy Policy"
            />
            <View style={s.divider} />
            <SettingRow
              icon={<FileText size={18} color={palette.inkMuted} strokeWidth={1.8} />}
              title="Saved Looks"
              subtitle={`${savedLooks.length} ${savedLooks.length === 1 ? 'look' : 'looks'} saved locally`}
              showArrow={false}
            />
            <View style={s.divider} />
            <SettingRow
              icon={<Trash2 size={18} color={palette.error} strokeWidth={1.8} />}
              title="Delete All Data"
              subtitle="This cannot be undone"
              onPress={handleDeleteData}
              danger
            />
          </Card>

          {/* Support */}
          <Text style={s.sectionLabel}>Support</Text>
          <Card padding="none" style={s.section}>
            <SettingRow icon={<HelpCircle size={18} color={palette.inkMuted} strokeWidth={1.8} />} title="Help & FAQ" />
          </Card>

          <Text style={s.version}>MirrorMuse v2.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.warmWhite },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: space.screen, paddingBottom: 40 },

  /* Pro card */
  proCard: { marginBottom: space.xl, backgroundColor: palette.secondaryLight },
  proHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  proBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: palette.pastelPeach,
    alignItems: 'center', justifyContent: 'center',
  },
  proBtn: {
    backgroundColor: palette.secondary,
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: radius.button, alignSelf: 'flex-start',
    ...shadow.soft,
  },

  /* Section labels */
  sectionLabel: {
    ...typo.caption,
    color: palette.inkMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
    marginBottom: space.sm,
    marginTop: space.md,
  },
  section: { marginBottom: space.md },

  /* Setting rows */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: space.lg,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: palette.warmWhiteDark,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowText: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.borderLight, marginLeft: 70 },
  dividerSmall: { height: StyleSheet.hairlineWidth, backgroundColor: palette.borderLight, marginLeft: 54 },

  /* Expanded sections */
  expanded: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.borderLight,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.sm },
  prefGroup: { marginTop: space.md },

  /* Version */
  version: { ...typo.small, color: palette.inkFaint, textAlign: 'center', marginTop: space.xl },
});
