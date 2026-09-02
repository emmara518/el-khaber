import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0B1F3A' },
          headerTintColor: '#FFFFFF',
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
    </SafeAreaProvider>
  );
}
