import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { SessionProvider, useSession } from '../session';
import { Button, ErrorBanner, LoadingScreen } from '../components/ui';
import { colors } from '../theme';

function Routes() {
  const { loading, bootError, retry } = useSession();
  if (loading) return <LoadingScreen />;
  if (bootError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          padding: 24,
          gap: 16,
        }}
      >
        <ErrorBanner message={bootError} />
        <Button label="Try again" onPress={retry} />
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
export default function Layout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    SpaceGrotesk_600SemiBold,
  });
  if (!loaded && !error) return <LoadingScreen />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>
        <Routes />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
