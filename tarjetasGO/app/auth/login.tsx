import React, { useState } from 'react';
import { StyleSheet, TextInput, Button, Alert, ActivityIndicator, Image, View } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router'; 

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); 
  const router = useRouter(); 

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Atención", "Escribe tu correo y contraseña");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/(tabs)'); 
    } catch (error: any) {
      console.log(error.code); 
      Alert.alert("Error", "Credenciales incorrectas o usuario no encontrado");
    } finally {
      setLoading(false); 
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Contenedor del logo justo arriba del texto "Bienvenido" */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/mejora2.png')} // Asegúrate de que la ruta sea correcta
          style={styles.logo}
          resizeMode="contain" 
        />
      </View>

      <ThemedText type="title" style={styles.title}>Bienvenido</ThemedText>
      
      <TextInput 
        placeholder="Email" 
        onChangeText={setEmail} 
        style={styles.input} 
        autoCapitalize="none" 
        keyboardType="email-address"
        placeholderTextColor="#888" // Añadido para mejor contraste si el fondo es oscuro
      />
      
      <TextInput 
        placeholder="Contraseña" 
        onChangeText={setPassword} 
        style={styles.input} 
        secureTextEntry 
        placeholderTextColor="#888"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#A1CEDC" />
      ) : (
        <Button title="Iniciar Sesión" onPress={handleLogin} color="#db560f"/>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'flex-start', 
    padding: 20, 
    gap: 10 
  },
  logoContainer: {
    alignItems: 'center', // Centra la imagen horizontalmente
       // Da un respiro antes del texto "Bienvenido"
  },
  logo: {
    width: 300,  // Ajusta el ancho de tu logo
    height: 300, // Ajusta la altura de tu logo
  },
  title: {
  // Centra el texto de bienvenida debajo del logo
    marginBottom: 10,
  },
  input: { 
    backgroundColor: '#f0f0f0', 
    padding: 15, 
    borderRadius: 10, 
    color: '#000',
    borderWidth: 4,
    borderColor: '#00f279'
  },
});