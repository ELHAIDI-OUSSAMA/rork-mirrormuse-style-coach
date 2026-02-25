import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle } from 'lucide-react-native';
import colors from '@/constants/colors';
import { Button } from '@/components/Button';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <LinearGradient
          colors={['#FDF8F6', '#F5EDE8']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertCircle size={48} color={colors.textLight} />
          </View>
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.text}>
            The page you're looking for doesn't exist or has been moved.
          </Text>
          <Button
            title="Go Home"
            onPress={() => router.replace('/(tabs)/home' as any)}
            variant="primary"
            size="large"
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});
