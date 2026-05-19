import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  // Asegura que si la app recarga, intente volver a las tabs como principal
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Grupo de la App Principal (con su propia barra inferior) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Grupo de Autenticación (con sus propias pestañas o sin ellas) */}
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        
        {/* Pantallas globales como el Modal */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}