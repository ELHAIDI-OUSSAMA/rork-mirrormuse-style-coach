import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';
import { palette, type as typo, radius } from '@/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { preferences, themeColors } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, buttonFade]);

  const handleGetStarted = () => {
    if (preferences.onboardingComplete) {
      router.replace('/(tabs)/home' as any);
    } else {
      router.push('/onboarding/gender' as any);
    }
  };

  const handleLogin = () => {
    router.push('/auth' as any);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={[styles.iconWrapper, { backgroundColor: themeColors.primary + '15' }]}>
            <Sparkles size={36} color={themeColors.primary} />
          </View>
          <Text style={styles.logo}>MirrorMuse</Text>
        </View>

        <Text style={styles.tagline}>
          Your mirror selfie{'\n'}becomes outfit upgrades
        </Text>

        <Text style={styles.subtitle}>
          Get instant styling suggestions powered by AI.{'\n'}
          Confidence-boosting, never judgy.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.buttons, { opacity: buttonFade }]}>
        <Button
          title="Get Started"
          onPress={handleGetStarted}
          variant="primary"
          size="large"
          style={styles.primaryButton}
        />
        <Button
          title="I have an account"
          onPress={handleLogin}
          variant="ghost"
          size="medium"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 140,
    paddingBottom: 60,
    paddingHorizontal: 28,
    backgroundColor: palette.systemGroupedBg,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 38,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: palette.ink,
  },
  tagline: {
    ...typo.screenTitle,
    fontSize: 30,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 16,
    color: palette.ink,
  },
  subtitle: {
    ...typo.body,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    color: palette.inkMuted,
  },
  buttons: {
    width: '100%',
  },
  primaryButton: {
    marginBottom: 12,
  },
});
