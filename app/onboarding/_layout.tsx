import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="gender" />
      <Stack.Screen name="vibes" />
      <Stack.Screen name="occasions" />
      <Stack.Screen name="preferences" />
    </Stack>
  );
}
