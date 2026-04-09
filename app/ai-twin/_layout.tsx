import { Stack } from 'expo-router';

export default function AITwinLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'card' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="status" />
    </Stack>
  );
}
