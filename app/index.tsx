import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { neutralColors } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/Button';

export default function SplashScreen() {
  const router = useRouter();
  const { preferences, isLoading, themeColors } = useApp();
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F5F5F5', '#EEEEEE']}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  const colors = preferences.gender ? themeColors : neutralColors;
  const gradientColors = preferences.gender === 'male' 
    ? ['#FAFAFA', '#F0F0F0', '#E8E8E8'] as const
    : preferences.gender === 'female'
    ? ['#FDF8F6', '#F5EDE8', '#E8D5CF'] as const
    : ['#FFFFFF', '#F5F5F5', '#EEEEEE'] as const;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.decorCircle1, { backgroundColor: colors.primary + '15' }]} />
      <View style={[styles.decorCircle2, { backgroundColor: colors.secondary + '10' }]} />
      <View style={[styles.decorCircle3, { backgroundColor: colors.accent + '10' }]} />

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
          <View style={[styles.iconWrapper, { backgroundColor: colors.card }]}>
            <Sparkles size={40} color={colors.primary} />
          </View>
          <Text style={[styles.logo, { color: colors.text }]}>MirrorMuse</Text>
        </View>
        
        <Text style={[styles.tagline, { color: colors.text }]}>
          Your mirror selfie{'\n'}→ outfit upgrades
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
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
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 200,
    left: -80,
  },
  decorCircle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: 80,
    right: -50,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  logo: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 28,
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    width: '100%',
  },
  primaryButton: {
    marginBottom: 12,
  },
});
