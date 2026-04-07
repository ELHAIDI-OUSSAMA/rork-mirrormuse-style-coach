import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/contexts/AppContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="camera" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
        }} 
      />
      <Stack.Screen 
        name="loading" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="results" 
        options={{ 
          headerShown: false,
          gestureEnabled: false,
        }} 
      />
      <Stack.Screen 
        name="look/[id]" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen
        name="progress"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add-by-search"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="add-by-scan"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="digital-twin"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ai-twin"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="closet-cleanup"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="marketplace/create-listing"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="marketplace/listing/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="donate-item"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="closet-value"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="style-personality"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sell-opportunities"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="imported-outfit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="import-social"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProvider>
          <StatusBar style="dark" />
          <RootLayoutNav />
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
