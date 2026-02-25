import { Tabs } from 'expo-router';
import { Home, Sparkles, Shirt, Bookmark, Settings } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { palette, radius } from '@/constants/theme';

export default function TabLayout() {
  const { themeColors } = useApp();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: palette.inkFaint,
        tabBarStyle: {
          backgroundColor: palette.white,
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          height: 64,
          shadowColor: '#8B7E74',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
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
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="inspiration"
        options={{
          title: 'Inspire',
          tabBarIcon: ({ color }) => <Sparkles size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="closet"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color }) => <Shirt size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <Bookmark size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={22} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
