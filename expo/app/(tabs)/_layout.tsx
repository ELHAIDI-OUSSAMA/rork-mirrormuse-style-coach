import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, Sparkles, Shirt, Bookmark, Settings, Store } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { palette } from '@/constants/theme';

export default function TabLayout() {
  const { themeColors } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web' ? 'rgba(249,249,249,0.94)' : 'rgba(249,249,249,0.94)',
          borderTopWidth: 0.33,
          borderTopColor: palette.separator,
          paddingTop: 6,
          ...Platform.select({
            ios: {
              position: 'absolute' as const,
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500' as const,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="inspiration"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Sparkles size={24} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color }) => <Shirt size={24} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <Store size={24} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <Bookmark size={24} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}
