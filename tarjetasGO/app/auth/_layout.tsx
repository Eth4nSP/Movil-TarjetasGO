import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AuthLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#A1CEDC' }}>
      <Tabs.Screen name="login" options={{ title: 'Entrar', tabBarIcon: ({color}) => <Ionicons name="log-in" size={20} color={color} /> }} />
      <Tabs.Screen name="register" options={{ title: 'Registro', tabBarIcon: ({color}) => <Ionicons name="person-add" size={20} color={color} /> }} />
        <Tabs.Screen
                name="recovery"
                options={{
                  title: 'Recuperar Contraseña',
                  tabBarIcon: ({ color }) => <IconSymbol name ="lock.rotation" size={20} color={color} />,
                }}
              />
    </Tabs>
  );
}